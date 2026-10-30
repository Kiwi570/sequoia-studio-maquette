/* Ouverture de chaque page.
   - intro  : à chaque arrivée sur le site et à chaque rechargement, l'intro complète se joue.
              Moins de 3 s depuis le premier octet, attente comprise (l'intro est accélérée si l'attente
              l'a retardée). Une première action (clic, touche, molette, glissement) l'accélère,
              une seconde la passe. Défilement bloqué pendant (dès le premier affichage, par le style critique).
   - voile  : changement de page à l'intérieur du site : la page se prépare sous le voile,
              puis le voile se retire ; les animations d'arrivée démarrent à mesure que la page se découvre.
   - retour : retour arrière ou avant (pageshow ou navigation back_forward) : état final directement, sans intro.
   - section : rechargement dû au bouton du mode calme : état final, retour à la section.
   - calme, secours : état final directement.
   Aucune attente ne peut bloquer l'écran : en cas d'erreur, la page passe dans son état final. */
import { html, etat, emettre, stockage, prochaineImage, attendre } from './etat.js?v=1';
import { bloquerDefilement, debloquerDefilement, aller } from './defilement.js?v=1';
import { toutAfficher, demarrerApparitions } from './apparitions.js?v=1';
import { suivre, lacher, lacherTout } from './gouttiere.js?v=1';

const MAX_ATTENTE = 1500;
const BUDGET = 2900; /* ms depuis le premier octet jusqu'à la fin de l'intro */
let tlCourante = null;
let restauree = false;

function attendrePret(promesses = []) {
  const premiereImage = document.querySelector('main img[fetchpriority="high"]') || document.querySelector('[data-ouverture] img');
  const attentes = [
    document.fonts ? document.fonts.ready : null,
    premiereImage && premiereImage.decode ? premiereImage.decode() : null,
    ...promesses,
  ].filter(Boolean).map((p) => Promise.resolve(p).catch((err) => console.warn('[socle] attente en échec', err)));
  return Promise.race([Promise.all(attentes), attendre(MAX_ATTENTE)]);
}

function voile() { return document.querySelector('[data-voile]'); }

function leverVoile() {
  const v = voile();
  if (!v || etat.calme) { html.classList.add('voile-leve'); return Promise.resolve(); }
  const a = v.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
    { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
  return a.finished.catch(() => {}).then(() => { html.classList.add('voile-leve'); a.cancel(); });
}

function marquerPret(mode) {
  /* Sécurité : un élément data-anime="gsap" que le projet n'a jamais animé ne reste pas caché. */
  document.querySelectorAll('[data-anime="gsap"]').forEach((el) => { if (!el.style.opacity && !el.style.transform) el.classList.add('vu'); });
  etat.intro = mode;
  etat.pret = true;
  html.classList.add('pret', 'intro-finie');
  html.dataset.intro = mode;
  try { performance.mark('socle:pret'); } catch {}
  emettre('pret', { mode });
}

function allerAuHash() {
  if (!location.hash) return;
  let cible = null;
  try { cible = document.querySelector(decodeURIComponent(location.hash)); } catch {}
  if (cible) aller(cible, { instant: true });
}

/* Actions du visiteur pendant l'intro, écoutées dès le début de l'attente.
   Un geste continu (glissement, molette, touche maintenue) compte pour une seule action. */
function ecouterActions() {
  const ctl = { n: 0, premiere: 0, surAction: null };
  let derniereMolette = 0, toucheEnCours = false;
  const action = (e) => {
    if (e.type === 'keydown' && (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape'].includes(e.key) || e.repeat || e.ctrlKey || e.metaKey || e.altKey)) return;
    const defile = e.type === 'wheel' || e.type === 'touchmove' || (e.type === 'keydown' && [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key));
    if (e.cancelable && defile) e.preventDefault();
    const t = performance.now();
    if (e.type === 'wheel') { const suite = t - derniereMolette < 220; derniereMolette = t; if (suite) return; }
    if (e.type === 'touchmove') return; /* fait partie du toucher commencé */
    if (e.type === 'touchstart') { if (toucheEnCours) return; toucheEnCours = true; }
    if (e.type === 'pointerdown' && e.pointerType === 'touch') return; /* déjà compté par touchstart */
    ctl.n++;
    if (!ctl.premiere) ctl.premiere = t;
    ctl.surAction && ctl.surAction(ctl.n);
  };
  const fin = () => { toucheEnCours = false; };
  const types = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'touchmove'];
  types.forEach((ty) => window.addEventListener(ty, action, { passive: false, capture: true }));
  window.addEventListener('touchend', fin, { passive: true });
  ctl.arreter = () => {
    types.forEach((ty) => window.removeEventListener(ty, action, { capture: true }));
    window.removeEventListener('touchend', fin);
  };
  return ctl;
}

/* Le projet renvoie une timeline GSAP (ou un objet avec timeScale/progress, ou une promesse). */
function finDe(tl) {
  if (!tl) return Promise.resolve();
  if (typeof tl.then === 'function') return new Promise((r) => tl.then(() => r(), () => r()));
  if (typeof tl.progress === 'function') {
    return new Promise((r) => { const v = () => (tl.progress() >= 1 ? r() : requestAnimationFrame(v)); v(); });
  }
  return Promise.resolve();
}

async function jouerIntro(jouer, ctl) {
  window.scrollTo(0, 0);
  let tl = null;
  try { tl = jouer ? jouer() : null; } catch (err) { console.error('[socle] jouer', err); }
  tlCourante = tl;
  const pilotable = tl && typeof tl.timeScale === 'function' && typeof tl.progress === 'function';
  /* Budget : si l'attente a retardé l'intro, elle est jouée plus vite pour rester sous 3 s. */
  if (pilotable && typeof tl.duration === 'function') {
    const nav = performance.getEntriesByType('navigation')[0];
    const ecoule = performance.now() - (nav ? nav.responseStart : 0);
    const reste = Math.max(600, BUDGET - ecoule);
    if (tl.duration() * 1000 > reste) tl.timeScale((tl.duration() * 1000) / reste);
  }
  /* Les apparitions de la page démarrent pendant la fin de l'intro (quand le panneau se retire),
     pour qu'aucun vide n'apparaisse entre l'intro et le contenu. */
  let apparitions = 0;
  const lancerApparitions = () => { clearTimeout(apparitions); demarrerApparitions(); };
  if (pilotable && typeof tl.duration === 'function') apparitions = setTimeout(lancerApparitions, Math.max(0, (tl.duration() / tl.timeScale()) * 1000 - 900));
  const appliquer = (n) => {
    if (!pilotable) return;
    if (n === 1) tl.timeScale(Math.max(tl.timeScale(), 5));
    else tl.progress(1);
    lancerApparitions();
  };
  if (ctl.n) appliquer(Math.min(ctl.n, 2));
  ctl.surAction = (n) => (pilotable ? appliquer(n) : null);
  html.classList.add('intro-en-cours');
  /* Garde-fou : quoi qu'il arrive, l'intro se termine. */
  await Promise.race([finDe(tl), attendre(3500)]);
  if (pilotable && tl.progress() < 1) tl.progress(1);
  ctl.arreter();
  html.classList.remove('intro-en-cours');
  /* Intro passée par un geste : le défilement reste bloqué jusqu'à la fin de ce geste (doigt levé, molette arrêtée). */
  if (ctl.n && !restauree) {
    bloquerDefilement('fin-geste');
    await new Promise((ok) => {
      let t = 0;
      const fin = () => {
        clearTimeout(t); clearTimeout(maxi);
        window.removeEventListener('wheel', encore); window.removeEventListener('touchmove', encore); window.removeEventListener('touchend', leve);
        ok();
      };
      const encore = () => { clearTimeout(t); t = setTimeout(fin, 250); };
      const leve = () => { clearTimeout(t); t = setTimeout(fin, 60); };
      const maxi = setTimeout(fin, 1500);
      t = setTimeout(fin, 350);
      window.addEventListener('wheel', encore, { passive: true });
      window.addEventListener('touchmove', encore, { passive: true });
      window.addEventListener('touchend', leve, { passive: true });
    });
    debloquerDefilement('fin-geste');
  }
  debloquerDefilement('intro');
  tlCourante = null;
}

function etatFinal(fn) {
  toutAfficher();
  try { fn && fn(); } catch (err) { console.error('[socle] etatFinal', err); }
}

/**
 * @param {object} o
 * @param {() => any} [o.jouer]     intro complète (timeline GSAP de préférence, environ 2 s)
 * @param {() => void} [o.etatFinal] met les éléments animés par le projet dans leur état final
 * @param {() => void} [o.arrivee]  animations d'arrivée pendant que le voile se retire (facultatif)
 * @param {Promise[]} [o.pret]       attentes en plus (shaders, scènes) ; un échec ne bloque rien
 */
export async function ouvrir(o = {}) {
  const ss = stockage();
  let retourSection = null;
  try { retourSection = ss && ss.getItem('socle:calme-retour'); ss && ss.removeItem('socle:calme-retour'); } catch {}

  /* Quitter la page pendant l'intro : elle est terminée avant la mise en cache, pour revenir à l'état final. */
  window.addEventListener('pagehide', () => { if (tlCourante && typeof tlCourante.progress === 'function') tlCourante.progress(1); });
  /* Retour arrière ou avant depuis le cache du navigateur : jamais d'intro. */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    restauree = true;
    const v = voile();
    if (v) { v.getAnimations().forEach((a) => a.cancel()); v.style.visibility = ''; }
    html.classList.add('voile-leve');
    html.classList.remove('intro-en-cours');
    ['intro', 'voile', 'depart', 'menu', 'saut', 'fin-geste'].forEach(debloquerDefilement);
    lacherTout();
    emettre('retour');
    etatFinal(o.etatFinal);
    etat.arrivee = 'retour';
    marquerPret('retour');
  });

  let mode = etat.arrivee;
  if (html.classList.contains('secours')) mode = 'secours';
  else if (retourSection) mode = 'section';
  else if (etat.calme && mode !== 'retour') mode = 'calme';

  try {
    if (mode === 'secours' || mode === 'retour' || mode === 'calme' || mode === 'section') {
      etatFinal(o.etatFinal);
      html.classList.add('voile-leve');
      if (mode === 'section') {
        await prochaineImage();
        const el = document.getElementById(retourSection);
        if (el) aller(el, { instant: true });
      } else if (mode !== 'retour') allerAuHash();
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
      demarrerApparitions();
      marquerPret(mode);
      return;
    }

    if (mode === 'voile') {
      /* Défilement bloqué sous le voile (barre de défilement cachée, bande peinte à la couleur du voile). */
      bloquerDefilement('voile');
      suivre(voile());
      await attendrePret(o.pret);
      allerAuHash();
      await prochaineImage();
      const leve = leverVoile();
      /* Les animations d'arrivée démarrent quand la page commence à se découvrir. */
      await attendre(160);
      demarrerApparitions();
      try { o.arrivee && o.arrivee(); } catch (err) { console.error('[socle] arrivee', err); }
      await leve;
      debloquerDefilement('voile');
      lacher(voile());
      if (!restauree) marquerPret('voile');
      return;
    }

    /* intro : les actions du visiteur comptent dès l'attente (défilement déjà bloqué par le style critique). */
    bloquerDefilement('intro');
    const panneau = document.querySelector('[data-ouverture]');
    suivre(panneau);
    const ctl = ecouterActions();
    await attendrePret(o.pret);
    if (restauree) { ctl.arreter(); return; }
    await jouerIntro(o.jouer, ctl);
    if (restauree) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    allerAuHash();
    demarrerApparitions();
    marquerPret('jouee');
    lacher(panneau);
  } catch (err) {
    /* Jamais d'écran bloqué : état final. */
    console.error('[socle] ouverture', err);
    ['intro', 'voile', 'fin-geste'].forEach(debloquerDefilement);
    html.classList.remove('intro-en-cours');
    html.classList.add('voile-leve');
    etatFinal(o.etatFinal);
    demarrerApparitions();
    marquerPret('secours');
    lacherTout();
  }
}
