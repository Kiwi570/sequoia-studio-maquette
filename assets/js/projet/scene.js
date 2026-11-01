/* Scènes au projecteur : le faisceau (un grand halo, déplacé par transform uniquement) suit la souris,
   ou dérive doucement sur écran tactile ; les ombres des cadres partent à l'opposé de la lumière.
   Fond de la page teinté par la couleur de l'œuvre de la section visible. Mode calme : tout reste fixe.
   Positions mesurées au chargement et au redimensionnement seulement (rien n'est lu pendant le défilement). */
import { boucle, etat } from '../socle/index.js?v=2';
import { $, $$, souris, lisser } from './outils.js?v=2';

const scenes = [];

export function initScenes() {
  $$('[data-scene]').forEach((s) => {
    const halo = $('.projecteur-halo', s);
    const ref = halo ? halo.closest('.projecteur').parentElement : s;
    const oeuvre = $('[data-scene-oeuvre]', s);
    const sc = { s, ref, halo, oeuvre, ombres: $$('.cadre-ombre', s), x: 0, y: 0, cx: 0, cy: 0, echelle: 1, souris: false, w: 0, h: 0, ox: 0, oy: 0, haut: 0, gauche: 0 };
    const mesurer = () => {
      const r = ref.getBoundingClientRect();
      sc.w = r.width; sc.h = r.height; sc.haut = r.top + window.scrollY; sc.gauche = r.left + window.scrollX;
      if (oeuvre) {
        const o = oeuvre.getBoundingClientRect();
        sc.ox = o.left - r.left + o.width / 2; sc.oy = o.top - r.top + o.height / 2;
      } else { sc.ox = r.width / 2; sc.oy = r.height * 0.46; }
      if (!sc.souris) { sc.x = sc.cx = sc.ox; sc.y = sc.cy = sc.oy; }
      /* Le halo garde sa position CSS (left/top) : le JavaScript ne fait que le décaler par transform,
         aucun déplacement de mise en page au chargement. */
      if (halo) { const cs = getComputedStyle(halo); sc.x0 = parseFloat(cs.left) || 0; sc.y0 = parseFloat(cs.top) || 0; }
      poser(sc);
    };
    sc.mesurer = mesurer;
    new ResizeObserver(mesurer).observe(ref);
    window.addEventListener('load', mesurer, { once: true });
    mesurer();
    scenes.push(sc);
    if (!halo || etat.calme) return;
    if (souris()) {
      ref.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        /* Scène collante (fiche) : sa position suit le défilement, on la recalcule depuis la mise en page gardée. */
        const haut = ref.classList.contains('fiche-scene') ? window.scrollY + (sc.hautCollant ?? 0) : sc.haut;
        sc.cx = e.pageX - sc.gauche; sc.cy = e.pageY - haut; sc.souris = true;
      }, { passive: true });
      ref.addEventListener('pointerleave', () => { sc.cx = sc.ox; sc.cy = sc.oy; });
    } else {
      ref.addEventListener('touchmove', (e) => {
        const t = e.touches[0]; if (!t) return;
        sc.cx = t.pageX - sc.gauche; sc.cy = t.pageY - sc.haut; sc.doigt = performance.now();
      }, { passive: true });
    }
    if (ref.classList.contains('fiche-scene')) sc.hautCollant = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--entete-h')) || 64;
    boucle(ref, (dt, t) => {
      if (!souris() && !(sc.doigt && performance.now() - sc.doigt < 1500)) {
        /* Dérive lente autour de l'œuvre (écran tactile). */
        sc.cx = sc.ox + Math.sin(t * 0.45) * sc.w * 0.06;
        sc.cy = sc.oy + Math.cos(t * 0.31) * sc.h * 0.04;
      }
      sc.x = lisser(sc.x, sc.cx, dt, 5); sc.y = lisser(sc.y, sc.cy, dt, 5);
      poser(sc);
    });
  });
}

export function poser(sc) {
  if (sc.halo) sc.halo.style.transform = `translate3d(${(sc.x - (sc.x0 || 0)).toFixed(1)}px, ${(sc.y - (sc.y0 || 0)).toFixed(1)}px, 0) scale(${sc.echelle.toFixed(3)})`;
  if (!sc.ombres.length) return;
  /* Ombre portée à l'opposé de la lumière, bornée. */
  const dx = sc.ox - sc.x, dy = sc.oy - sc.y;
  const ox = Math.max(-5, Math.min(5, dx * 0.018)), oy = Math.max(1, Math.min(8, 4 + dy * 0.018));
  const vx = `${ox.toFixed(2)}%`, vy = `${oy.toFixed(2)}%`;
  if (vx === sc.vx && vy === sc.vy) return;
  sc.vx = vx; sc.vy = vy;
  sc.ombres.forEach((o) => { o.style.setProperty('--ox', vx); o.style.setProperty('--oy', vy); });
}

/* Échelle du faisceau pour l'intro (petite : nuit presque complète ; 1 : faisceau normal). */
export function echelleFaisceau(v) {
  scenes.forEach((sc) => { sc.echelle = v; poser(sc); });
}
export const remesurer = () => scenes.forEach((sc) => sc.mesurer());

/* Fond de page teinté par l'œuvre de la section qui traverse le milieu de l'écran. */
export function initFondTeinte() {
  const sections = $$('main > section[style*="--nuit"]');
  if (!sections.length) return;
  const corps = document.body;
  const appliquer = (el) => {
    const c = el.style.getPropertyValue('--nuit').trim();
    if (c) corps.style.backgroundColor = c;
  };
  appliquer(sections[0]);
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && appliquer(e.target)), { rootMargin: '-50% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}
