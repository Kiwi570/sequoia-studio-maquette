/* Script critique : copié en ligne dans le head de chaque page par outils/generer.mjs,
   avant les feuilles de style. Il décide du mode d'arrivée avant le premier affichage :
   - intro  : arrivée sur le site depuis l'extérieur, ou rechargement
   - voile  : changement de page à l'intérieur du site (le voile couvre déjà l'écran)
   - retour : retour arrière ou avant, ou rechargement dû au bouton du mode calme
              (état final directement, sans intro) */
(function () {
  var d = document.documentElement, ss = null, ls = null;
  try { ss = window.sessionStorage; ls = window.localStorage; } catch (e) {}
  d.classList.add('js');

  var calme = false;
  try { calme = !!ls && ls.getItem('socle:calme') === 'oui'; } catch (e) {}
  if (!calme && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) calme = true;
  if (calme) d.classList.add('calme');

  var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var type = nav ? nav.type : 'navigate';
  var depart = null;
  try { depart = JSON.parse(ss.getItem('socle:depart') || 'null'); ss.removeItem('socle:depart'); } catch (e) {}
  if (depart && !(Date.now() - depart.t < 15000)) depart = null;

  var retourSection = false;
  try { retourSection = !!ss.getItem('socle:calme-retour'); } catch (e) {}
  /* Exception : le rechargement dû au bouton du mode calme revient à la section, sans intro. */
  var mode = type === 'back_forward' || retourSection ? 'retour' : type === 'reload' ? 'intro' : depart ? 'voile' : 'intro';
  d.setAttribute('data-arrivee', mode);
  if (mode === 'voile' && depart.couleur) d.style.setProperty('--voile-fond', depart.couleur);
  /* Au rechargement, l'intro repart du haut de la page. */
  if (type === 'reload' && 'scrollRestoration' in history) {
    if (!retourSection) history.scrollRestoration = 'manual';
  }

  /* Langue mémorisée : seulement à l'arrivée depuis l'extérieur. */
  try {
    var choisie = ls && ls.getItem('socle:langue');
    var langue = (d.lang || '').slice(0, 2);
    if (choisie && choisie !== langue && type === 'navigate' && !depart) {
      var alt = document.querySelector('link[rel="alternate"][hreflang="' + choisie + '"]');
      if (alt) location.replace(new URL(alt.href).pathname + location.search + location.hash);
    }
  } catch (e) {}

  /* Délai de secours : si le JavaScript du site n'a pas pris la main en 2 s,
     tout s'affiche dans son état final et rien ne sera rejoué ensuite. */
  setTimeout(function () { if (!d.classList.contains('demarre')) d.classList.add('secours'); }, 2000);
})();
