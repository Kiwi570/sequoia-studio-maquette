/* Compteurs [data-compteur="1300"] : le texte de la page contient le chiffre final (lisible sans JavaScript).
   La place du chiffre final est réservée avant de compter : rien autour ne bouge ni ne passe à la ligne.
   Au retour, en mode calme et en secours, le chiffre final s'affiche directement. */
import { etat, quand } from './etat.js?v=2';

export function initCompteurs() {
  const liste = [...document.querySelectorAll('[data-compteur]')];
  if (!liste.length || etat.calme || etat.arrivee === 'retour') return;
  const format = new Intl.NumberFormat(etat.langue === 'fr' ? 'fr-FR' : etat.langue, { maximumFractionDigits: 1 });
  const finals = new Map();
  liste.forEach((el) => {
    finals.set(el, el.textContent);
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.display = 'inline-block';
    el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
    el.textContent = format.format(0);
  });
  const remettre = () => finals.forEach((txt, el) => (el.textContent = txt));
  quand('retour', remettre);
  quand('pret', ({ mode }) => {
    if (mode !== 'jouee' && mode !== 'voile') { remettre(); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, fin = parseFloat(el.dataset.compteur), final = finals.get(el);
      const duree = 1400, t0 = performance.now();
      const pas = (t) => {
        const p = Math.min(1, (t - t0) / duree), v = fin * (1 - Math.pow(1 - p, 3));
        el.textContent = p < 1 ? format.format(Number.isInteger(fin) ? Math.round(v) : v) : final;
        if (p < 1) requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    }), { threshold: 0.6 });
    liste.forEach((el) => io.observe(el));
  });
}
