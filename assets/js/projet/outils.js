/* Petits outils partagés par les modules du projet. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const souris = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
export const telephone = () => matchMedia('(max-width: 760px)').matches;
export const borne = (v, a, b) => Math.min(b, Math.max(a, v));

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
/* 1 234 € avec espaces insécables (fines pour les milliers, comme le générateur). */
export const euros = (n) => `${fmt.format(n).replace(/[  \s]/g, ' ')} €`;
export const cm = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')}`;

/* Recherche : sans accents ni majuscules, pluriels simples ramenés au singulier. */
export const normaliser = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').toLowerCase();
export const mots = (s) => normaliser(s).split(/[^a-z0-9]+/).filter(Boolean).map((m) => (m.length > 3 ? m.replace(/(s|x)$/, '') : m));

/* Annonce aux lecteurs d'écran (zone aria-live du gabarit commun). */
export function annoncer(texte) {
  const z = $('[data-annonce]');
  if (!z) return;
  z.textContent = '';
  requestAnimationFrame(() => { z.textContent = texte; });
}

/* Focus gardé dans une fenêtre ouverte (Tab et Maj+Tab bouclent). */
export function garderFocus(racine, e) {
  if (e.key !== 'Tab') return;
  const f = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])', racine)
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
}

/* Lissage indépendant de la cadence : même vitesse sur un appareil lent. */
export const lisser = (actuel, cible, dt, vitesse) => actuel + (cible - actuel) * (1 - Math.exp(-dt * vitesse));
