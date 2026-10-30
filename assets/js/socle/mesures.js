/* Mesures : hauteur réelle de l'en-tête et des barres fixes (variables CSS --entete-h et --barres-h),
   recalcul des positions liées au défilement quand la hauteur de la page change.
   Aucune lecture de mise en page pendant le défilement : tout est mesuré ici, puis gardé. */
import { html, emettre } from './etat.js?v=1';

export const mesures = { enteteH: 72, barresH: 0, pageH: 0, vueH: window.innerHeight };

let refreshPrevu = 0;
let enRafraichissement = false;

/* Un seul ScrollTrigger.refresh() regroupé, jamais pendant un autre. */
export function rafraichir() {
  clearTimeout(refreshPrevu);
  refreshPrevu = setTimeout(() => {
    const ST = window.ScrollTrigger;
    if (ST) {
      enRafraichissement = true;
      ST.refresh();
      requestAnimationFrame(() => { enRafraichissement = false; mesures.pageH = document.documentElement.scrollHeight; });
    }
    emettre('rafraichi');
  }, 120);
}

function mesurerBarres() {
  let total = 0;
  /* Une barre masquée garde sa place : la marge du bas ne change pas, rien ne saute. */
  document.querySelectorAll('[data-barre-fixe]').forEach((b) => {
    const r = b.getBoundingClientRect();
    if (r.height > 0 && getComputedStyle(b).display !== 'none') total += r.height;
  });
  mesures.barresH = Math.round(total);
  html.style.setProperty('--barres-h', mesures.barresH + 'px');
}

function mesurerEntete() {
  const e = document.querySelector('[data-entete]');
  mesures.enteteH = e ? Math.round(e.getBoundingClientRect().height) : 0;
  html.style.setProperty('--entete-h', mesures.enteteH + 'px');
}

export function initMesures() {
  mesurerEntete();
  mesurerBarres();
  mesures.pageH = document.documentElement.scrollHeight;
  mesures.vueH = window.innerHeight;

  const ro = new ResizeObserver(() => { mesurerEntete(); mesurerBarres(); emettre('mesures', mesures); });
  const entete = document.querySelector('[data-entete]');
  if (entete) ro.observe(entete);
  document.querySelectorAll('[data-barre-fixe]').forEach((b) => ro.observe(b));

  /* Hauteur de la page : FAQ dépliée, filtre, bandeau fermé, images et polices chargées. */
  const roPage = new ResizeObserver(() => {
    const h = document.documentElement.scrollHeight;
    if (enRafraichissement || Math.abs(h - mesures.pageH) < 2) return;
    mesures.pageH = h;
    rafraichir();
  });
  roPage.observe(document.body);

  window.addEventListener('resize', () => { mesures.vueH = window.innerHeight; }, { passive: true });
  if (document.fonts) document.fonts.ready.then(rafraichir);
  window.addEventListener('load', rafraichir, { once: true });

  /* Barre fixe du téléphone masquée sur les formulaires et le pied de page. */
  const barres = document.querySelectorAll('[data-barre-fixe]');
  const zones = document.querySelectorAll('footer, form, [data-masque-barre]');
  if (barres.length && zones.length) {
    const visibles = new Set();
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)));
      const masquer = visibles.size > 0;
      barres.forEach((b) => b.classList.toggle('barre-masquee', masquer));
    });
    zones.forEach((z) => io.observe(z));
  }
}
