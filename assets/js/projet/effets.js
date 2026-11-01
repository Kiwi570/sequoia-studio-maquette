/* Effets propres à Sequoia Studio : vue éclatée de la caisse américaine (au défilement), anneau d'édition,
   nuancier, courbe d'absorption, fil de la double étiquette, séquoia du pied de page qui pousse, reflet
   holographique du certificat qui suit la lumière, démonstration NFC, boutons magnétiques, thèmes du journal,
   recherche dans l'en-tête. Tout est coupé en mode calme (état final directement). */
import { etat, bloquerDefilement, debloquerDefilement, suivre, lacher, partir } from '../socle/index.js?v=2';
import { $, $$, souris, mots, garderFocus, euros } from './outils.js?v=2';

/* Ajoute une classe quand l'élément entre dans l'écran (une seule fois). */
function quandVisible(els, classe = 'vu', marge = '0px 0px -12% 0px') {
  if (!els.length) return;
  if (etat.calme || etat.arrivee === 'retour' || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add(classe)); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add(classe); io.unobserve(e.target); } }), { rootMargin: marge });
  els.forEach((e) => io.observe(e));
}

export function initVisibles() {
  quandVisible($$('[data-anneau], [data-courbe], .pied-sequoia'));
  quandVisible($$('[data-double]'), 'vu-fil', '0px 0px -30% 0px');
}

/* Vue éclatée : les couches se séparent quand la section traverse l'écran (scrub, transform uniquement). */
export function initEclate() {
  const gsap = window.gsap, ST = window.ScrollTrigger;
  $$('[data-eclate]').forEach((e) => {
    const couches = $$('.eclate-couche', e);
    const legendes = $$('[data-eclate-legendes] li', e.closest('section'));
    const Z = [-60, -10, 30, 80];
    if (!gsap || !ST || etat.calme) { couches.forEach((c, i) => { c.style.transform = `translateZ(${Z[i]}px)`; }); return; }
    const tl = gsap.timeline({ scrollTrigger: { trigger: e, start: 'top 85%', end: 'center 45%', scrub: 0.6 } });
    couches.forEach((c, i) => tl.fromTo(c, { z: 0 }, { z: Z[i], ease: 'none' }, 0));
    tl.fromTo(e.querySelector('.eclate-pile'), { rotateZ: -26 }, { rotateZ: -36, ease: 'none' }, 0);
    legendes.forEach((l, i) => ST.create({ trigger: e, start: `top ${70 - i * 8}%`, onEnter: () => l.classList.add('est-active'), onLeaveBack: () => l.classList.remove('est-active') }));
  });
}

/* Reflet holographique : il suit la lumière (souris), ou passe lentement sur écran tactile. */
export function initReflets() {
  const certs = $$('[data-certificat]');
  if (!certs.length || etat.calme) return;
  certs.forEach((c) => {
    const reflet = $('.certificat-reflet', c);
    if (souris()) {
      let r = null;
      c.addEventListener('pointerenter', () => { r = c.getBoundingClientRect(); });
      c.addEventListener('pointermove', (e) => { if (r) reflet.style.transform = `translate3d(${(((e.clientX - r.left) / r.width) * 60 - 30).toFixed(1)}%, 0, 0)`; });
      c.addEventListener('pointerleave', () => { r = null; });
    } else if (window.gsap) {
      window.gsap.fromTo(reflet, { xPercent: -30 }, { xPercent: 30, duration: 2.6, ease: 'sine.inOut', repeat: 3, yoyo: true, scrollTrigger: { trigger: c, start: 'top 80%', toggleActions: 'play none none none' } });
    }
  });
}

/* Démonstration NFC (illustrative) : le téléphone s'approche, ondes, trois étapes, validation. */
export function initNfc() {
  const demo = $('[data-demo-nfc]');
  if (!demo) return;
  const bouton = $('[data-demo-nfc-bouton]', demo), etatTxt = $('[data-demo-nfc-etat]', demo);
  const etapes = $$('[data-demo-nfc-etapes] li', demo);
  const initial = bouton.textContent;
  let fait = false;
  bouton.addEventListener('click', () => {
    if (bouton.disabled) return;
    if (fait) { fait = false; demo.classList.remove('approche', 'lit'); etapes.forEach((e) => e.classList.remove('est-faite')); etatTxt.textContent = initial; bouton.textContent = initial; return; }
    bouton.disabled = true;
    demo.classList.add('approche');
    const d = etat.calme ? 0 : 1;
    setTimeout(() => demo.classList.add('lit'), 700 * d);
    etapes.forEach((e, i) => setTimeout(() => { e.classList.add('est-faite'); etatTxt.textContent = e.textContent; }, (900 + i * 650) * d));
    setTimeout(() => { fait = true; bouton.disabled = false; bouton.textContent = bouton.dataset.libelleRecommencer; }, (900 + etapes.length * 650) * d);
  });
}

/* Boutons magnétiques (souris seulement). */
export function initMagnetiques() {
  if (!souris() || etat.calme) return;
  $$('[data-magnetique]').forEach((b) => {
    let r = null;
    b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
    b.addEventListener('pointermove', (e) => { if (!r) return; const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3; b.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; });
    b.addEventListener('pointerleave', () => { r = null; b.style.transform = ''; });
  });
}

/* Journal : thèmes filtrables, gardés dans l'adresse. */
export function initJournal() {
  const form = $('[data-themes]');
  if (!form) return;
  const cartes = $$('[data-article]'), vide = $('[data-journal-vide]');
  const appliquer = (ecrire) => {
    const t = ($('input[name="theme"]:checked', form) || {}).value || '';
    let n = 0;
    cartes.forEach((c) => { const ok = !t || c.dataset.theme === t; c.classList.toggle('est-masquee', !ok); if (ok) n++; });
    vide.hidden = n > 0;
    if (ecrire) { const u = new URL(location.href); t ? u.searchParams.set('theme', t) : u.searchParams.delete('theme'); history.replaceState(history.state, '', u); }
  };
  const p = new URLSearchParams(location.search).get('theme');
  const r = p && $(`input[name="theme"][value="${CSS.escape(p)}"]`, form); if (r) r.checked = true;
  appliquer(false);
  form.addEventListener('change', () => appliquer(true));
}

/* Recherche dans l'en-tête : fenêtre plein écran, résultats en direct (titre, artiste, sujet, couleur),
   accents, majuscules et pluriels ignorés ; Entrée ouvre la galerie filtrée. */
export function initRecherche() {
  const fen = $('[data-recherche]');
  if (!fen) return;
  const champ = $('#recherche-champ', fen), res = $('[data-recherche-resultats]', fen), statut = $('[data-recherche-statut]', fen);
  let catalogue = null, ouvert = false, retour = null;
  const charger = () => catalogue || (catalogue = fetch(`/assets/donnees/catalogue.json?v=${document.documentElement.dataset.v}`)
    .then((r) => r.json()).then((l) => l.map((o) => ({ ...o, recherche: ' ' + mots(o.recherche).join(' ') }))).catch(() => { catalogue = null; return []; }));
  const ouvrir = (e) => {
    if (e) e.preventDefault();
    if (ouvert) return;
    ouvert = true; retour = document.activeElement;
    fen.hidden = false; bloquerDefilement('recherche'); suivre(fen);
    charger();
    setTimeout(() => champ.focus({ preventScroll: true }), 30);
  };
  const fermer = () => { if (!ouvert) return; ouvert = false; fen.hidden = true; debloquerDefilement('recherche'); lacher(fen); if (retour && retour.focus) retour.focus({ preventScroll: true }); };
  /* Avec JavaScript, le lien de recherche de l'en-tête devient un bouton qui ouvre la fenêtre (sans JavaScript,
     il mène au champ de recherche de la galerie). */
  if (document.documentElement.dataset.page !== 'galerie') {
    $$('[data-recherche-bouton]').forEach((b) => {
      b.dataset.href = b.getAttribute('href'); b.removeAttribute('href');
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-haspopup', 'dialog');
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') ouvrir(e); });
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-recherche-bouton]');
    if (b && !(document.documentElement.dataset.page === 'galerie')) { e.stopPropagation(); ouvrir(e); }
    if (e.target.closest('[data-recherche-fermer]')) fermer();
  }, true);
  document.addEventListener('keydown', (e) => { if (!ouvert) return; if (e.key === 'Escape') { e.preventDefault(); fermer(); } else garderFocus(fen, e); });
  /* Entrée : la galerie s'ouvre directement sur les œuvres trouvées. */
  const formRech = champ.closest('form');
  if (formRech) formRech.addEventListener('submit', (e) => { const q = champ.value.trim(); if (!q) return; e.preventDefault(); fermer(); partir(new URL(`/galerie?q=${encodeURIComponent(q)}#oeuvres`, location.href), statut.dataset.galerie || ''); });
  const modele = statut.dataset;
  let attente = 0;
  champ.addEventListener('input', () => {
    clearTimeout(attente);
    attente = setTimeout(async () => {
      const q = mots(champ.value);
      const liste = await charger();
      res.replaceChildren();
      if (!q.length) { statut.textContent = ''; return; }
      const trouves = liste.filter((o) => { const t = o.recherche; return q.every((m) => t.includes(m)); });
      statut.textContent = trouves.length ? (modele.resultats || '{n}').replace('{n}', trouves.length) : (modele.aucun || '');
      trouves.slice(0, 12).forEach((o) => {
        const li = document.createElement('li');
        const a = document.createElement('a'); a.href = o.url; a.dataset.libelle = o.titre;
        const im = document.createElement('img'); im.src = `/assets/images/${o.image}`; im.alt = ''; im.width = 64; im.height = 64; im.loading = 'lazy';
        const d = document.createElement('div');
        const s = document.createElement('strong'); s.textContent = o.titre;
        const sp = document.createElement('span'); sp.textContent = `${o.artiste} · ${o.style} · ${modele.des || 'dès'} ${euros(o.des)}`;
        d.append(s, sp); a.append(im, d); li.append(a); res.append(li);
      });
      if (trouves.length) { const li = document.createElement('li'); li.className = 'recherche-tout'; const a = document.createElement('a'); a.href = `/galerie?q=${encodeURIComponent(champ.value.trim())}#oeuvres`; a.textContent = modele.tout || ''; a.dataset.libelle = modele.galerie || ''; li.append(a); res.append(li); }
    }, 120);
  });
}

/* Sur la page Galerie, le bouton de recherche de l'en-tête va au champ de la galerie. */
export function rechercheGalerie() {
  if (document.documentElement.dataset.page !== 'galerie') return;
  $$('[data-recherche-bouton]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const champ = $('#filtre-q');
    champ.scrollIntoView({ block: 'center', behavior: etat.calme ? 'auto' : 'smooth' });
    setTimeout(() => champ.focus({ preventScroll: true }), 350);
  }, true));
  if (location.hash === '#recherche') setTimeout(() => $('#filtre-q')?.focus({ preventScroll: true }), 600);
}
