/* Mode calme : actif tout seul quand l'appareil demande de réduire les animations,
   ou choisi avec un bouton [data-calme-bascule] (pied de page et menu, ou en-tête pour les spectacles).
   Après le rechargement, la page revient à la section où l'on était. */
import { html, etat, stockage } from './etat.js?v=1';

let sectionCourante = null;

/* Section qui traverse le milieu de l'écran, suivie en continu (le menu ouvert ne la fausse pas). */
function suivreSection() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) sectionCourante = e.target.id; }),
    { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('main section[id], main [data-section][id], footer[id]').forEach((s) => io.observe(s));
}

export function initCalme() {
  suivreSection();
  const ls = stockage('local');
  const choisi = ls && ls.getItem('socle:calme') === 'oui';
  const systeme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-calme-bascule]').forEach((b) => {
    b.setAttribute('aria-pressed', String(etat.calme));
    const lib = b.querySelector('[data-libelle-bouton]') || b;
    lib.textContent = etat.calme ? (b.dataset.libelleRetablir || 'Rétablir les animations') : (b.dataset.libelleReduire || 'Réduire les animations');
    /* Si c'est le réglage de l'appareil qui impose le calme, le bouton le dit et ne peut pas l'annuler. */
    if (systeme) {
      b.disabled = true;
      lib.textContent = b.dataset.libelleSysteme || 'Animations réduites par le réglage de votre appareil';
    }
    b.addEventListener('click', () => {
      const id = window.scrollY > 10 ? sectionCourante : null;
      try {
        if (id) stockage().setItem('socle:calme-retour', id);
        ls.setItem('socle:calme', etat.calme ? 'non' : 'oui');
      } catch {}
      location.reload();
    });
  });
  if (etat.calme) html.classList.add('calme');
}
