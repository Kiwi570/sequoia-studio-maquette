/* Contrôles sur les fichiers, sans navigateur : vercel.json, .vercelignore, robots.txt, noindex, images de partage,
   numéro de version ?v=N, liens vers le site actuel, liens externes, textes des langues, pages à jour. */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

function dims(fichier) {
  const b = readFileSync(fichier);
  if (b.readUInt32BE(0) === 0x89504e47) return { l: b.readUInt32BE(16), h: b.readUInt32BE(20), type: 'png' };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), l: b.readUInt16BE(i + 7), type: 'jpg' };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.toString('ascii', 8, 12) === 'WEBP') return { type: 'webp' };
  return null;
}

export function listerFichiers(racine, filtre, exclus = []) {
  const out = [];
  const marcher = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f), rel = relative(racine, p);
      if (exclus.some((e) => rel === e || rel.startsWith(e + '/'))) continue;
      if (statSync(p).isDirectory()) marcher(p); else if (filtre(p)) out.push(p);
    }
  };
  marcher(racine);
  return out;
}

export const EXCLUS = ['_audit', '_partage', 'source', 'outils', 'node_modules', '.vercel', '.git', 'recu', 'donnees'];

export function controlesStatiques(racine, { siteActuel, rapport, versionLivree }) {
  const R = rapport;
  /* vercel.json */
  let vercel = null;
  try { vercel = JSON.parse(readFileSync(join(racine, 'vercel.json'), 'utf8')); } catch { R.echec('vercel.json', 'absent ou illisible'); }
  if (vercel) {
    if (!vercel.cleanUrls) R.echec('vercel.json', 'cleanUrls absent');
    const tous = (vercel.headers || []).flatMap((h) => h.headers || []);
    if (tous.some((h) => /cache-control/i.test(h.key))) R.echec('vercel.json', 'règle Cache-Control présente (à retirer)');
    if (!tous.some((h) => /x-robots-tag/i.test(h.key) && /noindex/i.test(h.value))) R.echec('vercel.json', 'en-tête X-Robots-Tag « noindex, nofollow » absent');
    for (const k of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options']) if (!tous.some((h) => h.key.toLowerCase() === k.toLowerCase())) R.regarder('vercel.json', `en-tête de sécurité ${k} absent`);
    R.ok('vercel.json');
  }
  /* .vercelignore : sans lui, l'audit, les sources, les outils et les données partent en ligne.
     Fichier caché : il peut manquer dans la copie de la skill ; node outils/generer.mjs le recrée. */
  const ignore = join(racine, '.vercelignore');
  if (!existsSync(ignore)) R.echec('.vercelignore', 'absent : _audit/, source/, outils/ et donnees/ seraient mis en ligne (node outils/generer.mjs le recrée)');
  else {
    const lignes = new Set(readFileSync(ignore, 'utf8').split(/\r?\n/).map((l) => l.trim().replace(/^\//, '').replace(/\/$/, '')).filter(Boolean));
    const manque = ['_audit', 'source', 'outils', 'donnees'].filter((l) => !lignes.has(l));
    if (manque.length) R.echec('.vercelignore', `ne contient pas ${manque.join(', ')} : ces dossiers seraient mis en ligne (node outils/generer.mjs le complète)`);
    else R.ok('.vercelignore');
  }
  /* robots.txt */
  if (existsSync(join(racine, 'robots.txt'))) {
    const r = readFileSync(join(racine, 'robots.txt'), 'utf8');
    if (/^\s*Disallow:\s*\/\s*$/mi.test(r)) R.echec('robots.txt', '« Disallow: / » empêche Google de lire le noindex et bloque les aperçus de partage');
  }
  R.ok('robots.txt');

  /* Pages HTML. */
  const pages = listerFichiers(racine, (p) => p.endsWith('.html'), EXCLUS);
  const titres = new Map(), descriptions = new Map();
  const versions = new Map();
  const cssJsSansVersion = [];
  for (const f of pages) {
    const rel = relative(racine, f);
    const h = readFileSync(f, 'utf8');
    const meta = (prop) => { const m = h.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) || h.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')); return m ? m[1] : null; };
    const robots = meta('robots');
    if (!robots || !/noindex/i.test(robots)) R.echec('noindex', `meta robots « noindex, nofollow » absente`, { page: rel });
    const titre = (h.match(/<title>([^<]*)<\/title>/i) || [])[1];
    if (!titre) R.echec('titre de page', 'absent', { page: rel }); else titres.set(titre, [...(titres.get(titre) || []), rel]);
    const desc = meta('description');
    if (!desc) R.echec('description de page', 'absente', { page: rel }); else descriptions.set(desc, [...(descriptions.get(desc) || []), rel]);
    const og = meta('og:image');
    if (!/^404\.html$/.test(rel)) {
      if (!og) R.echec('image de partage', 'og:image absente', { page: rel });
      else {
        if (!/^https:\/\//.test(og)) R.echec('image de partage', `adresse non absolue : ${og}`, { page: rel });
        if (!/\.(jpe?g|png)(\?|$)/i.test(og)) R.echec('image de partage', `format ${extname(og.split('?')[0]) || 'inconnu'} (JPG ou PNG obligatoire)`, { page: rel });
        const local = join(racine, decodeURIComponent(new URL(og).pathname));
        if (!existsSync(local)) R.echec('image de partage', `fichier introuvable : ${new URL(og).pathname}`, { page: rel });
        else { const d = dims(local); if (!d || d.l !== 1200 || d.h !== 630) R.echec('image de partage', `${d ? d.l + '×' + d.h : 'taille illisible'} au lieu de 1200×630`, { page: rel }); }
        for (const p of ['og:image:width', 'og:image:height', 'og:image:alt', 'og:title', 'og:description']) if (!meta(p)) R.echec('image de partage', `${p} absent`, { page: rel });
        if (meta('twitter:card') !== 'summary_large_image') R.echec('image de partage', 'twitter:card « summary_large_image » absent', { page: rel });
      }
    }
    /* Numéro de version des feuilles de style et scripts du site. */
    for (const m of h.matchAll(/<(?:link|script)\b[^>]*(?:href|src)=["']([^"']+\.(?:css|js|mjs)(?:\?[^"']*)?)["'][^>]*>/gi)) {
      const url = m[1];
      if (/^(https?:)?\/\//.test(url) || /\/vendor\//.test(url)) continue;
      const v = (url.match(/[?&]v=([^&]+)/) || [])[1];
      if (!v) cssJsSansVersion.push(`${rel} : ${url}`); else versions.set(v, [...(versions.get(v) || []), rel]);
    }
    /* Liens vers le site actuel et liens externes. */
    for (const m of h.matchAll(/<a\b([^>]*)>/gi)) {
      const attrs = m[1];
      const href = (attrs.match(/href=["']([^"']*)["']/i) || [])[1];
      if (href == null) continue;
      /* Compare le nom de domaine (un compte Instagram nommé comme le site, instagram.com/site.fr, n'est pas le site actuel). */
      const hote = (() => { try { return new URL(href, 'https://maquette.local/').hostname.replace(/^www\./, ''); } catch { return ''; } })();
      const actuel = String(siteActuel || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      if (actuel && (hote === actuel || hote.endsWith('.' + actuel))) R.echec('lien vers le site actuel', href, { page: rel });
      if (/^https?:\/\//.test(href)) {
        if (!/target=["']_blank["']/i.test(attrs)) R.echec('lien externe', `sans nouvel onglet : ${href}`, { page: rel });
        else if (!/rel=["'][^"']*noopener/i.test(attrs)) R.regarder('lien externe', `sans rel="noopener" : ${href}`, { page: rel });
      }
      if (href === '' || href === '#' || /^javascript:/i.test(href)) R.echec('lien mort', `href="${href}"`, { page: rel });
    }
  }
  for (const [t, ps] of titres) if (ps.length > 1) R.regarder('titre de page', `identique sur ${ps.join(', ')} : ${t}`);
  for (const [t, ps] of descriptions) if (ps.length > 1) R.regarder('description de page', `identique sur ${ps.join(', ')}`);
  cssJsSansVersion.forEach((x) => R.echec('numéro de version', `fichier appelé sans ?v=N : ${x}`));

  /* Imports JavaScript : même ?v=N partout, jamais un même module avec deux numéros. */
  const jsDir = join(racine, 'assets/js');
  const appels = new Map();
  if (existsSync(jsDir)) {
    for (const f of listerFichiers(jsDir, (p) => /\.m?js$/.test(p), ['vendor'])) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]|import\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const spec = m[1] || m[2] || m[3];
        const v = (spec.match(/[?&]v=([^&]+)/) || [])[1];
        const cible = join(f, '..', spec.split('?')[0]);
        if (!appels.has(cible)) appels.set(cible, new Set());
        appels.get(cible).add(v || '(aucun)');
        if (!v) R.echec('numéro de version', `import sans ?v=N : ${relative(racine, f)} → ${spec}`);
        else versions.set(v, [...(versions.get(v) || []), relative(racine, f)]);
      }
    }
  }
  for (const [cible, vs] of appels) if (vs.size > 1) R.echec('numéro de version', `${relative(racine, cible)} appelé avec ${[...vs].join(' et ')} : chargé deux fois`);
  if (versions.size > 1) R.echec('numéro de version', `plusieurs numéros : ${[...versions.keys()].map((v) => '?v=' + v).join(', ')}`);
  const v = [...versions.keys()][0];
  if (v && versionLivree && v === versionLivree) R.regarder('numéro de version', `?v=${v} est celui de la dernière livraison : à changer avant de livrer`);
  R.ok('numéro de version');

  /* Textes des langues : mêmes clés, aucune valeur vide. */
  const dossierTextes = join(racine, 'donnees/textes');
  const textesEtrangers = {};
  if (existsSync(dossierTextes)) {
    const aplatir = (o, p = '', s = {}) => { for (const [k, x] of Object.entries(o)) { const c = p ? `${p}.${k}` : k; if (x && typeof x === 'object' && !Array.isArray(x)) aplatir(x, c, s); else s[c] = x; } return s; };
    const fichiers = readdirSync(dossierTextes).filter((f) => f.endsWith('.json'));
    const t = Object.fromEntries(fichiers.map((f) => [f.replace('.json', ''), aplatir(JSON.parse(readFileSync(join(dossierTextes, f), 'utf8')))]));
    const langues = Object.keys(t);
    const cles = new Set(langues.flatMap((l) => Object.keys(t[l])));
    for (const l of langues) for (const k of cles) {
      if (!(k in t[l])) R.echec('langues', `texte manquant en ${l} : ${k}`);
      else if (t[l][k] === '') R.echec('langues', `texte vide en ${l} : ${k}`);
    }
    const norm = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/[\s  ]+/g, ' ').trim();
    for (const l of langues) {
      const propres = new Set(Object.values(t[l]).map(norm));
      textesEtrangers[l] = [...new Set(langues.filter((x) => x !== l).flatMap((x) => Object.values(t[x]).map(norm)))]
        .filter((s) => s.length >= 6 && /\s/.test(s) && !propres.has(s));
    }
    R.ok('langues');
  }

  /* Pages à jour : régénérées après la dernière modification des données et des gabarits. */
  if (existsSync(join(racine, 'outils/generer.mjs'))) {
    const sources = listerFichiers(racine, () => true, []).filter((p) => /^(donnees|source)\//.test(relative(racine, p)));
    const plusRecente = Math.max(0, ...sources.map((p) => statSync(p).mtimeMs));
    const vieilles = pages.filter((p) => statSync(p).mtimeMs + 500 < plusRecente).map((p) => relative(racine, p));
    if (vieilles.length) R.echec('pages générées', `pas régénérées depuis la dernière modification des données (node outils/generer.mjs) : ${vieilles.join(', ')}`);
  }
  if (!existsSync(join(racine, 'CHANGELOG.md'))) R.regarder('CHANGELOG.md', 'absent');
  if (!existsSync(join(racine, 'README.md'))) R.regarder('README.md', 'absent');

  /* Vidéos : 3 Mo au plus chacune. */
  for (const f of listerFichiers(racine, (p) => /\.(mp4|webm|mov)$/i.test(p), EXCLUS)) {
    const s = statSync(f).size;
    if (s > 3 * 1024 * 1024) R.echec('vitesse', `vidéo de ${(s / 1048576).toFixed(1)} Mo (3 Mo au plus) : ${relative(racine, f)}`);
  }
  return { pages: pages.map((p) => relative(racine, p)), version: v, textesEtrangers };
}
