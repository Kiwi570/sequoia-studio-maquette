/* Galerie : filtres (univers, artiste, format, couleur), tri et recherche gardés dans l'adresse ;
   passage en fondu sans moment vide ; rubriques vides grisées ; positions recalculées après filtrage ;
   cartes qui s'inclinent et lumière qui suit la souris. */
import { rafraichir, etat, quand, aller } from '../socle/index.js?v=2';
import { $, $$, mots, souris } from './outils.js?v=2';

export function initGalerie() {
  const form = $('[data-filtres]');
  const mur = $('[data-mur]');
  if (!form || !mur) return;
  const cartes = $$('[data-oeuvre]', mur);
  const ordreInitial = [...cartes];
  const nombre = $('[data-filtres-nombre]');
  const modeleNombre = nombre.textContent.replace(/\d+/, '{n}');
  const vide = $('[data-mur-vide]');
  const champ = $('#filtre-q', form);
  const GROUPES = ['univers', 'artiste', 'format', 'couleur'];

  const lireAdresse = () => {
    const p = new URLSearchParams(location.search);
    GROUPES.forEach((g) => { const v = p.get(g) || ''; const r = $(`input[name="${g}"][value="${CSS.escape(v)}"]`, form) || $(`input[name="${g}"][value=""]`, form); r.checked = true; });
    champ.value = p.get('q') || '';
    $('#filtre-tri', form).value = ['nouveau', 'prix', 'prix-desc', 'titre'].includes(p.get('tri')) ? p.get('tri') : 'nouveau';
  };
  const valeurs = () => Object.fromEntries([...GROUPES.map((g) => [g, ($(`input[name="${g}"]:checked`, form) || {}).value || '']), ['q', champ.value.trim()], ['tri', $('#filtre-tri', form).value]]);
  const correspond = (c, v, sauf) => {
    if (sauf !== 'univers' && v.univers && c.dataset.univers !== v.univers) return false;
    if (sauf !== 'artiste' && v.artiste && c.dataset.artiste !== v.artiste) return false;
    if (sauf !== 'format' && v.format && c.dataset.orientation !== v.format) return false;
    if (sauf !== 'couleur' && v.couleur && !c.dataset.familles.split(' ').includes(v.couleur)) return false;
    if (v.q) { const texte = mots(c.dataset.recherche).join(' '); if (!mots(v.q).every((m) => texte.includes(m))) return false; }
    return true;
  };

  let premier = true;
  const appliquer = ({ ecrire = true } = {}) => {
    const v = valeurs();
    const avantH = mur.offsetHeight;
    /* Tri. */
    const tri = {
      nouveau: (a, b) => ordreInitial.indexOf(a) - ordreInitial.indexOf(b),
      prix: (a, b) => +a.dataset.des - +b.dataset.des || a.dataset.titre.localeCompare(b.dataset.titre, 'fr'),
      'prix-desc': (a, b) => +b.dataset.des - +a.dataset.des || a.dataset.titre.localeCompare(b.dataset.titre, 'fr'),
      titre: (a, b) => a.dataset.titre.localeCompare(b.dataset.titre, 'fr'),
    }[v.tri];
    const triees = [...cartes].sort(tri);
    const dejaDansLOrdre = triees.every((c, i) => mur.children[i] === c);
    if (!dejaDansLOrdre) mur.replaceChildren(...triees);
    let n = 0;
    triees.forEach((c) => {
      const ok = correspond(c, v);
      const etaitCachee = c.classList.contains('est-masquee');
      c.classList.toggle('est-masquee', !ok);
      if (ok) n++;
      if (ok && etaitCachee && !premier && !etat.calme) { c.classList.add('entre'); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('entre'))); }
    });
    nombre.textContent = modeleNombre.replace('{n}', n);
    $$('[data-filtres-voir]').forEach((b) => { b.textContent = (b.dataset.modele || '').replace('{n}', n); });
    vide.hidden = n > 0;
    /* Rubriques vides grisées : nombre d'œuvres de chaque choix, compte tenu des autres filtres. */
    GROUPES.forEach((g) => $$(`input[name="${g}"]`, form).forEach((i) => {
      if (!i.value) return;
      const k = cartes.filter((c) => correspond(c, { ...v, [g]: i.value }, null)).length;
      const small = i.nextElementSibling.querySelector('small'); if (small) small.textContent = k;
      i.closest('.puce').classList.toggle('est-vide', k === 0);
      i.disabled = k === 0 && !i.checked;
    }));
    const actifs = GROUPES.filter((g) => v[g]).length + (v.q ? 1 : 0);
    const compte = $('[data-filtres-compte]'); if (compte) compte.textContent = actifs ? String(actifs) : '';
    if (ecrire) {
      const u = new URL(location.href);
      ['univers', 'artiste', 'format', 'couleur', 'q'].forEach((k) => (v[k] ? u.searchParams.set(k, v[k]) : u.searchParams.delete(k)));
      v.tri !== 'nouveau' ? u.searchParams.set('tri', v.tri) : u.searchParams.delete('tri');
      history.replaceState(history.state, '', u);
    }
    /* Galerie raccourcie alors qu'on était plus bas : retour au début du mur, sans saut brutal. */
    if (!premier) {
      const haut = mur.getBoundingClientRect().top + window.scrollY - 140;
      if (mur.offsetHeight < avantH && window.scrollY > haut) window.scrollTo({ top: haut, behavior: etat.calme ? 'auto' : 'smooth' });
      rafraichir();
    }
    premier = false;
  };

  lireAdresse();
  appliquer({ ecrire: false });
  form.addEventListener('change', () => appliquer());
  let attente = 0;
  champ.addEventListener('input', () => { clearTimeout(attente); attente = setTimeout(() => appliquer(), 180); });
  form.addEventListener('submit', (e) => { e.preventDefault(); appliquer(); });
  const reinitialiser = (e) => { e.preventDefault(); history.replaceState(history.state, '', location.pathname + location.hash); lireAdresse(); appliquer(); };
  $$('[data-filtres-reinitialiser]').forEach((b) => b.addEventListener('click', reinitialiser));
  form.addEventListener('reset', reinitialiser);

  /* Téléphone : les filtres s'ouvrent depuis leur bouton. */
  const bouton = $('[data-filtres-ouvrir]'), panneau = $('[data-filtres-panneau]');
  if (bouton) bouton.addEventListener('click', () => { const o = !panneau.classList.contains('est-ouvert'); panneau.classList.toggle('est-ouvert', o); bouton.setAttribute('aria-expanded', String(o)); rafraichir(); });
  /* « Voir les n œuvres » : referme les filtres et mène au mur. */
  $$('[data-filtres-voir]').forEach((b) => b.addEventListener('click', () => {
    panneau.classList.remove('est-ouvert'); if (bouton) { bouton.setAttribute('aria-expanded', 'false'); }
    rafraichir();
    mur.scrollIntoView({ behavior: etat.calme ? 'auto' : 'smooth', block: 'start' });
  }));
  /* Arrivée avec une recherche ou un filtre dans l'adresse (recherche validée par Entrée) : directement au mur. */
  const p0 = new URLSearchParams(location.search);
  if (!location.hash && ['q', 'univers', 'artiste', 'format', 'couleur'].some((k) => p0.get(k))) quand('pret', () => aller($('#oeuvres'), { instant: true }));

  /* Lien d'univers sur la même page : filtre sans recharger. */
  $$('[data-univers-lien]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    $(`input[name="univers"][value="${a.dataset.universLien}"]`, form).checked = true;
    appliquer();
    $('#oeuvres').scrollIntoView({ behavior: etat.calme ? 'auto' : 'smooth' });
  }, true));

  initCartes(cartes);
}

/* Cartes : inclinaison 3D et lumière qui suit la souris (souris seulement, jamais en mode calme). */
export function initCartes(cartes = $$('[data-oeuvre]')) {
  if (!souris() || etat.calme) return;
  cartes.forEach((c) => {
    const scene = $('.carte-scene', c), cadre = $('.cadre', c);
    let r = null;
    scene.addEventListener('pointerenter', () => { r = scene.getBoundingClientRect(); });
    scene.addEventListener('pointermove', (e) => {
      if (!r) return;
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      scene.style.setProperty('--lx', `${(x * 100).toFixed(1)}%`); scene.style.setProperty('--ly', `${(y * 100).toFixed(1)}%`);
      cadre.style.transform = `perspective(900px) rotateY(${((x - 0.5) * 7).toFixed(2)}deg) rotateX(${((0.5 - y) * 6).toFixed(2)}deg) scale(1.03)`;
    });
    scene.addEventListener('pointerleave', () => { r = null; cadre.style.transform = ''; });
  });
}
