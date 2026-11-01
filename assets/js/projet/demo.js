/* Accueil, « Essayez avant d'accrocher » : l'œuvre posée à l'échelle sur le mur d'un salon (image calibrée : plafond à 2,50 m).
   Sur ordinateur : la section s'épingle et le défilement fait passer les formats puis les finitions ;
   partout : les boutons choisissent un état. Changement de taille animé par transform (FLIP), cotes en cm. */
import { etat } from '../socle/index.js?v=2';
import { $, $$ } from './outils.js?v=2';

export function initDemo() {
  const bloc = $('[data-demo]');
  if (!bloc) return;
  const oeuvre = $('[data-demo-oeuvre]', bloc), cadre = $('.cadre', oeuvre);
  const boutons = $$('[data-demo-etat]', bloc);
  const coteL = $('[data-demo-cote-l]', bloc), coteH = $('[data-demo-cote-h]', bloc);
  let courant = 0;
  const appliquer = (k, anime = true) => {
    if (k === courant && anime) return;
    const b = boutons[k];
    const avant = oeuvre.getBoundingClientRect();
    oeuvre.style.setProperty('--l', b.dataset.lt);
    oeuvre.style.setProperty('--h', b.dataset.ht);
    cadre.className = cadre.className.replace(/cadre--(toile|caisse-noire|caisse-blanche|fineart)/, `cadre--${b.dataset.finition}`);
    coteL.textContent = `${b.dataset.l} cm`; coteH.textContent = `${b.dataset.h} cm`;
    boutons.forEach((x, i) => x.setAttribute('aria-pressed', String(i === k)));
    courant = k;
    if (anime && !etat.calme && window.gsap) {
      const apres = oeuvre.getBoundingClientRect();
      const s = avant.width / Math.max(1, apres.width);
      window.gsap.fromTo(oeuvre, { scale: s }, { scale: 1, duration: 0.7, ease: 'power3.out', clearProps: 'transform' });
    }
  };
  boutons.forEach((b, k) => b.addEventListener('click', () => appliquer(k)));
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST || etat.calme) return;
  ST.matchMedia({
    '(min-width: 761px)': () => {
      const st = ST.create({
        trigger: bloc, start: 'top top', end: () => '+=' + window.innerHeight * 1.6, pin: true, anticipatePin: 1,
        onUpdate: (s) => { const k = Math.min(boutons.length - 1, Math.floor(s.progress * boutons.length * 0.999)); if (k !== courant) appliquer(k); },
      });
      return () => st.kill();
    },
  });
}
