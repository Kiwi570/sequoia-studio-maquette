/* Visuels dessinés en code à l'emplacement des images générées qui ne sont pas encore arrivées.
   Un dessin par image prévue dans le document Grok (même nom). Dès que assets/images/grok/<nom>-*.webp existe,
   le générateur affiche l'image à la place : rien d'autre à changer.
   Dessins en SVG, sans filtre (aucun flou ni bruit calculé) : légers et fixes.
   Les intérieurs sont dessinés à l'échelle : 1 unité = 1 cm (500 cm de mur visibles), ce qui permet
   de poser les œuvres à leur taille réelle dans l'outil « Voir chez vous ». */
import { brut } from '../../outils/gabarit.mjs';

let n = 0;
const svg = (vb, corps, { ratio = 'xMidYMid slice', classe = '' } = {}) =>
  brut(`<svg class="provisoire ${classe}" viewBox="${vb}" preserveAspectRatio="${ratio}" aria-hidden="true" focusable="false">${corps}</svg>`);

/* Mur de nuit : plâtre anthracite, flaques de lumière chaude, liseré de sol. */
function mur(id, flaques, { sol = 0.94, rail = false, w = 1600, h = 900, couleur = '#1a1816' } = {}) {
  const defs = `<linearGradient id="m${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0c0b"/><stop offset=".55" stop-color="${couleur}"/><stop offset="1" stop-color="#0c0b0a"/></linearGradient>
  <radialGradient id="f${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f3d9a6" stop-opacity=".42"/><stop offset=".35" stop-color="#d9b77c" stop-opacity=".24"/><stop offset=".7" stop-color="#a7834d" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17120d"/><stop offset="1" stop-color="#070605"/></linearGradient>
  <radialGradient id="v${id}" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>`;
  const pools = flaques.map(([x, y, rx, ry]) => `<ellipse cx="${x * w}" cy="${y * h}" rx="${rx * w}" ry="${ry * h}" fill="url(#f${id})"/>`).join('');
  const faisceaux = flaques.map(([x, y, rx]) => `<path d="M${x * w - 18} 0 L${x * w + 18} 0 L${x * w + rx * w * .9} ${y * h} L${x * w - rx * w * .9} ${y * h}Z" fill="#f3d9a6" opacity=".035"/>`).join('');
  const r = rail ? `<rect x="0" y="${h * .035}" width="${w}" height="6" fill="#050505"/>${flaques.map(([x]) => `<rect x="${x * w - 9}" y="${h * .035}" width="18" height="26" rx="4" fill="#0a0a0a"/>`).join('')}` : '';
  return `<defs>${defs}</defs><rect width="${w}" height="${h}" fill="url(#m${id})"/>${faisceaux}${pools}${r}
  <rect y="${h * sol}" width="${w}" height="${h * (1 - sol)}" fill="url(#s${id})"/><rect y="${h * sol}" width="${w}" height="2" fill="#2a2219" opacity=".8"/>
  <rect width="${w}" height="${h}" fill="url(#v${id})"/>`;
}

/* Intérieur du soir à l'échelle (viewBox 500 × 281 cm). */
function interieur(id, { mur: couleurMur, sol = 255, meuble, lampe = 'gauche' }) {
  const defs = `<linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0b0a"/><stop offset=".6" stop-color="${couleurMur}"/><stop offset="1" stop-color="#0e0c0a"/></linearGradient>
  <radialGradient id="g${id}" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#f1d6a2" stop-opacity=".26"/><stop offset=".6" stop-color="#c79f63" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="l${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd99a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd99a" stop-opacity="0"/></radialGradient>
  <linearGradient id="p${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1610"/><stop offset="1" stop-color="#090706"/></linearGradient>`;
  const lx = lampe === 'gauche' ? 70 : 430;
  const lampeSvg = `<circle cx="${lx}" cy="150" r="70" fill="url(#l${id})"/><rect x="${lx - 1}" y="150" width="2" height="${sol - 150}" fill="#8a6d3e"/><path d="M${lx - 16} 150 h32 l-8 -22 h-16z" fill="#c9a66a"/>`;
  return `<defs>${defs}</defs><rect width="500" height="281" fill="url(#w${id})"/><ellipse cx="250" cy="105" rx="150" ry="95" fill="url(#g${id})"/>
  <rect y="${sol}" width="500" height="${281 - sol}" fill="url(#p${id})"/><rect y="${sol}" width="500" height=".6" fill="#3a2c1d"/>
  ${lampeSvg}${meuble}`;
}

const canape = (sol) => `<g fill="#cfc6b6"><rect x="140" y="${sol - 82}" width="220" height="44" rx="8" opacity=".92"/><rect x="140" y="${sol - 46}" width="220" height="34" rx="6"/><rect x="134" y="${sol - 62}" width="20" height="50" rx="8"/><rect x="346" y="${sol - 62}" width="20" height="50" rx="8"/></g><g fill="#5c5040"><rect x="150" y="${sol - 12}" width="4" height="12"/><rect x="346" y="${sol - 12}" width="4" height="12"/></g><ellipse cx="250" cy="${sol + 6}" rx="150" ry="5" fill="#000" opacity=".45"/><rect x="390" y="${sol - 46}" width="44" height="46" rx="4" fill="#b9a68a" opacity=".85"/>`;
const table = (sol, long = 240) => `<rect x="${250 - long / 2}" y="${sol - 76}" width="${long}" height="6" rx="2" fill="#5a3b24"/><rect x="${260 - long / 2}" y="${sol - 70}" width="5" height="70" fill="#3b2617"/><rect x="${235 + long / 2}" y="${sol - 70}" width="5" height="70" fill="#3b2617"/>${[0, 1, 2, 3].map((i) => `<rect x="${250 - long / 2 + 20 + i * (long - 40) / 3 - 18}" y="${sol - 96}" width="36" height="40" rx="6" fill="#241a14"/><rect x="${250 - long / 2 + 20 + i * (long - 40) / 3 - 2}" y="${sol - 56}" width="4" height="56" fill="#1a120d"/>`).join('')}`;
const lit = (sol) => `<rect x="160" y="${sol - 110}" width="180" height="72" rx="6" fill="#3a3129"/><rect x="170" y="${sol - 48}" width="160" height="40" rx="5" fill="#d9d0c1"/><rect x="176" y="${sol - 62}" width="66" height="20" rx="8" fill="#ece5d8"/><rect x="258" y="${sol - 62}" width="66" height="20" rx="8" fill="#ece5d8"/><rect x="120" y="${sol - 50}" width="34" height="50" rx="3" fill="#2a211a"/><rect x="346" y="${sol - 50}" width="34" height="50" rx="3" fill="#2a211a"/><circle cx="137" cy="${sol - 70}" r="20" fill="#ffd99a" opacity=".22"/><circle cx="363" cy="${sol - 70}" r="20" fill="#ffd99a" opacity=".22"/>`;

const DESSINS = {
  'mur-nuit': (id) => svg('0 0 1600 900', mur(id, [[0.5, 0.42, 0.26, 0.3]])),
  'salle-nuit': (id) => svg('0 0 1600 900', mur(id, [[0.25, 0.45, 0.13, 0.26], [0.5, 0.45, 0.13, 0.26], [0.75, 0.45, 0.13, 0.26]], { sol: 0.92 })),
  'mur-galerie': (id) => svg('0 0 1600 900', mur(id, [0.14, 0.38, 0.62, 0.86].flatMap((x) => [[x, 0.3, 0.11, 0.2], [x, 0.66, 0.11, 0.2]]), { rail: true, sol: 0.95 })),
  'mur-vide-404': (id) => svg('0 0 1600 900', mur(id, [[0.5, 0.42, 0.24, 0.3]]) + `<rect x="660" y="250" width="280" height="190" fill="#f2ede4" opacity=".05"/><g fill="#b89a5e"><circle cx="725" cy="240" r="5"/><circle cx="875" cy="240" r="5"/></g>`),
  'salon-soir': (id) => svg('0 0 500 281', interieur(id, { mur: '#2b2620', meuble: canape(255) }), { classe: 'provisoire--interieur' }),
  'bureau-soir': (id) => svg('0 0 500 281', interieur(id, { mur: '#1f2429', meuble: table(255, 240), lampe: 'droite' }), { classe: 'provisoire--interieur' }),
  'chambre-soir': (id) => svg('0 0 500 281', interieur(id, { mur: '#29231f', meuble: lit(255) }), { classe: 'provisoire--interieur' }),
  'salle-a-manger-soir': (id) => svg('0 0 500 281', interieur(id, { mur: '#232520', meuble: table(255, 200) + `<path d="M250 0 V40" stroke="#8a6d3e" stroke-width="1"/><ellipse cx="250" cy="44" rx="22" ry="6" fill="#c9a66a"/>` }), { classe: 'provisoire--interieur' }),
  'atelier-impression': (id) => svg('0 0 1600 900', `<defs><radialGradient id="a${id}" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#3a3026"/><stop offset="1" stop-color="#070606"/></radialGradient><linearGradient id="p${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf8f1"/><stop offset="1" stop-color="#cfc8ba"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/><path d="M780 0 L840 0 L1180 900 L440 900Z" fill="#f3d9a6" opacity=".045"/>
    <rect x="360" y="420" width="900" height="210" rx="18" fill="#141312"/><rect x="380" y="440" width="860" height="30" rx="6" fill="#1f1d1b"/><rect x="420" y="630" width="20" height="200" fill="#0e0d0c"/><rect x="1180" y="630" width="20" height="200" fill="#0e0d0c"/>
    <path d="M500 470 L1120 470 L1180 640 L440 640Z" fill="url(#p${id})"/><path d="M440 640 L1180 640 L1160 652 L460 652Z" fill="#a9a293" opacity=".6"/>
    <g fill="#2a2520">${[0, 1, 2, 3].map((i) => `<rect x="${1330}" y="${300 + i * 70}" width="200" height="46" rx="23"/>`).join('')}</g>
    <rect x="80" y="260" width="200" height="300" fill="#2c2f31" opacity=".5"/><rect x="0" y="830" width="1600" height="70" fill="#060505"/>`),
  'atelier-nuit': (id) => svg('0 0 1600 900', `<defs><radialGradient id="a${id}" cx=".35" cy=".45" r=".6"><stop offset="0" stop-color="#3b3128"/><stop offset="1" stop-color="#070606"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/><circle cx="560" cy="420" r="260" fill="#ffd99a" opacity=".08"/>
    <rect x="160" y="560" width="900" height="26" fill="#6b4a2c"/><rect x="190" y="586" width="18" height="260" fill="#3d2a19"/><rect x="1010" y="586" width="18" height="260" fill="#3d2a19"/>
    ${[0, 1, 2].map((i) => `<rect x="${260 + i * 14}" y="${524 - i * 10}" width="300" height="10" fill="#f2ede4" opacity="${0.9 - i * 0.12}"/>`).join('')}
    <circle cx="760" cy="540" r="26" fill="none" stroke="#b89a5e" stroke-width="5"/><rect x="782" y="556" width="40" height="7" rx="3" fill="#b89a5e" transform="rotate(35 782 556)"/>
    <path d="M520 360 L560 520" stroke="#2a2420" stroke-width="8"/><path d="M490 340 h80 l-12 -40 h-56z" fill="#c9a66a"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${1200 + i * 46}" y="${260 + (i % 2) * 30}" width="22" height="${560 - (i % 2) * 30}" fill="${['#0f0f0f', '#d8d1c4', '#8a6a44', '#111', '#a07c52'][i]}" transform="rotate(${-6 + i * 2} ${1210 + i * 46} 820)"/>`).join('')}
    <rect x="0" y="846" width="1600" height="54" fill="#060505"/>`),
  'atelier-baguettes': (id) => svg('0 0 1600 900', `<defs><linearGradient id="a${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2f25"/><stop offset=".7" stop-color="#0d0b09"/><stop offset="1" stop-color="#060505"/></linearGradient>
    <linearGradient id="c${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a66"/><stop offset=".5" stop-color="#a77c4b"/><stop offset="1" stop-color="#6e4e2e"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/>
    <g transform="rotate(-14 800 450)">
      <path d="M120 300 L1260 300 L1220 360 L160 360Z" fill="#0f0f0f"/><path d="M120 300 L1260 300 L1250 312 L130 312Z" fill="#3b3b3b"/>
      <path d="M200 420 L1340 420 L1300 480 L240 480Z" fill="#e6dfd2"/><path d="M200 420 L1340 420 L1330 432 L210 432Z" fill="#fff" opacity=".7"/>
      <path d="M90 540 L1230 540 L1190 600 L130 600Z" fill="url(#c${id})"/>${Array.from({ length: 22 }, (_, i) => `<path d="M${140 + i * 50} 548 q20 24 46 46" stroke="#5a3e22" stroke-width="1.4" fill="none" opacity=".5"/>`).join('')}
    </g>
    <rect x="1080" y="640" width="160" height="40" rx="4" fill="#2b2b2b"/><rect x="1150" y="560" width="22" height="100" fill="#3a3a3a"/>`),
  'atelier-gants': (id) => svg('0 0 1600 900', `<defs><radialGradient id="a${id}" cx=".5" cy=".45" r=".65"><stop offset="0" stop-color="#4a3322"/><stop offset="1" stop-color="#0b0807"/></radialGradient>
    <linearGradient id="h${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9a7ff"/><stop offset=".33" stop-color="#7fe0d2"/><stop offset=".66" stop-color="#f3d27a"/><stop offset="1" stop-color="#f29bc5"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/>
    <rect x="620" y="330" width="420" height="270" rx="6" fill="#efe6d4" transform="rotate(-6 830 465)"/><path d="M620 330 L830 470 L1040 330" fill="none" stroke="#d6cbb4" stroke-width="3" transform="rotate(-6 830 465)"/>
    <circle cx="1130" cy="560" r="44" fill="url(#h${id})"/><circle cx="1130" cy="560" r="44" fill="none" stroke="#fff" stroke-opacity=".5"/>
    <path d="M300 600 q-30 -140 20 -200 q30 -20 40 30 l10 -90 q20 -30 40 0 l4 100 l14 -110 q22 -26 40 4 l-6 120 l26 -90 q24 -16 34 10 l-30 140 q-10 90 -110 110z" fill="#f4f1ea" opacity=".92"/>`),
  'mousse-melamine': (id) => {
    const cellules = [];
    let s = 7;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let y = 0; y < 900; y += 30) for (let x = (y / 30) % 2 ? 15 : 0; x < 1600; x += 30) cellules.push(`<circle cx="${x + r() * 10}" cy="${y + r() * 10}" r="${6 + r() * 7}" fill="#0b0b0b" opacity="${0.18 + r() * 0.3}"/>`);
    return svg('0 0 1600 900', `<defs><linearGradient id="a${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfcac2"/><stop offset=".6" stop-color="#8e8a84"/><stop offset="1" stop-color="#2e2c2a"/></linearGradient></defs><rect width="1600" height="900" fill="url(#a${id})"/>${cellules.join('')}`);
  },
  'emballage': (id) => svg('0 0 1600 900', `<defs><radialGradient id="a${id}" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#3b2e22"/><stop offset="1" stop-color="#080706"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/><path d="M770 0 h60 l320 900 h-700z" fill="#f3d9a6" opacity=".04"/>
    <path d="M420 380 L1120 330 L1240 520 L520 580Z" fill="#a5794b"/><path d="M420 380 L520 580 L520 640 L420 440Z" fill="#7d5a36"/><path d="M520 580 L1240 520 L1240 580 L520 640Z" fill="#8c6640"/>
    <path d="M470 400 L1110 356 L1190 500 L545 548Z" fill="#c9a77d"/>
    <path d="M200 690 L760 640 L800 700 L240 760Z" fill="#b8915f" opacity=".9"/><g fill="#141414"><path d="M1260 640 l60 0 l0 60 l-20 0 l0 -40 l-40 0z"/><path d="M1340 700 l60 0 l0 60 l-20 0 l0 -40 l-40 0z"/></g>
    <path d="M1000 640 L1360 610 L1380 640 L1020 670Z" fill="#f4efe6" opacity=".85"/>`),
  'journal-table': (id) => svg('0 0 1600 900', `<defs><radialGradient id="a${id}" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#5a3c24"/><stop offset=".7" stop-color="#22160d"/><stop offset="1" stop-color="#090605"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/>${Array.from({ length: 18 }, (_, i) => `<path d="M0 ${40 + i * 50} q800 ${i % 2 ? 18 : -18} 1600 0" stroke="#2e1d10" stroke-width="2" fill="none" opacity=".5"/>`).join('')}
    <rect x="520" y="270" width="300" height="380" fill="#f2ede4" transform="rotate(-4 670 460)"/><rect x="820" y="270" width="300" height="380" fill="#ebe4d6" transform="rotate(-4 670 460)"/>
    <circle cx="1270" cy="330" r="62" fill="none" stroke="#b89a5e" stroke-width="10"/><rect x="1310" y="372" width="110" height="18" rx="9" fill="#b89a5e" transform="rotate(42 1310 372)"/>
    ${['#c26b2d', '#2b54a5', '#d8432c'].map((c, i) => `<circle cx="${300 + i * 110}" cy="${700 + (i % 2) * 40}" r="46" fill="#1a1410"/><circle cx="${300 + i * 110}" cy="${700 + (i % 2) * 40}" r="36" fill="${c}"/>`).join('')}
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="1180" y="560" width="200" height="80" fill="${['#fbf8f1', '#f1eadc', '#e8dfcd', '#ddd2bd', '#f6f1e6'][i]}" transform="rotate(${-30 + i * 12} 1190 640)"/>`).join('')}
    <rect x="200" y="300" width="14" height="250" rx="7" fill="#111" transform="rotate(25 207 425)"/>`),
  'journal-pigments': (id) => svg('0 0 1600 900', `<defs><radialGradient id="a${id}" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#3a342e"/><stop offset="1" stop-color="#0a0908"/></radialGradient></defs>
    <rect width="1600" height="900" fill="url(#a${id})"/>
    ${[['#9e3a1f', 360], ['#c99a3a', 660], ['#151312', 960], ['#ece6da', 1250]].map(([c, x], i) => `<ellipse cx="${x}" cy="${560 + (i % 2) * 40}" rx="150" ry="58" fill="#4a4540"/><ellipse cx="${x}" cy="${548 + (i % 2) * 40}" rx="128" ry="42" fill="#2a2724"/><path d="M${x - 110} ${548 + (i % 2) * 40} q110 -110 220 0z" fill="${c}"/>`).join('')}
    <rect x="420" y="700" width="560" height="14" rx="7" fill="#8a6a44" transform="rotate(-8 700 707)"/><path d="M980 668 q60 -10 90 20 q-50 30 -90 12z" fill="#c9b08a" transform="rotate(-8 700 707)"/>`),
  'texture-hologramme': (id) => svg('0 0 1600 900', `<defs><linearGradient id="a${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1f4a"/><stop offset=".25" stop-color="#3fb7a8"/><stop offset=".45" stop-color="#e9c46a"/><stop offset=".62" stop-color="#e98bb8"/><stop offset=".8" stop-color="#6a5acd"/><stop offset="1" stop-color="#0b0b0c"/></linearGradient>
    <radialGradient id="v${id}" cx=".5" cy=".5" r=".7"><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient></defs>
    <rect width="1600" height="900" fill="#0b0b0c"/><path d="M-100 700 C300 200 900 1000 1700 200 L1700 900 L-100 900Z" fill="url(#a${id})" opacity=".55"/>
    ${Array.from({ length: 60 }, (_, i) => `<path d="M${-200 + i * 32} 900 L${300 + i * 32} 0" stroke="#fff" stroke-opacity=".05"/>`).join('')}
    <rect width="1600" height="900" fill="url(#v${id})"/>`),
  'texture-papier-coton': () => brut('<span class="provisoire provisoire--texture provisoire--papier" aria-hidden="true"></span>'),
  'texture-alu-brosse': () => brut('<span class="provisoire provisoire--texture provisoire--alu" aria-hidden="true"></span>'),
  'texture-toile': () => brut('<span class="provisoire provisoire--texture provisoire--toile" aria-hidden="true"></span>'),
  'mentions-archives': (id) => svg('0 0 1600 900', `<rect width="1600" height="900" fill="#080807"/>${[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<rect x="${140 + k * 70 - r * 6}" y="${130 + r * 130}" width="56" height="100" fill="#141312" stroke="#1d1b19"/><rect x="${158 + k * 70 - r * 6}" y="${160 + r * 130}" width="20" height="8" fill="#6f5a36"/>`).join('')).join('')}
    ${[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<rect x="${860 + k * 70 + r * 6}" y="${130 + r * 130}" width="56" height="100" fill="#141312" stroke="#1d1b19"/><rect x="${878 + k * 70 + r * 6}" y="${160 + r * 130}" width="20" height="8" fill="#6f5a36"/>`).join('')).join('')}
    <ellipse cx="800" cy="820" rx="200" ry="50" fill="#f3d9a6" opacity=".12"/>`),
  'cgv-cartels': (id) => svg('0 0 1600 900', mur(id, [[0.5, 0.48, 0.42, 0.32]]) + [0, 1, 2, 3, 4].map((i) => `<rect x="${420 + i * 160}" y="410" width="110" height="70" rx="2" fill="#efe8db" opacity="${0.9 - Math.abs(i - 2) * 0.18}"/><rect x="${436 + i * 160}" y="428" width="60" height="4" fill="#cfc5b3" opacity=".6"/>`).join('')),
  'confidentialite-porte': (id) => svg('0 0 1600 900', `<defs><linearGradient id="l${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffcf87" stop-opacity="0"/><stop offset=".5" stop-color="#ffd99a"/><stop offset="1" stop-color="#ffcf87" stop-opacity="0"/></linearGradient></defs>
    <rect width="1600" height="900" fill="#0a0908"/><rect x="560" y="120" width="480" height="780" fill="#1d150f"/><rect x="566" y="126" width="468" height="774" fill="#2b1f15"/>
    <rect x="1034" y="126" width="12" height="774" fill="url(#l${id})"/><path d="M1046 900 L1300 900 L1046 760Z" fill="#ffd99a" opacity=".12"/>
    <rect x="980" y="500" width="34" height="8" rx="4" fill="#b89a5e"/>${[0, 1, 2].map((i) => `<rect x="610" y="${180 + i * 230}" width="380" height="190" fill="none" stroke="#1a120c" stroke-width="6"/>`).join('')}`),
};

export function visuel(nom, c) {
  n++;
  const cle = nom.replace(/-mobile$/, '');
  const f = DESSINS[cle];
  if (!f) return brut('<span class="provisoire provisoire--vide" aria-hidden="true"></span>');
  return f(`p${n}`, c);
}
