/* Panier simulé : une seule source (localStorage), identique dans tous les onglets (événement storage),
   donnée abîmée nettoyée sans bloquer le site. Tiroir accessible (Échap, focus gardé puis rendu),
   page Commande (quantités, totaux), panier vidé après la commande simulée. */
import { bloquerDefilement, debloquerDefilement, suivre, lacher } from '../socle/index.js?v=1';
import { $, $$, euros, annoncer, garderFocus } from './outils.js?v=1';

const CLE = 'sequoia:panier';
/* Libellés écrits dans la page (gabarit commun), jamais dans le script. */
const lib = (k) => (document.querySelector('[data-panier-modele]')?.dataset[k] || '');
let lignes = [];
const ecouteurs = new Set();

function valide(l) {
  return l && typeof l.slug === 'string' && l.format && typeof l.format.id === 'string' && l.finition && typeof l.finition.id === 'string'
    && Number.isFinite(l.prix) && l.prix > 0 && Number.isInteger(l.quantite) && l.quantite >= 1 && l.quantite <= 9;
}

export function lire() {
  let brut = null;
  try { brut = localStorage.getItem(CLE); } catch { return []; }
  if (!brut) return [];
  try {
    const d = JSON.parse(brut);
    const liste = Array.isArray(d && d.lignes) ? d.lignes.filter(valide) : null;
    if (!liste) throw new Error('panier illisible');
    return liste;
  } catch {
    /* Donnée abîmée : nettoyée, le site continue. */
    try { localStorage.removeItem(CLE); } catch {}
    return [];
  }
}

function ecrire() {
  try { localStorage.setItem(CLE, JSON.stringify({ v: 1, lignes })); } catch {}
  ecouteurs.forEach((f) => f(lignes));
}

export const total = () => lignes.reduce((n, l) => n + l.prix * l.quantite, 0);
export const nombre = () => lignes.reduce((n, l) => n + l.quantite, 0);
export const surChangement = (f) => ecouteurs.add(f);

export function ajouter(l) {
  lignes = lire();
  const i = lignes.findIndex((x) => x.slug === l.slug && x.format.id === l.format.id && x.finition.id === l.finition.id);
  if (i >= 0) lignes[i].quantite = Math.min(9, lignes[i].quantite + 1);
  else lignes.push({ ...l, quantite: 1 });
  ecrire();
  annoncer(lib('ajoute') + l.titre);
}
export function retirer(i) { const l = lignes[i]; lignes.splice(i, 1); ecrire(); if (l) annoncer(lib('retire') + l.titre); }
export function quantite(i, q) { if (lignes[i]) { lignes[i].quantite = Math.max(1, Math.min(9, q)); ecrire(); } }
export function vider() { lignes = []; ecrire(); }

const detail = (l) => `${l.format.l} × ${l.format.h} cm · ${l.finition.court}`;

function rendreListe(liste, modele, { quantites = false } = {}) {
  liste.replaceChildren();
  lignes.forEach((l, i) => {
    const li = modele.content.firstElementChild.cloneNode(true);
    $$('[data-ligne-lien]', li).forEach((a) => { a.href = l.url; a.dataset.libelle = l.titre; if (!a.querySelector('img')) a.textContent = l.titre; });
    const img = $('img', li); if (img) img.src = l.image;
    const titre = $('.commande-ligne-titre a, .tiroir-ligne-titre a', li);
    if (titre) titre.textContent = l.titre;
    $('[data-ligne-detail]', li).textContent = `${l.artiste} · ${detail(l)}`;
    $('[data-ligne-prix]', li).textContent = euros(l.prix * l.quantite);
    const q = $('[data-ligne-quantite-texte]', li); if (q) q.textContent = `× ${l.quantite}`;
    const sel = $('[data-ligne-quantite]', li);
    if (sel && quantites) { sel.value = String(l.quantite); sel.addEventListener('change', () => quantite(i, parseInt(sel.value, 10))); sel.setAttribute('aria-label', `${lib('quantite')} : ${l.titre}`); }
    $('[data-ligne-retirer]', li).addEventListener('click', () => retirer(i));
    $('[data-ligne-retirer]', li).setAttribute('aria-label', `${lib('retirer')} ${l.titre}`);
    liste.appendChild(li);
  });
}

function majEntete() {
  const n = nombre();
  $$('[data-panier-nombre]').forEach((e) => { e.textContent = n ? String(n) : ''; });
}

/* ---------- Tiroir ---------- */
let tiroir, ouvert = false, retourFocus = null;

export function ouvrirTiroir() {
  if (!tiroir || ouvert) return;
  ouvert = true;
  retourFocus = document.activeElement;
  tiroir.hidden = false;
  bloquerDefilement('panier');
  suivre(tiroir);
  requestAnimationFrame(() => requestAnimationFrame(() => tiroir.classList.add('est-ouvert')));
  setTimeout(() => $('[data-tiroir-fermer].bouton-rond', tiroir)?.focus({ preventScroll: true }), 60);
}
export function fermerTiroir() {
  if (!tiroir || !ouvert) return;
  ouvert = false;
  tiroir.classList.remove('est-ouvert');
  setTimeout(() => { if (!ouvert) { tiroir.hidden = true; debloquerDefilement('panier'); lacher(tiroir); } }, 420);
  if (retourFocus && retourFocus.focus) retourFocus.focus({ preventScroll: true });
}

function rendreTiroir() {
  const liste = $('[data-panier-liste]');
  const modele = $('[data-panier-modele]');
  if (!liste || !modele) return;
  rendreListe(liste, modele);
  const vide = !lignes.length;
  $('[data-panier-vide]').hidden = !vide;
  $('[data-panier-commander]').toggleAttribute('hidden', vide);
  $('[data-panier-total]').textContent = euros(total());
}

/* ---------- Page Commande ---------- */
function rendreCommande() {
  const liste = $('[data-commande-liste]');
  if (!liste) return;
  rendreListe(liste, $('[data-commande-ligne-modele]'), { quantites: true });
  $('[data-commande-vide]').hidden = !!lignes.length;
  $('[data-commande-sous-total]').textContent = euros(total());
  $('[data-commande-total]').textContent = euros(total());
  const payer = $('[data-commande-payer]');
  const envoye = $('[data-message-envoi]');
  if (payer && !(envoye && !envoye.hidden)) payer.disabled = !lignes.length;
}

export function initPanier() {
  lignes = lire();
  tiroir = $('[data-tiroir]');
  const tout = () => { majEntete(); rendreTiroir(); rendreCommande(); };
  surChangement(tout);
  tout();
  /* Même panier dans tous les onglets. */
  window.addEventListener('storage', (e) => { if (e.key === CLE || e.key === null) { lignes = lire(); tout(); } });
  /* Le bouton Panier ouvre le tiroir (sur la page Commande, il garde son lien). */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-panier-bouton]');
    if (b && document.documentElement.dataset.page !== 'commande') { e.preventDefault(); e.stopPropagation(); ouvrirTiroir(); }
    if (e.target.closest('[data-tiroir-fermer]')) fermerTiroir();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!ouvert) return;
    if (e.key === 'Escape') { e.preventDefault(); fermerTiroir(); }
    else garderFocus($('.tiroir-boite', tiroir), e);
  });
  /* Commande simulée : le message s'affiche (socle), le panier est vidé. */
  const msg = $('[data-commande-form] [data-message-envoi]');
  if (msg) new MutationObserver(() => { if (!msg.hidden && lignes.length) vider(); }).observe(msg, { attributes: true, attributeFilter: ['hidden'] });
}
