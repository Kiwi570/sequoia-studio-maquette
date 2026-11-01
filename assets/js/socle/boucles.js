/* Boucles d'animation (canvas, WebGL, effets continus) : une seule boucle requestAnimationFrame,
   qui ne tourne que pour les éléments à l'écran, onglet visible, et jamais en mode calme.
   Le temps écoulé (dt, en secondes) est passé à chaque boucle : même vitesse sur un appareil lent.
   Les boucles lourdes passent à une image sur deux pendant le défilement.
   Les animations CSS en boucle [data-boucle-css] sont mises en pause hors écran et en mode calme ;
   un bouton [data-pause-pour="id"] permet de les arrêter (obligatoire au-delà de 5 s de mouvement). */
import { html, etat } from './etat.js?v=2';

const boucles = new Set();
let raf = 0, dernier = 0, defile = 0, impaire = false;

function actives() {
  if (etat.calme || document.hidden) return [];
  return [...boucles].filter((b) => b.visible && !b.pause);
}

function tick(t) {
  raf = 0;
  const liste = actives();
  if (!liste.length) { dernier = 0; return; }
  const dt = Math.min(0.05, dernier ? (t - dernier) / 1000 : 1 / 60);
  dernier = t;
  impaire = !impaire;
  const enDefilement = t - defile < 150;
  liste.forEach((b) => {
    if (b.lourde && enDefilement && impaire) return;
    try { b.fn(dt, t / 1000); } catch (err) { console.error(err); b.pause = true; }
  });
  raf = requestAnimationFrame(tick);
}

function relancer() { if (!raf && actives().length) raf = requestAnimationFrame(tick); }

const io = new IntersectionObserver((es) => {
  es.forEach((e) => { const b = e.target.__boucle; if (b) b.visible = e.isIntersecting; });
  relancer();
}, { rootMargin: '100px' });

/**
 * Enregistre une boucle liée à un élément.
 * @returns {{ arreter(): void, pause(v: boolean): void }}
 */
export function boucle(el, fn, { lourde = false } = {}) {
  const b = { el, fn, lourde, visible: false, pause: false };
  el.__boucle = b;
  boucles.add(b);
  io.observe(el);
  /* En mode calme, une seule image fixe est dessinée : jamais de cadre vide. */
  if (etat.calme) requestAnimationFrame(() => { try { fn(0, 0); } catch (err) { console.error(err); } });
  return {
    arreter() { boucles.delete(b); io.unobserve(el); },
    pause(v) { b.pause = v; relancer(); },
  };
}

export function initBoucles() {
  document.addEventListener('visibilitychange', relancer);
  window.addEventListener('scroll', () => { defile = performance.now(); }, { passive: true });
  etat.bouclesActives = () => actives().length;

  const css = document.querySelectorAll('[data-boucle-css]');
  if (css.length) {
    const ioCss = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('hors-ecran', !e.isIntersecting)));
    css.forEach((el) => ioCss.observe(el));
  }
  document.querySelectorAll('[data-pause-pour]').forEach((b) => {
    const cible = document.getElementById(b.dataset.pausePour);
    if (!cible) return;
    if (etat.calme) { b.hidden = true; return; }
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      const p = !cible.classList.contains('en-pause');
      cible.classList.toggle('en-pause', p);
      b.setAttribute('aria-pressed', String(p));
      const lib = b.querySelector('[data-libelle-bouton]') || b;
      lib.textContent = p ? (b.dataset.libelleLecture || 'Lecture') : (b.dataset.libellePause || 'Pause');
      if (cible.__boucle) { cible.__boucle.pause = p; relancer(); }
    });
  });
  if (etat.calme) html.classList.add('calme');
}
