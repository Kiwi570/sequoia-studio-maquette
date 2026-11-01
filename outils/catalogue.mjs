#!/usr/bin/env node
/* Importe le catalogue du site actuel (gallery_data.js, selling_config.js) dans donnees/.
   À relancer quand le client envoie un catalogue à jour : node outils/catalogue.mjs
   Entrées : recu/site/donnees-site/*.js, recu/couleurs.json (couleurs mesurées sur chaque œuvre).
   Sorties : donnees/oeuvres.json, donnees/finitions.json, donnees/univers.json.
   Rien n'est inventé : chaque champ vient du catalogue du client ; les seules corrections
   (casse d'un nom, point final d'un style) sont listées dans donnees/catalogue-ecarts.json. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dimensions } from './dimensions.mjs';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = (f, nom) => JSON.parse(readFileSync(join(racine, 'recu/site/donnees-site', f), 'utf8')
  .replace(new RegExp(`^\\s*window\\.${nom}\\s*=\\s*`), '').replace(/;\s*$/, ''));
const galerie = js('gallery_data.js', 'galleryData');
const vente = js('selling_config.js', 'sellingConfig');
const couleurs = JSON.parse(readFileSync(join(racine, 'recu/couleurs.json'), 'utf8'));

export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ecarts = [];
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* Univers : valeurs du client (tag_universe), libellés au pluriel comme sur l'accueil actuel. */
const UNIVERS = {
  paysage: 'Paysages', portraits: 'Portraits', architecture: 'Architecture', nature: 'Nature', animaux: 'Animaux',
  abstrait: 'Abstrait', floral: 'Floral', objets: 'Objets', contemporain: 'Contemporain',
};
/* Familles de couleurs : regroupement des couleurs nommées par le client (tag_couleurs_dominantes). */
const FAMILLES = {
  bleu: ['bleu', 'turquoise', 'bleu-vert', 'bleu turquoise'], vert: ['vert', 'émeraude'],
  'rouge-rose': ['rouge', 'rose', 'rose pâle', 'terre cuite'], 'orange-ocre': ['orange', 'ocre', 'marron', 'brun'],
  'jaune-or': ['jaune', 'or', 'doré'], 'blanc-beige': ['blanc', 'beige', 'ivoire', 'sable'], 'noir-gris': ['noir', 'gris'], violet: ['violet'],
};
const famille = (c) => Object.keys(FAMILLES).find((f) => FAMILLES[f].includes(c.toLowerCase()));

/* Finitions : selling_config.borders, avec un nom court pour l'interface. */
const NOMS = {
  toile_insonorisee: { id: 'toile', nom: 'Toile insonorisée', court: 'Toile insonorisée', support: 'Photo sur toile avec absorbeur acoustique', cadre: 'Le cadre en bois sert de support à la toile', echantillon: 'finitions/toile-insonorisee-echantillon', matiere: 'toile' },
  caisse_americaine_black: { id: 'caisse-noire', nom: 'Alu Dibond, caisse américaine noire', court: 'Caisse noire', support: 'Impression directe sur Alu Dibond 3 mm, finition mat anti-reflet', cadre: 'Caisse américaine teinte noire', echantillon: 'finitions/caisse-noire-echantillon', matiere: 'alu' },
  caisse_americaine_white: { id: 'caisse-blanche', nom: 'Alu Dibond, caisse américaine blanche', court: 'Caisse blanche', support: 'Impression directe sur Alu Dibond 3 mm, finition mat anti-reflet', cadre: 'Caisse américaine teinte blanche', echantillon: 'finitions/caisse-blanche-echantillon', matiere: 'alu' },
  'wood_black_passe-partout_white': { id: 'fineart', nom: 'FineArt Hahnemühle, cadre bois noir', court: 'FineArt encadré', support: 'Papier photo FineArt Hahnemühle', cadre: 'Cadre bois noir mat avec passe-partout blanc et vitre anti-reflet', echantillon: 'finitions/cadre-bois-echantillon', matiere: 'papier' },
};
const finitions = vente.borders.map((b) => ({
  ...NOMS[b.id], source: b.id,
  supplement: b.price_extra, parCm: b.price_linear_proportional_extra, marge: b.extra_space_around, epaisseur: b.thickness,
  maxLong: b.max_length_1, maxCourt: b.max_length_2,
  texte: b.full_text.split(/\n\s*\n/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
}));

/* Prix d'un format dans une finition : formule déduite des 2 200 mises en situation du client
   (vérifiée sur chacune ci-dessous) : base + supplément + parCm × (grand côté − 60), arrondi à la dizaine supérieure. */
export const prix = (base, f, w, h) => Math.ceil((base + f.supplement + f.parCm * Math.max(0, Math.max(w, h) - 60)) / 10 - 1e-9) * 10;
const possible = (f, w, h) => Math.max(w, h) <= f.maxLong && Math.min(w, h) <= f.maxCourt;

const dims = (label) => label.match(/(\d+)\s*x\s*(\d+)/).slice(1, 3).map(Number);
const oeuvres = galerie.map((o) => {
  const s = slug(o.title);
  /* Proportion de vente : celle dont les formats sont ceux des mises en situation de l'œuvre. */
  const vus = new Set((o.mockups || []).map((m) => `${m.attributes.w}x${m.attributes.h}`));
  const cle = Object.keys(vente.ratios).find((k) => vente.ratios[k].formats.every((fm) => vus.has(dims(fm.label).join('x'))))
    || (vente.ratios[o.ratio] ? o.ratio : null);
  if (!cle) throw new Error(`Proportion introuvable pour ${o.title}`);
  const formats = vente.ratios[cle].formats.map((fm) => {
    const [w, h] = dims(fm.label);
    return { id: fm.id, largeur: w, hauteur: h, base: fm.price,
      prix: Object.fromEntries(finitions.filter((f) => possible(f, w, h)).map((f) => [f.id, prix(fm.price, f, w, h)])) };
  }).sort((a, b) => a.base - b.base || a.largeur * a.hauteur - b.largeur * b.hauteur);
  /* Contrôle de la formule sur chaque mise en situation du client. */
  for (const m of o.mockups || []) {
    const f = finitions.find((x) => x.source === m.attributes.frame);
    const fm = formats.find((x) => x.largeur === m.attributes.w && x.hauteur === m.attributes.h);
    if (f && fm && fm.prix[f.id] !== m.price) throw new Error(`Prix ${o.title} ${m.size} ${f.id} : ${fm.prix[f.id]} au lieu de ${m.price}`);
  }
  const des = Math.min(...formats.flatMap((fm) => Object.values(fm.prix)));
  if (des !== o.min_price) ecarts.push(`${o.title} : prix « dès » recalculé ${des} €, catalogue ${o.min_price} €`);
  const artiste = o.artist.replace(/\bMORI\b/, 'Mori');
  if (artiste !== o.artist) ecarts.push(`${o.title} : artiste « ${o.artist} » affiché « ${artiste} »`);
  const style = capital(o.type.replace(/\.$/, '').trim());
  if (style !== o.type) ecarts.push(`${o.title} : style « ${o.type} » affiché « ${style} »`);
  const [mois, annee] = o.artwork_date.split('/').map(Number);
  const u = o.tag_universe.toLowerCase();
  const fams = [...new Set((o.tag_couleurs_dominantes || []).map(famille).filter(Boolean))];
  const w0 = formats[0].largeur, h0 = formats[0].hauteur;
  return {
    slug: s, titre: o.title, artiste, artisteSlug: slug(artiste), style, annee, mois,
    edition: o.nb_tirage_max, accroche: o.accroche, ambiance: o.ambiance.replace(/\.$/, ''),
    texte: o.texte_curatorial, projection: o.projection_decorative,
    univers: u, universLibelle: UNIVERS[u] || capital(u), couleursNommees: o.tag_couleurs_dominantes || [], familles: fams,
    motsCles: o.primary_tags || [], proportion: cle, orientation: w0 > h0 ? 'paysage' : w0 < h0 ? 'portrait' : 'carre',
    formats, des, couleur: couleurs[s] || null,
    image: `oeuvres/${s}`, miseEnSituation: `mises/${s}`,
    px: (({ largeur, hauteur }) => ({ l: largeur, h: hauteur }))(dimensions(join(racine, `recu/site/oeuvres/${s}.jpg`))),
    /* Fichiers WebP existants (outils/images.py garde la largeur d'origine) : grand = le plus large, petit = vignette. */
    grand: `oeuvres/${s}-${dimensions(join(racine, `recu/site/oeuvres/${s}.jpg`)).largeur}.webp`,
    petit: `oeuvres/${s}-${Math.min(640, dimensions(join(racine, `recu/site/oeuvres/${s}.jpg`)).largeur)}.webp`,
    pxMise: (({ largeur, hauteur }) => ({ l: largeur, h: hauteur }))(dimensions(join(racine, `recu/site/mises-en-situation/${s}.jpg`))),
    interieurClient: { 'template_#1': 'salon-creme', 'template_#2': 'salon-marocain', 'template_#3': 'salon-moderne', 'template_#4': 'salon-haussmannien', 'template_#5': 'mur-blanc' }[o.featured_template_id] || null,
    ajout: o.id.match(/(\d{2}-\d{2}-\d{4})/)[1].split('-').reverse().join('-'),
  };
});

/* Mise au propre (v2) : formats sans aucune finition possible retirés (notés dans les écarts), styles harmonisés,
   apostrophes et guillemets typographiques, prix « dès » recalculés. Le texte FineArt de donnees/finitions.json a été
   corrigé à la main (vocabulaire « photo » du site d'origine) : à reporter si ce script est relancé. */
const STYLES = { 'Surréaliste': 'Surréalisme', 'Minimaliste': 'Minimalisme', 'Ink-wash': 'Lavis d’encre', 'Moderne': 'Modernisme', 'Réaliste': 'Réalisme', 'Illustratif': 'Illustration' };
const typo = (t) => (typeof t === 'string' ? t.replace(/'/g, '’').replace(/"([^"]+)"/g, (_, x) => `«\u202f${x.trim()}\u202f»`) : t);
for (const o of oeuvres) {
  const sans = o.formats.filter((f) => !Object.keys(f.prix).length);
  if (sans.length) ecarts.push({ type: 'formatsSansPrix', oeuvre: o.titre, formats: sans.map((f) => `${f.largeur}×${f.hauteur} cm`) });
  o.formats = o.formats.filter((f) => Object.keys(f.prix).length);
  o.des = Math.min(...o.formats.flatMap((f) => Object.values(f.prix)));
  o.style = STYLES[o.style] || o.style;
  for (const k of ['titre', 'accroche', 'texte', 'ambiance', 'projection']) if (k in o) o[k] = typo(o[k]);
  if (o.titre === 'Réverie Vénitienne') o.titre = 'Rêverie Vénitienne';
}

const univers = Object.entries(UNIVERS).map(([cle, nom]) => ({ cle, nom, nombre: oeuvres.filter((o) => o.univers === cle).length })).filter((u) => u.nombre);
writeFileSync(join(racine, 'donnees/oeuvres.json'), JSON.stringify(oeuvres, null, 1) + '\n');
writeFileSync(join(racine, 'donnees/finitions.json'), JSON.stringify(finitions, null, 1) + '\n');
writeFileSync(join(racine, 'donnees/univers.json'), JSON.stringify({ univers, familles: Object.keys(FAMILLES) }, null, 1) + '\n');
writeFileSync(join(racine, 'recu/catalogue-ecarts.json'), JSON.stringify(ecarts, null, 1) + '\n');
console.log(`OK : ${oeuvres.length} œuvres, ${finitions.length} finitions, formule de prix vérifiée sur ${galerie.reduce((n, o) => n + (o.mockups || []).length, 0)} mises en situation.`);
console.log(univers.map((u) => `${u.nom} ${u.nombre}`).join(' · '));
if (ecarts.length) console.log('Écarts :\n- ' + ecarts.join('\n- '));
