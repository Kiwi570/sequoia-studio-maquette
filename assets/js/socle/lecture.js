/* Pages longues : barre de lecture [data-barre-lecture] et sommaire qui suit la lecture [data-sommaire].
   La barre ne lit que window.scrollY et la hauteur gardée : aucune mesure pendant le défilement. */
import { mesures } from './mesures.js?v=1';

export function initLecture() {
  const barre = document.querySelector('[data-barre-lecture]');
  if (barre) {
    let raf = 0;
    const maj = () => {
      raf = 0;
      const max = Math.max(1, mesures.pageH - window.innerHeight);
      barre.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(maj); }, { passive: true });
    maj();
  }
  const sommaire = document.querySelector('[data-sommaire]');
  if (sommaire) {
    const liens = new Map();
    sommaire.querySelectorAll('a[href^="#"]').forEach((a) => {
      const c = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (c) liens.set(c, a);
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const a = liens.get(e.target);
      if (e.isIntersecting) { sommaire.querySelectorAll('[aria-current]').forEach((x) => x.removeAttribute('aria-current')); a.setAttribute('aria-current', 'location'); }
    }), { rootMargin: '-30% 0px -60% 0px' });
    liens.forEach((_, c) => io.observe(c));
  }
}
