#!/usr/bin/env node
/* Génère les pages HTML à partir des fichiers de données et des gabarits.
   Source unique : donnees/site.json, donnees/textes/<langue>.json, donnees/*.json, source/.
   Les pages produites (index.html, en/index.html…) contiennent tout le texte : lisibles sans JavaScript,
   et lues correctement par les applications de partage. Ne jamais les modifier à la main.
   Usage : node outils/generer.mjs            (depuis la racine du projet) */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { html, brut, fragment, typo, reglages, texteBrut } from './gabarit.mjs';
import { dimensions } from './dimensions.mjs';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => JSON.parse(readFileSync(join(racine, p), 'utf8'));
const erreurs = [];

/* 0. Fichiers cachés : ils peuvent manquer dans la copie de la skill reçue dans une conversation.
   .vercelignore empêche de mettre en ligne l'audit, les sources, les outils et les données :
   recréé s'il manque, complété s'il lui manque une ligne. (Le dossier assets/partage/ est créé
   par outils/images-partage.mjs : son .gitkeep n'est pas nécessaire.) */
const IGNORES = ['_audit', '_partage', 'source', 'outils', 'donnees', 'recu', 'README.md', 'CHANGELOG.md', '*.zip'];
{
  const f = join(racine, '.vercelignore');
  const norm = (l) => l.trim().replace(/^\//, '').replace(/\/$/, '');
  const avant = existsSync(f) ? readFileSync(f, 'utf8') : null;
  const presentes = new Set((avant || '').split(/\r?\n/).map(norm).filter(Boolean));
  const manquantes = IGNORES.filter((l) => !presentes.has(l));
  if (avant === null) {
    writeFileSync(f, IGNORES.join('\n') + '\n');
    console.log('.vercelignore absent : recréé.');
  } else if (manquantes.length) {
    writeFileSync(f, (avant.trim() ? avant.replace(/\s*$/, '\n') : '') + manquantes.join('\n') + '\n');
    console.log(`.vercelignore complété : ${manquantes.join(', ')}.`);
  }
}

const site = lire('donnees/site.json');
const v = site.version;
const langues = site.langues || ['fr'];
const defaut = langues[0];

/* 1. Textes : mêmes clés dans chaque langue, aucune valeur vide. */
const textes = {};
const aplatir = (o, p = '', s = {}) => {
  for (const [k, val] of Object.entries(o)) {
    const cle = p ? `${p}.${k}` : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) aplatir(val, cle, s); else s[cle] = val;
  }
  return s;
};
for (const l of langues) textes[l] = aplatir(lire(`donnees/textes/${l}.json`));
const toutesCles = new Set(langues.flatMap((l) => Object.keys(textes[l])));
for (const l of langues) {
  for (const k of toutesCles) {
    if (!(k in textes[l])) erreurs.push(`Texte manquant en ${l} : ${k}`);
    else if (textes[l][k] === '' || textes[l][k] == null) erreurs.push(`Texte vide en ${l} : ${k}`);
  }
}

/* 2. Autres données (catalogue, agenda, tarifs…) : donnees/*.json, champs traduits sous la forme { "fr": …, "en": … }. */
const donnees = {};
for (const f of readdirSync(join(racine, 'donnees'))) {
  if (f.endsWith('.json') && f !== 'site.json') donnees[f.replace(/\.json$/, '')] = lire(`donnees/${f}`);
}
const localiser = (o, l) => {
  if (Array.isArray(o)) return o.map((x) => localiser(x, l));
  if (o && typeof o === 'object') {
    const cles = Object.keys(o);
    if (cles.length && cles.every((k) => langues.includes(k))) return o[l] ?? o[defaut];
    return Object.fromEntries(cles.map((k) => [k, localiser(o[k], l)]));
  }
  return o;
};

/* 3. Gabarits et pages. */
const imp = (p) => import(pathToFileURL(join(racine, p)).href + '?t=' + Date.now());
const commun = await imp('source/gabarits/commun.mjs');
const partage = existsSync(join(racine, 'source/gabarits/partage.mjs')) ? await imp('source/gabarits/partage.mjs') : null;
/* Visuels provisoires (facultatif) : source/gabarits/provisoires.mjs dessine en code l'emplacement d'une image
   générée qui n'est pas encore arrivée (assets/images/grok/<nom>-*.webp absent). Dès que l'image est convertie,
   la page suivante générée l'affiche à la place, sans autre changement. */
const provisoires = existsSync(join(racine, 'source/gabarits/provisoires.mjs')) ? await imp('source/gabarits/provisoires.mjs') : null;
const enAttente = new Set();
const modules = [];
const fichiersDonnees = [];
for (const f of readdirSync(join(racine, 'source/pages')).filter((f) => f.endsWith('.mjs')).sort()) {
  const m = await imp(`source/pages/${f}`);
  /* Un module peut produire plusieurs pages (fiches d'un catalogue, articles) : export const pages = [...].
     Chaque page peut porter ses textes (titre, description, nav, partageAlt, accroche), ajoutés à pages.<cle>.* */
  const liste = typeof m.pages === 'function' ? m.pages({ donnees, localiser, langues }) : m.pages;
  if (Array.isArray(liste)) {
    for (const p of liste) {
      modules.push({ ...m, meta: { langues, ...p } });
      if (p.textes) for (const l of langues) for (const [k, val] of Object.entries(p.textes)) textes[l][`pages.${p.cle}.${k}`] = typeof val === 'object' ? (val[l] ?? val[defaut]) : val;
    }
  } else modules.push({ ...m, meta: { langues, ...m.page } });
  /* Un module peut aussi produire des fichiers de données lus par le JavaScript (catalogue de recherche…) :
     export function fichiers({ donnees, textes }) { return { 'assets/donnees/x.json': objet } }. */
  if (typeof m.fichiers === 'function') fichiersDonnees.push(m.fichiers);
}
const pages = Object.fromEntries(modules.map((m) => [m.meta.cle, m.meta]));

const cheminPage = (cle, l) => {
  const p = pages[cle];
  if (!p) { erreurs.push(`Lien vers une page inconnue : ${cle}`); return '/'; }
  const base = l === defaut ? '' : `/${l}`;
  return p.fichier === 'index' ? (base || '/') : `${base}/${p.fichier}`;
};
const fichierPage = (cle, l) => {
  const p = pages[cle];
  return (l === defaut ? '' : `${l}/`) + `${p.fichier}.html`;
};

const largeurs = (nom) => {
  const dossier = join(racine, 'assets/images', dirname(nom));
  if (!existsSync(dossier)) return [];
  const base = nom.split('/').pop();
  return readdirSync(dossier)
    .map((f) => f.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.webp$`)))
    .filter(Boolean).map((m) => +m[1]).sort((a, b) => a - b);
};

function contexte(l, meta) {
  reglages.langue = l;
  const T = textes[l];
  const brutTexte = (cle, vars) => {
    if (!(cle in T)) { erreurs.push(`Clé de texte inconnue (${l}) : ${cle}`); return `[${cle}]`; }
    let s = String(T[cle]);
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
    return s;
  };
  const c = {
    l, site, page: meta, v, langues, defaut, pages,
    donnees: localiser(donnees, l),
    /* Texte échappé, typographie appliquée. */
    t: (cle, vars) => html`${brutTexte(cle, vars)}`,
    /* Texte brut sans échappement (pour un attribut construit à la main ou un calcul). */
    s: (cle, vars) => brutTexte(cle, vars),
    /* Fragment HTML de confiance (gras, liens) écrit dans les données. */
    tb: (cle, vars) => fragment(brutTexte(cle, vars)),
    loc: (o) => localiser(o, l),
    url: (cle, ancre = '', params = '') => cheminPage(cle, l) + (params ? `?${params}` : '') + (ancre ? `#${ancre}` : ''),
    abs: (chemin) => site.adresse.replace(/\/$/, '') + chemin,
    asset: (p) => `/assets/${p}?v=${v}`,
    libelle: (cle) => brutTexte(`pages.${cle}.nav`),
    lien(cle, { ancre = '', params = '', texte, classe = '', attrs = '' } = {}) {
      const courant = cle === meta.cle && !ancre && !params;
      return html`<a href="${c.url(cle, ancre, params)}"${classe ? brut(` class="${classe}"`) : ''} data-libelle="${brutTexte(`pages.${cle}.nav`)}"${courant ? brut(' aria-current="page"') : ''}${brut(attrs ? ' ' + attrs : '')}>${texte ?? html`${brutTexte(`pages.${cle}.nav`)}`}</a>`;
    },
    /* Image en plusieurs tailles (assets/images/<nom>-<largeur>.webp), version téléphone (<nom>-mobile-<largeur>.webp),
       cadrage, mention « Illustration générée » pour les images Grok (dossier grok/). */
    media({ nom, alt = '', cadrage = '50% 50%', cadrageMobile, sizes = '100vw', priorite = false, classe = '', ratio, legende } = {}) {
      const tailles = largeurs(nom);
      const mobiles = largeurs(`${nom}-mobile`);
      /* Image générée pas encore reçue : emplacement gardé, visuel dessiné en code (jamais de cadre vide). */
      if (!tailles.length && provisoires && /(^|\/)grok\//.test(nom) && !['webp', 'jpg', 'png'].some((e) => existsSync(join(racine, `assets/images/${nom}.${e}`)))) {
        enAttente.add(nom);
        const style = (ratio ? `aspect-ratio:${ratio}` : '');
        return html`<figure class="media media--provisoire ${classe}" data-visuel data-provisoire="${nom.split('/').pop()}"${style ? brut(` style="${style}"`) : ''}${alt ? brut(` role="img" aria-label="${String(alt).replace(/"/g, '&quot;')}"`) : brut(' aria-hidden="true"')}>${provisoires.visuel(nom.split('/').pop(), c)}${legende ? html`<figcaption class="media-legende">${legende}</figcaption>` : ''}</figure>`;
      }
      let src = `/assets/images/${nom}.webp`, dims = null;
      if (tailles.length) {
        const milieu = tailles.find((w) => w >= 1280) || tailles[tailles.length - 1];
        src = `/assets/images/${nom}-${milieu}.webp`;
        dims = dimensions(join(racine, src));
      } else {
        const trouve = ['webp', 'jpg', 'png', 'svg'].map((e) => `assets/images/${nom}.${e}`).find((p) => existsSync(join(racine, p)));
        if (trouve) { src = '/' + trouve; dims = dimensions(join(racine, trouve)); } else erreurs.push(`Image introuvable : ${nom}`);
      }
      const srcset = (n, ws) => ws.map((w) => `/assets/images/${n}-${w}.webp ${w}w`).join(', ');
      const grok = nom.startsWith('grok/') || nom.includes('/grok/');
      const style = `--cadrage:${cadrage}` + (ratio ? `;aspect-ratio:${ratio}` : '') + (cadrageMobile ? `;--cadrage-mobile:${cadrageMobile}` : '');
      return html`<figure class="media ${classe}"${grok ? brut(' data-grok') : ''} style="${style}">
  <picture>${mobiles.length ? html`<source media="(max-width: 760px) and (orientation: portrait)" srcset="${srcset(`${nom}-mobile`, mobiles)}" sizes="${sizes}">` : ''}
    <img src="${src}"${tailles.length ? html` srcset="${srcset(nom, tailles)}" sizes="${sizes}"` : ''} alt="${alt}"${dims ? brut(` width="${dims.largeur}" height="${dims.hauteur}"`) : ''} ${brut(priorite ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"')} decoding="async">
  </picture>${grok ? html`<figcaption class="mention-ia">${brutTexte('commun.mentionIa')}</figcaption>` : ''}${legende ? html`<figcaption class="media-legende">${legende}</figcaption>` : ''}
</figure>`;
    },
  };
  c.alternatives = (cle) => (pages[cle].langues || langues).map((x) => ({ l: x, url: cheminPage(cle, x) }));
  return c;
}

/* 4. Écriture des pages. */
const critiqueCss = readFileSync(join(racine, 'source/critique/critique.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
const critiqueJs = readFileSync(join(racine, 'source/critique/critique.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*/g, '\n').trim();
/* --ouverture-fond (panneau de l'intro) et --menu-fond sont facultatifs : couleur du voile et du fond par défaut. */
const couleurs = `:root{--fond:${site.couleurs.fond};--texte:${site.couleurs.texte};--voile-fond:${site.couleurs.voile}`
  + (site.couleurs.ouverture ? `;--ouverture-fond:${site.couleurs.ouverture}` : '')
  + (site.couleurs.menu ? `;--menu-fond:${site.couleurs.menu}` : '') + '}';

/* Tout est produit en mémoire d'abord : s'il manque un texte ou une image, aucune page n'est écrite. */
const aEcrire = [];
for (const m of modules) {
  for (const l of m.meta.langues) {
    const c = contexte(l, m.meta);
    c.critique = { css: couleurs + critiqueCss, js: critiqueJs };
    const contenu = m.default(c);
    const page = commun.page(c, contenu);
    aEcrire.push([fichierPage(m.meta.cle, l), texteBrut(page).replace(/\n\s*\n/g, '\n')]);
    if (partage && m.meta.partage !== false) aEcrire.push([`_partage/${m.meta.cle}-${l}.html`, texteBrut(partage.page(c))]);
  }
}
for (const f of fichiersDonnees) {
  for (const [chemin, objet] of Object.entries(f({ donnees, textes, site }))) aEcrire.push([chemin, JSON.stringify(objet)]);
}
if (erreurs.length) {
  console.error('\nÉCHEC de la génération, aucune page écrite :\n- ' + [...new Set(erreurs)].join('\n- '));
  process.exit(1);
}
const ecrites = [];
for (const [f, contenu] of aEcrire) {
  mkdirSync(dirname(join(racine, f)), { recursive: true });
  writeFileSync(join(racine, f), contenu);
  if (!f.startsWith('_partage/') && f.endsWith('.html')) ecrites.push(f);
}

/* 5. Numéro de version identique dans tous les import JavaScript du site (?v=N). */
const parcourir = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? (f === 'vendor' ? [] : parcourir(p)) : p.endsWith('.js') ? [p] : [];
});
let modifies = 0;
for (const f of parcourir(join(racine, 'assets/js'))) {
  const avant = readFileSync(f, 'utf8');
  const apres = avant.replace(/((?:import|export)[^'"`;]*?from\s*|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+?\.js)(?:\?v=[^'"]*)?\2/g,
    (_, debut, q, chemin) => `${debut}${q}${chemin}?v=${v}${q}`);
  if (apres !== avant) { writeFileSync(f, apres); modifies++; }
}

if (erreurs.length) {
  console.error('\nÉCHEC de la génération :\n- ' + [...new Set(erreurs)].join('\n- '));
  process.exit(1);
}
console.log(`OK : ${ecrites.length} pages écrites (version ${v}), ${modifies} fichiers JavaScript mis à la version ${v}.`);
if (ecrites.length <= 30 || process.argv.includes('--detail')) console.log(ecrites.map((f) => '  ' + f).join('\n'));
if (enAttente.size) console.log(`Images générées en attente (visuel dessiné en code à leur place) : ${enAttente.size}\n  ${[...enAttente].map((n) => n.split('/').pop()).sort().join(', ')}`);
