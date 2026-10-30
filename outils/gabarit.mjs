/* Petit moteur de gabarits sans dépendance, utilisé par outils/generer.mjs.
   html`...${valeur}...` échappe chaque valeur, sauf celles marquées brut(...) ou produites par html`...`.
   En français, la typographie est appliquée aux textes : espaces insécables avant : ; ? ! »,
   après «, entre un nombre et son unité, dans les milliers. Les adresses (href, src) ne sont pas touchées. */

const BRUT = Symbol('brut');
export const reglages = { langue: 'fr' };

const NB = ' ', FINE = ' ';
const UNITES = '€|%|°C|°|km|kg|cm|mm|min|h|s|m|g|ml|cl|l|ans|an|jours|jour|mois|personnes|places|pers\\.';

export function typo(s, { inserer = true } = {}) {
  if (!s || !reglages.langue.startsWith('fr')) return s;
  let t = String(s)
    .replace(/ ([;!?])/g, FINE + '$1')
    .replace(/ :/g, NB + ':')
    .replace(/« /g, '«' + NB)
    .replace(/ »/g, NB + '»')
    .replace(new RegExp(`(\\d) (${UNITES})(?![\\p{L}\\d])`, 'gu'), '$1' + NB + '$2')
    .replace(/ – /g, NB + '– ');
  for (let i = 0; i < 3; i++) t = t.replace(/(?<!\d)(\d{1,3}) (?=\d{3}(?!\d))/g, '$1' + FINE);
  if (inserer) {
    t = t
      .replace(/([\p{L}\d»)’'])([;!?])(?=[\s  ]|$|[»)"])/gu, '$1' + FINE + '$2')
      .replace(/([\p{L}»)])(:)(?=[\s]|$)/gu, '$1' + NB + '$2')
      .replace(/«(?=[^\s  ])/g, '«' + NB)
      .replace(/([^\s  ])»/g, '$1' + NB + '»');
  }
  return t;
}

function echapper(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Typographie appliquée seulement au texte entre les balises d'un fragment HTML de confiance. */
function typoHtml(s) {
  return String(s).split(/(<[^>]+>)/g).map((part, i) => (i % 2 ? part : typo(part))).join('');
}

export const brut = (s) => ({ [BRUT]: s == null ? '' : String(s) });
export const estBrut = (v) => v && typeof v === 'object' && BRUT in v;
export const texteBrut = (v) => (estBrut(v) ? v[BRUT] : String(v ?? ''));

function rendre(v, dansBalise) {
  if (v == null || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map((x) => rendre(x, dansBalise)).join('');
  if (estBrut(v)) return v[BRUT];
  const s = String(v);
  return echapper(dansBalise ? typo(s, { inserer: false }) : typo(s));
}

/* Attributs techniques : jamais de typographie (une espace insécable casserait sizes, media, srcset…). */
const TECHNIQUES = /(?:^|\s)(href|src|srcset|sizes|media|action|style|class|id|for|type|rel|name|value|lang|hreflang|role|target|loading|decoding|fetchpriority|width|height|tabindex|autocomplete|aria-controls|aria-describedby|aria-labelledby|aria-current|aria-expanded|aria-hidden|data-(?!libelle)[\w-]*)=["']$/i;
/* Attributs de texte : typographie sans ajout d'espace (alt, title, aria-label, placeholder, content, data-libelle…). */
const ATTRIBUT = /(?:^|\s)[\w:-]+=["']$/;

export function html(chaines, ...valeurs) {
  let sortie = '', dansBalise = false;
  chaines.forEach((c, i) => {
    sortie += c;
    for (const ch of c) { if (ch === '<') dansBalise = true; else if (ch === '>') dansBalise = false; }
    if (i < valeurs.length) {
      const v = valeurs[i];
      /* Le contexte se lit dans le texte qui précède la valeur, même dans un gabarit imbriqué. */
      if (TECHNIQUES.test(c) || /\s(?:content)=["']$/i.test(c) && /^https?:|^\//.test(String(v ?? ''))) sortie += estBrut(v) ? v[BRUT] : echapper(v ?? '');
      else sortie += rendre(v, dansBalise || ATTRIBUT.test(c));
    }
  });
  return brut(sortie);
}

export const fragment = (s) => brut(typoHtml(s));
