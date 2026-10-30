/* Transitions entre pages, toujours dans cet ordre :
   1. le voile couvre tout l'écran ; 2. la navigation a lieu (un indicateur dit à la page d'arrivée
   de démarrer couverte) ; 3. la nouvelle page se prépare sous le voile ; 4. le voile se retire.
   Les liens vers la page en cours font défiler sans recharger (chemins normalisés, cleanUrls).
   Les grands sauts dans une même page passent aussi sous le voile. */
import { html, etat, chemin, stockage, emettre } from './etat.js?v=1';
import { aller, bloquerDefilement, debloquerDefilement } from './defilement.js?v=1';
import { fermerMenu } from './entete.js?v=1';
import { suivre, lacher } from './gouttiere.js?v=1';

const prechargees = new Set();
let enDepart = false;

function voile() { return document.querySelector('[data-voile]'); }

function couvrir(duree = 450) {
  const v = voile();
  if (!v || etat.calme) return Promise.resolve();
  html.classList.remove('voile-leve');
  v.style.visibility = 'visible';
  const a = v.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
    { duration: duree, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
  return a.finished.catch(() => {});
}

function decouvrir(duree = 450) {
  const v = voile();
  if (!v || etat.calme) return Promise.resolve();
  const a = v.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
    { duration: duree, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
  return a.finished.catch(() => {}).then(() => {
    v.getAnimations().forEach((x) => x.cancel());
    v.style.visibility = '';
    html.classList.add('voile-leve');
  });
}

function lienInterne(a, e) {
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-sans-transition')) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return null;
  if (/\.(pdf|zip|jpe?g|png|webp|mp4|ics|vcf)$/i.test(url.pathname)) return null;
  return url;
}

export async function allerAncre(hash, { pousser = true } = {}) {
  let cible = null;
  try { cible = hash && hash !== '#' ? document.querySelector(decodeURIComponent(hash)) : null; } catch {}
  if (pousser) history.pushState(null, '', hash || location.pathname + location.search);
  const y = cible ? cible.getBoundingClientRect().top : -window.scrollY;
  if (!etat.calme && Math.abs(y) > window.innerHeight * 3) {
    bloquerDefilement('saut');
    suivre(voile());
    await couvrir(320);
    aller(cible || 0, { instant: true });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await decouvrir(380);
    debloquerDefilement('saut');
    lacher(voile());
  } else {
    aller(cible || 0);
  }
  if (cible) {
    if (!cible.hasAttribute('tabindex') && !/^(a|button|input|select|textarea)$/i.test(cible.tagName)) cible.setAttribute('tabindex', '-1');
    cible.focus({ preventScroll: true });
  }
}

export async function partir(url, libelle) {
  if (enDepart) return;
  enDepart = true;
  fermerMenu({ rendreFocus: false });
  const ss = stockage();
  const couleur = getComputedStyle(html).getPropertyValue('--voile-fond').trim();
  try { ss && ss.setItem('socle:depart', JSON.stringify({ t: Date.now(), couleur })); } catch {}
  const lib = document.querySelector('[data-voile-libelle]');
  if (lib && libelle) lib.textContent = libelle;
  emettre('depart', { url: url.href });
  if (etat.calme) { location.href = url.href; return; }
  /* Défilement bloqué pendant le départ : la barre de défilement disparaît et sa bande suit le voile. */
  bloquerDefilement('depart');
  suivre(voile());
  /* Garde-fou : la navigation part même si l'animation ne se termine pas. */
  const secours = setTimeout(() => (location.href = url.href), 900);
  await couvrir();
  clearTimeout(secours);
  location.href = url.href;
}

export function initTransitions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    const url = lienInterne(a, e);
    if (!url) return;
    /* Langue choisie : mémorisée pour les prochaines arrivées sur le site. */
    if (a.dataset.langue) { try { stockage('local').setItem('socle:langue', a.dataset.langue); } catch {} }
    if (chemin(url) === chemin(location) && url.search === location.search) {
      e.preventDefault();
      fermerMenu({ rendreFocus: false });
      allerAncre(url.hash);
      return;
    }
    e.preventDefault();
    partir(url, a.dataset.libelle || a.textContent.trim().slice(0, 40));
  });

  window.addEventListener('popstate', () => { if (location.hash) allerAncre(location.hash, { pousser: false }); });

  /* Préchargement de la page suivante à l'approche du lien. */
  const precharger = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const url = lienInterne(a, { button: 0 });
    if (!url || chemin(url) === chemin(location)) return;
    const cle = url.origin + url.pathname;
    if (prechargees.has(cle)) return;
    prechargees.add(cle);
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = cle;
    document.head.appendChild(l);
  };
  document.addEventListener('pointerover', precharger, { passive: true });
  document.addEventListener('focusin', precharger);
  document.addEventListener('touchstart', precharger, { passive: true });

  window.addEventListener('pageshow', (e) => { if (e.persisted) enDepart = false; });
}
