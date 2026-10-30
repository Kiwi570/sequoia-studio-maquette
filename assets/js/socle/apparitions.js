/* Apparitions au défilement des éléments [data-anime] (hors data-anime="gsap", animés par le projet).
   Ils sont cachés par le style critique jusqu'à la classe .vu, qui les fait apparaître une fois,
   sans jamais les recacher. En mode calme, en secours et au retour : tout est affiché directement. */
import { html } from './etat.js?v=1';
import { mesures } from './mesures.js?v=1';

let io = null;

export function toutAfficher() {
  html.classList.add('sans-transition');
  document.querySelectorAll('[data-anime]').forEach((el) => {
    el.classList.add('vu');
    if (el.dataset.anime === 'gsap') { el.style.opacity = ''; el.style.transform = ''; }
  });
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('sans-transition')));
}

export function demarrerApparitions() {
  if (io) return;
  const elements = [...document.querySelectorAll('[data-anime]:not([data-anime="gsap"]):not(.vu)')];
  if (!elements.length) return;
  io = new IntersectionObserver((entrees) => {
    const visibles = entrees.filter((e) => e.isIntersecting).map((e) => e.target);
    visibles.forEach((el, i) => {
      el.style.setProperty('--delai', Math.min(i, 6) * 70 + 'ms');
      el.classList.add('vu');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 }); /* seuil 0 : même un très grand bloc apparaît */
  elements.forEach((el) => io.observe(el));
  /* En bas de page, ce qui reste dans les derniers 10 % de l'écran apparaît aussi. */
  const finDePage = () => {
    if (window.scrollY + window.innerHeight < (mesures.pageH || 0) - 4) return;
    document.querySelectorAll('[data-anime]:not([data-anime="gsap"]):not(.vu)').forEach((el) => { el.classList.add('vu'); io.unobserve(el); });
  };
  window.addEventListener('scroll', finDePage, { passive: true });
  finDePage();
}
