/* Défilement : natif sur Mac, iPhone, iPad et tout écran tactile (déjà fluide).
   Adouci seulement à la molette de souris sous Windows et Linux, jamais en mode calme.
   Le défilement natif reste la référence : on ne fait qu'animer window.scrollTo. */
import { html, etat } from './etat.js?v=1';
import { mesures } from './mesures.js?v=1';

let adouci = false;
let cible = 0, courant = 0, anime = false, dernier = 0;
const verrous = new Set();

function estApple() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  return /mac|iphone|ipad|ipod|ios/i.test(p) || /iPhone|iPad|Macintosh/.test(navigator.userAgent);
}

function maxDefilement() {
  return Math.max(0, (mesures.pageH || document.documentElement.scrollHeight) - window.innerHeight);
}

/* La molette fait défiler un bloc intérieur s'il peut encore défiler dans ce sens. */
function blocDefilable(el, dy) {
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.nodeType === 1) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : dy < 0 ? el.scrollTop > 0 : true) return true;
      }
    }
    el = el.parentNode;
  }
  return false;
}

function tick(t) {
  const dt = Math.min(0.05, dernier ? (t - dernier) / 1000 : 1 / 60);
  dernier = t;
  /* Lissage calculé selon le temps écoulé : même vitesse sur un appareil lent. */
  courant += (cible - courant) * (1 - Math.exp(-dt * 11));
  if (Math.abs(cible - courant) < 0.5) { courant = cible; anime = false; }
  window.scrollTo(0, courant);
  if (anime) requestAnimationFrame(tick); else dernier = 0;
}

function lancer() {
  if (!anime) { anime = true; dernier = 0; requestAnimationFrame(tick); }
}

export function initDefilement() {
  const souris = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const tactile = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  adouci = !etat.calme && souris && !tactile && !estApple() && !html.hasAttribute('data-defilement-natif');
  etat.defilement = adouci ? 'adouci' : 'natif';
  html.dataset.defilement = etat.defilement;

  /* Défilement bloqué (intro, menu ouvert) : molette, glissement et touches sans effet sur la page. */
  let yToucher = 0;
  window.addEventListener('touchstart', (e) => { yToucher = e.touches[0] ? e.touches[0].clientY : 0; }, { passive: true });
  const bloquer = (e) => {
    if (!verrous.size) return;
    let dy = e.deltaY;
    if (e.type === 'touchmove' && e.touches[0]) { dy = yToucher - e.touches[0].clientY; yToucher = e.touches[0].clientY; }
    if (e.target.closest && e.target.closest('[data-menu]') && blocDefilable(e.target, dy || 0)) return;
    e.preventDefault();
  };
  window.addEventListener('wheel', bloquer, { passive: false });
  window.addEventListener('touchmove', bloquer, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (verrous.size && [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)
      && !e.target.closest('input, textarea, select, [contenteditable], [data-menu]')) e.preventDefault();
  });

  if (!adouci) return;
  courant = cible = window.scrollY;
  window.addEventListener('wheel', (e) => {
    if (verrous.size || e.defaultPrevented || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (blocDefilable(e.target, e.deltaY)) return;
    e.preventDefault();
    const unite = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
    if (!anime) courant = cible = window.scrollY;
    cible = Math.min(maxDefilement(), Math.max(0, cible + e.deltaY * unite));
    lancer();
  }, { passive: false });
  /* Clavier, barre de défilement, liens : on reprend la position réelle. */
  window.addEventListener('scroll', () => { if (!anime) courant = cible = window.scrollY; }, { passive: true });
}

export function bloquerDefilement(raison) {
  verrous.add(raison);
  html.classList.add('defilement-bloque');
  anime = false;
}

export function debloquerDefilement(raison) {
  verrous.delete(raison);
  if (!verrous.size) html.classList.remove('defilement-bloque');
}

/* Aller à un élément (ou une position), sous l'en-tête. */
export function aller(cibleEl, { instant = false } = {}) {
  let y = typeof cibleEl === 'number' ? cibleEl
    : cibleEl.getBoundingClientRect().top + window.scrollY - mesures.enteteH - 12;
  y = Math.min(maxDefilement(), Math.max(0, y));
  if (instant || etat.calme) { anime = false; window.scrollTo({ top: y, behavior: 'instant' }); return; }
  if (adouci) { if (!anime) courant = window.scrollY; cible = y; lancer(); return; }
  window.scrollTo({ top: y, behavior: 'smooth' });
}
