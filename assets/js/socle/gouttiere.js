/* Bande de la barre de défilement (scrollbar-gutter: stable).
   Sur un ordinateur à barre de défilement classique (Windows, Mac avec une souris), une bande d'environ 15 px
   est réservée à droite. Quand le défilement est bloqué (intro, voile, menu), le navigateur la peint avec la
   couleur de fond de html, et aucun panneau fixe ne peut la recouvrir : sans précaution, une bande claire reste
   à côté d'un voile sombre. Le style critique donne à html la couleur du voile tant que l'intro ou le voile
   couvre l'écran ; ce module suit ensuite, image par image, le panneau qui couvre l'écran (intro, voile, menu)
   pendant qu'il entre ou se retire. Le navigateur n'y peint qu'une couleur unie (ni image ni dégradé) :
   la bande prend la couleur de ce qui en couvre la plus grande partie, mélangée selon l'opacité pendant un fondu.
   Couleur suivie : attribut data-gouttiere="#…" du panneau s'il existe, sinon sa couleur de fond
   (si elle est transparente, par exemple une image ou un dégradé : --voile-fond).
   Sans bande réservée (téléphone, tablette, Mac avec pavé tactile), rien n'est fait. */
import { html } from './etat.js?v=2';

const suivis = new Map(); /* panneau -> fin du suivi image par image (ms) ; Infinity jusqu'à lacher() */
let boucle = 0;
let dernier = '';

const transparente = (c) => !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);

/* Vrai si une bande est réservée à droite pour la barre de défilement. */
export function aUneBande() {
  return window.innerWidth - html.getBoundingClientRect().width > 0.5;
}

/* Partie visible du panneau, découpe clip-path: inset() comprise (révélations en rideau). */
function partieVisible(s, r) {
  const m = /^inset\(([^)]*)\)/.exec(s.clipPath || '');
  if (!m) return { haut: r.top, bas: r.bottom, droite: r.right };
  const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
  const [a, b = a, c = a] = v;
  const val = (x, total) => (x.endsWith('%') ? (parseFloat(x) / 100) * total : parseFloat(x) || 0);
  return { haut: r.top + val(a, r.height), bas: r.bottom - val(c, r.height), droite: r.right - val(b, r.width) };
}

function peindre() {
  boucle = 0;
  const t = performance.now();
  const h = window.innerHeight;
  const bord = html.getBoundingClientRect().width;
  const racine = getComputedStyle(html);
  const fond = racine.getPropertyValue('--fond').trim() || '#fff';
  const voileFond = racine.getPropertyValue('--voile-fond').trim() || fond;
  let actif = false;
  const couches = [];
  for (const [el, fin] of suivis) {
    if (!el.isConnected) { suivis.delete(el); continue; }
    if (t < fin) actif = true;
    const s = getComputedStyle(el);
    const op = parseFloat(s.opacity);
    if (s.display === 'none' || s.visibility === 'hidden' || !(op > 0.01)) continue;
    const p = partieVisible(s, el.getBoundingClientRect());
    if (p.droite < bord - 2) continue; /* le panneau ne touche pas le bord droit */
    const haut = Math.max(0, Math.min(h, p.haut)), bas = Math.max(0, Math.min(h, p.bas));
    if (bas - haut < 1) continue;
    const couleur = el.dataset.gouttiere || (transparente(s.backgroundColor) ? voileFond : s.backgroundColor);
    couches.push({ z: parseInt(s.zIndex, 10) || 0, haut, bas, couleur, op: Math.min(1, op) });
  }
  /* Panneaux empilés dans l'ordre de leur z-index ; chacun compte s'il couvre au moins la moitié de la bande. */
  couches.sort((a, b) => a.z - b.z);
  let valeur = fond;
  for (const c of couches) {
    if ((c.bas - c.haut) / h < 0.5) continue;
    valeur = c.op >= 0.995 ? c.couleur : `color-mix(in srgb, ${c.couleur} ${(c.op * 100).toFixed(1)}%, ${valeur})`;
  }
  if (valeur !== dernier) { html.style.backgroundColor = valeur; dernier = valeur; }
  if (actif && suivis.size) boucle = requestAnimationFrame(peindre);
}

/**
 * Fait suivre à la bande la couleur et la position d'un panneau qui couvre l'écran.
 * @param {Element} el    panneau (intro, voile, menu, fenêtre plein écran du projet)
 * @param {number} duree  durée du suivi image par image en ms (Infinity jusqu'à lacher) ;
 *                        ensuite la bande garde la dernière couleur peinte jusqu'à lacher().
 */
export function suivre(el, duree = Infinity) {
  if (!el || !aUneBande()) return;
  suivis.set(el, duree === Infinity ? Infinity : performance.now() + duree);
  if (!boucle) boucle = requestAnimationFrame(peindre);
}

/* Le panneau ne couvre plus l'écran : la bande reprend le fond de la page (style de html). */
export function lacher(el) {
  if (!suivis.delete(el)) return;
  if (suivis.size) { if (!boucle) boucle = requestAnimationFrame(peindre); return; }
  cancelAnimationFrame(boucle);
  boucle = 0;
  dernier = '';
  html.style.removeProperty('background-color');
}

export function lacherTout() { [...suivis.keys()].forEach(lacher); }
