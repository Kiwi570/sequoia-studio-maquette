/* Sequoia Studio : effets du projet. Le socle gère l'ouverture, les transitions, l'en-tête, le menu, le mode calme,
   les boucles et les mesures ; ce fichier branche ce qui est propre à la galerie (projecteur, salles, univers,
   démonstration à l'échelle, configurateur, panier, essai chez vous, certificat, recherche). Chaque module ne fait
   rien si sa section n'est pas sur la page ; une erreur dans l'un n'empêche pas les autres. */
import { demarrer } from './socle/index.js?v=2';
import { initScenes, initFondTeinte } from './projet/scene.js?v=2';
import { jouer, arrivee, etatFinal, titres } from './projet/intro.js?v=2';
import { initPanier } from './projet/panier.js?v=2';
import { initFiche } from './projet/fiche.js?v=2';
import { initGalerie, initCartes } from './projet/galerie.js?v=2';
import { initChezVous } from './projet/chezvous.js?v=2';
import { initSalles } from './projet/salles.js?v=2';
import { initUnivers } from './projet/univers.js?v=2';
import { initDemo } from './projet/demo.js?v=2';
import { initVisibles, initEclate, initReflets, initNfc, initMagnetiques, initJournal, initRecherche, rechercheGalerie } from './projet/effets.js?v=2';

const modules = [initScenes, initFondTeinte, titres, initPanier, initRecherche, rechercheGalerie, initFiche, initGalerie,
  () => { if (!document.querySelector('[data-mur]')) initCartes(); }, initChezVous, initSalles, initUnivers, initDemo,
  initEclate, initVisibles, initReflets, initNfc, initMagnetiques, initJournal];

demarrer({
  preparer() {
    modules.forEach((f) => { try { f(); } catch (err) { console.error('[sequoia]', f.name || 'module', err); } });
  },
  jouer,
  etatFinal,
  arrivee,
});
