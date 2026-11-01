/* Curseur personnalisé, seulement avec une souris : un seul à l'écran, invisible jusqu'au premier mouvement,
   remplacé par le curseur natif dans les champs de saisie. Activé par l'attribut data-curseur sur <html>. */
import { html, etat } from './etat.js?v=2';

export function initCurseur() {
  if (!html.hasAttribute('data-curseur') || etat.calme) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (document.querySelector('.curseur')) return;
  const c = document.createElement('div');
  c.className = 'curseur';
  c.setAttribute('aria-hidden', 'true');
  c.setAttribute('data-audit-ignorer', '');
  document.body.appendChild(c);
  let x = 0, y = 0, cx = 0, cy = 0, raf = 0, dernier = 0, vu = false;
  const tick = (t) => {
    const dt = Math.min(0.05, dernier ? (t - dernier) / 1000 : 1 / 60);
    dernier = t;
    const k = 1 - Math.exp(-dt * 22);
    cx += (x - cx) * k; cy += (y - cy) * k;
    c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(tick) : (dernier = 0, 0);
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!vu) { vu = true; cx = x; cy = y; html.classList.add('curseur-actif'); }
    const champ = e.target.closest && e.target.closest('input, textarea, select, [contenteditable], iframe');
    c.classList.toggle('curseur-cache', !!champ);
    c.classList.toggle('curseur-lien', !!(e.target.closest && e.target.closest('a, button, [role="button"], label')));
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.add('curseur-cache'));
  document.addEventListener('pointerenter', () => c.classList.remove('curseur-cache'));
}
