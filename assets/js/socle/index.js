/* Socle commun à toutes les maquettes. Usage dans assets/js/site.js :

   import { demarrer } from './socle/index.js?v=2';
   demarrer({
     preparer() { ... },   // effets du projet : ScrollTrigger, SplitText, boucles (états de départ posés ici)
     jouer() { return gsap.timeline()... },   // intro complète, moins de 3 s
     etatFinal() { ... },  // état final des éléments animés par le projet (retour, calme, secours)
     arrivee() { ... },    // animations d'arrivée après le voile (facultatif)
     pret: [promesse],     // attentes en plus avant l'ouverture (shaders, scènes)
   });

   Ordre : mesures, défilement, en-tête et menu, mode calme, transitions, boucles, formulaires,
   puis préparation du projet, puis ouverture (intro, voile, retour, calme ou secours). */
import { html, etat } from './etat.js?v=2';
import { initMesures, rafraichir } from './mesures.js?v=2';
import { initDefilement } from './defilement.js?v=2';
import { initEntete } from './entete.js?v=2';
import { initCalme } from './calme.js?v=2';
import { initTransitions } from './transitions.js?v=2';
import { initBoucles } from './boucles.js?v=2';
import { initFormulaires } from './formulaires.js?v=2';
import { initLecture } from './lecture.js?v=2';
import { initCompteurs } from './compteurs.js?v=2';
import { initCurseur } from './curseur.js?v=2';
import { ouvrir } from './ouverture.js?v=2';

export { etat, rafraichir };
export { boucle } from './boucles.js?v=2';
export { aller, bloquerDefilement, debloquerDefilement } from './defilement.js?v=2';
export { allerAncre, partir } from './transitions.js?v=2';
export { quand, emettre } from './etat.js?v=2';
export { suivre, lacher } from './gouttiere.js?v=2';

export async function demarrer(o = {}) {
  /* Le JavaScript prend la main : le délai de secours ne se déclenchera plus. */
  if (!html.classList.contains('secours')) html.classList.add('demarre');
  const etapes = [initMesures, initDefilement, initEntete, initCalme, initTransitions, initBoucles,
    initFormulaires, initLecture, initCompteurs, initCurseur];
  etapes.forEach((f) => { try { f(); } catch (err) { console.error('[socle]', f.name, err); } });
  if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  try { o.preparer && o.preparer(); } catch (err) { console.error('[socle] preparer', err); }
  /* ScrollTrigger garde une boucle vide tant qu'il est actif : en mode calme, sans scène, on l'arrête. */
  if (etat.calme && window.ScrollTrigger && !window.ScrollTrigger.getAll().length) window.ScrollTrigger.disable();
  await ouvrir(o);
  return etat;
}
