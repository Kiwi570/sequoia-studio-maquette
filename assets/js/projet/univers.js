/* Accueil, « Choisir par univers » : survoler, focaliser ou toucher un univers l'éclaire ; l'œuvre change
   par un balayage de lumière (WebGL pendant le passage seulement), le fond se teinte. Un appui ou un clic ouvre
   l'univers dans la galerie. Mode calme ou sans WebGL : changement en fondu. */
import { etat } from '../socle/index.js?v=2';
import { $, $$ } from './outils.js?v=2';
import { creerBalayage } from './balayage.js?v=2';

export function initUnivers() {
  const bloc = $('[data-univers]');
  if (!bloc) return;
  const scene = $('[data-univers-scene]', bloc), canvas = $('[data-univers-canvas]', bloc);
  const figures = $$('[data-univers-image]', bloc), liens = $$('[data-univers-choix]', bloc);
  let actif = 0, gl = null, pret = false;
  const img = (i) => $('img', figures[i]);

  const charger = (i) => new Promise((ok) => { const im = img(i); im.loading = 'eager'; if (im.complete && im.naturalWidth) ok(im); else { im.addEventListener('load', () => ok(im), { once: true }); im.addEventListener('error', () => ok(null), { once: true }); } });
  const montrer = (i) => figures.forEach((f, k) => f.classList.toggle('est-active', k === i));

  const choisir = async (i) => {
    if (i === actif) return;
    const avant = actif; actif = i;
    liens.forEach((l, k) => (k === i ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
    const c = liens[i].dataset.nuit; if (c) { bloc.style.setProperty('--nuit', c); document.body.style.backgroundColor = c; }
    if (gl && pret && !etat.calme) {
      const [a, b] = await Promise.all([charger(avant), charger(i)]);
      if (a && b && actif === i) {
        gl.dimensionner(); gl.montrer(a);
        scene.classList.add('webgl');
        gl.vers(b, 950);
        setTimeout(() => { if (actif === i) { montrer(i); scene.classList.remove('webgl'); } }, 980);
        return;
      }
    }
    montrer(i);
  };

  /* WebGL chargé après l'ouverture et seulement à l'approche de la section. */
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    if (etat.calme) return;
    try { gl = creerBalayage(canvas); } catch { gl = null; }
    if (gl) { pret = true; figures.forEach((_, k) => charger(k)); }
  }, { rootMargin: '300px' });
  io.observe(bloc);

  liens.forEach((l, i) => {
    l.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') choisir(i); });
    l.addEventListener('focus', () => choisir(i));
  });
}
