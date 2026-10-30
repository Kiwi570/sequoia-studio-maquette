/* Salles horizontales épinglées (accueil : sélection du moment ; artistes : une salle par artiste).
   Sur ordinateur et tablette : la salle s'épingle, la piste glisse à l'horizontale au défilement, barre de progression,
   compteur, l'œuvre au centre s'éclaire et teinte le fond. Téléphone, mode calme, sans JavaScript : la piste défile
   à l'horizontale au doigt ou au clavier (tabindex, rôle region) ; rien n'est inaccessible. */
import { etat } from '../socle/index.js?v=1';
import { $, $$ } from './outils.js?v=1';

export function initSalles() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const salles = $$('[data-salle], [data-artiste-salle]');
  if (!salles.length) return;
  salles.forEach((salle) => {
    const piste = $('.piste', salle);
    const oeuvres = $$(':scope > article', piste);
    const barre = $('.salle-progres-barre span', salle);
    const compteur = $('[data-salle-compteur]', salle);
    const teinte = (i) => {
      const o = oeuvres[i]; if (!o) return;
      oeuvres.forEach((x, k) => x.classList.toggle('est-eclairee', k === i));
      if (compteur) compteur.textContent = `${i + 1} / ${oeuvres.length}`;
      const c = o.style.getPropertyValue('--nuit').trim(); if (c) document.body.style.backgroundColor = c;
    };
    teinte(0);
    if (!gsap || !ST || etat.calme) return;
    ST.matchMedia({
      '(min-width: 761px)': () => {
        /* Épinglée, la piste ne défile plus d'elle-même : elle sort de la tabulation. */
        piste.removeAttribute('tabindex');
        const distance = () => Math.max(0, piste.scrollWidth - window.innerWidth);
        let courant = -1;
        const tl = gsap.fromTo(piste, { x: 0 }, {
          x: () => -distance(), ease: 'none',
          scrollTrigger: {
            trigger: salle, start: 'top top', end: () => '+=' + Math.max(distance(), window.innerHeight * 0.6), pin: true, anticipatePin: 1, scrub: 0.7, invalidateOnRefresh: true,
            onUpdate: (s) => {
              if (barre) barre.style.transform = `scaleX(${s.progress.toFixed(4)})`;
              const i = Math.min(oeuvres.length - 1, Math.round(s.progress * (oeuvres.length - 1)));
              if (i !== courant) { courant = i; teinte(i); }
            },
          },
        });
        return () => { piste.setAttribute('tabindex', '0'); tl.scrollTrigger && tl.scrollTrigger.kill(); };
      },
    });
  });
}
