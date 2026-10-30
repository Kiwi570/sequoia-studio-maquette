/* État partagé du socle, lu aussi par l'audit (window.__socle). */
export const html = document.documentElement;

export const etat = {
  version: html.dataset.v || '',
  langue: (html.lang || 'fr').slice(0, 2),
  arrivee: html.dataset.arrivee || 'intro', // intro | voile | retour (posé par le script critique)
  calme: html.classList.contains('calme'),
  intro: 'attente', // attente | jouee | voile | retour | calme | secours | section
  pret: false,
  defilement: 'natif',
  bouclesActives: () => 0,
};
window.__socle = etat;

export function emettre(nom, detail) {
  window.dispatchEvent(new CustomEvent('socle:' + nom, { detail }));
}

export function quand(nom, fn) {
  window.addEventListener('socle:' + nom, (e) => fn(e.detail));
}

export function stockage(type = 'session') {
  try { return type === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
}

/* Chemin normalisé : sans .html, sans index, sans barre finale (cleanUrls de Vercel). */
export function chemin(url) {
  const u = typeof url === 'string' ? new URL(url, location.href) : url;
  let p = u.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p.length > 1) p = p.replace(/\/$/, '');
  return p || '/';
}

export const prochaineImage = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
export const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
