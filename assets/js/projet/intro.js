/* Intro et arrivées.
   Intro (environ 2 s) : nuit complète, le séquoia luit ; le panneau s'efface, un projecteur s'allume et découvre
   l'œuvre (le faisceau s'ouvre) ; le titre monte ligne à ligne ; le reste du premier écran se pose.
   Arrivée par le voile : même mouvement, plus court. État final : tout en place, faisceau ouvert.
   Les titres de section (data-titre-anime) montent ligne à ligne en entrant dans l'écran (SplitText). */
import { etat } from '../socle/index.js?v=2';
import { $, $$ } from './outils.js?v=2';
import { echelleFaisceau } from './scene.js?v=2';

const gsap = () => window.gsap;
/* Lignes du titre en place : les masques ne rognent plus rien. */
const poserLignes = () => document.documentElement.classList.add('lignes-posees');

function premierEcran() {
  const s = $('main > section, main > [data-scene]') || $('main');
  const tous = $$('[data-anime="gsap"]', s);
  return {
    s,
    oeuvre: tous.filter((e) => e.matches('[data-scene-oeuvre]')),
    lignes: tous.filter((e) => e.matches('.ligne, .fiche-titre, .article-h1, .legal-tete h1')),
    cases: tous.filter((e) => e.matches('.mur-case')),
    autres: tous.filter((e) => !e.matches('[data-scene-oeuvre], .ligne, .fiche-titre, .article-h1, .legal-tete h1, .mur-case')),
  };
}

/* Intro complète : timeline GSAP pilotée par le socle (accélérée, passée, bornée à 3 s). */
export function jouer() {
  const g = gsap();
  if (!g) return null;
  const p = premierEcran();
  const panneau = $('[data-ouverture]');
  const logo = $('.ouverture-logo'), nom = $('.ouverture-nom'), ligne = $('.ouverture-ligne');
  const faisceau = { v: 0.08 };
  echelleFaisceau(faisceau.v);
  const tl = g.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo(logo, { scale: 0.94, opacity: 1 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
    .fromTo([nom, ligne], { y: 0, opacity: 1 }, { y: -6, opacity: 0, duration: 0.3, stagger: 0.04, ease: 'power2.in' }, 0.32)
    .fromTo(panneau, { opacity: 1 }, { opacity: 0, duration: 0.42, ease: 'power2.inOut' }, 0.5)
    .fromTo(faisceau, { v: 0.08 }, { v: 1, duration: 1.05, ease: 'power2.out', onUpdate: () => echelleFaisceau(faisceau.v) }, 0.62);
  if (p.oeuvre.length) tl.fromTo(p.oeuvre, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.85 }, 0.7);
  if (p.cases.length) tl.fromTo(p.cases, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: { each: 0.05, from: 'random' } }, 0.7);
  if (p.lignes.length) tl.fromTo(p.lignes, { yPercent: 108, opacity: 1 }, { yPercent: 0, opacity: 1, duration: 0.75, stagger: 0.08 }, 0.85);
  if (p.autres.length) tl.fromTo(p.autres, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.05 }, 1.1);
  tl.set(panneau, { clearProps: 'opacity' });
  tl.call(poserLignes);
  return tl;
}

/* Arrivée par un lien interne : le voile se retire et le premier écran se met en place. */
export function arrivee() {
  const g = gsap();
  if (!g) return;
  const p = premierEcran();
  const faisceau = { v: 0.3 };
  echelleFaisceau(faisceau.v);
  g.to(faisceau, { v: 1, duration: 0.9, ease: 'power2.out', onUpdate: () => echelleFaisceau(faisceau.v) });
  if (p.oeuvre.length) g.fromTo(p.oeuvre, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 });
  if (p.cases.length) g.fromTo(p.cases, { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: { each: 0.03, from: 'random' }, delay: 0.1 });
  if (p.lignes.length) g.fromTo(p.lignes, { yPercent: 108, opacity: 1 }, { yPercent: 0, opacity: 1, duration: 0.75, stagger: 0.08, ease: 'power3.out', delay: 0.15, onComplete: poserLignes });
  else poserLignes();
  if (p.autres.length) g.fromTo(p.autres, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: 'power3.out', delay: 0.35 });
}

export function etatFinal() {
  echelleFaisceau(1);
  poserLignes();
  const g = gsap();
  const p = premierEcran();
  const els = [...p.oeuvre, ...p.cases, ...p.lignes, ...p.autres];
  if (g) g.set(els, { clearProps: 'transform,opacity' });
  els.forEach((e) => e.classList.add('vu'));
  $$('[data-titre-anime]').forEach((t) => t.classList.add('titre-pret'));
}

/* Titres de section : lignes masquées qui montent à l'entrée dans l'écran. Découpés après le chargement
   des polices (sinon les lignes changent), redécoupés au redimensionnement. */
export function titres() {
  const g = gsap();
  const liste = $$('[data-titre-anime]');
  const montrer = () => liste.forEach((t) => t.classList.add('titre-pret'));
  if (!g || !window.SplitText || etat.calme || etat.arrivee === 'retour') { montrer(); return; }
  /* Déclenché par IntersectionObserver (et non ScrollTrigger) : toujours juste, même quand les épinglages
     ou les images changent la page plus haut. */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const tw = e.target.__montee; if (tw) tw.play();
  }), { rootMargin: '0px 0px -10% 0px' });
  const lancer = () => {
    liste.forEach((t) => {
      try {
        /* Découpé une fois ; à la fin de la montée, le découpage est retiré (aucun masque ne reste pour rogner le texte). */
        /* Chaque ligne se découvre de bas en haut (clip-path) en montant de quelques pixels : aucune ligne n'est
           déplacée loin de sa place, donc jamais sur le texte qui suit, même pendant l'animation. */
        const sp = window.SplitText.create(t, { type: 'lines', linesClass: 'split-ligne' });
        t.classList.add('titre-pret');
        t.__montee = g.fromTo(sp.lines, { y: 10, clipPath: 'inset(0% 0% 100% 0%)' }, { y: 0, clipPath: 'inset(-20% -5% -25% -5%)', duration: 0.9, stagger: 0.08, ease: 'power3.out', paused: true, onComplete: () => sp.revert() });
        io.observe(t);
      } catch (err) { console.warn(err); t.classList.add('titre-pret'); }
    });
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(lancer, () => montrer());
  /* Secours : jamais de titre caché. */
  setTimeout(montrer, 2600);
}
