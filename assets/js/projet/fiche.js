/* Fiche œuvre : configurateur (format × finition), prix et dimensions en direct, cadre qui change autour
   de l'œuvre, finitions impossibles grisées, choix gardé dans l'adresse (lien partageable), ajout au panier ;
   visionneuse avec loupe (souris ou doigt), Échap, focus gardé puis rendu. */
import { bloquerDefilement, debloquerDefilement, suivre, lacher, etat } from '../socle/index.js?v=1';
import { $, $$, euros, cm, garderFocus, souris } from './outils.js?v=1';
import { ajouter, ouvrirTiroir } from './panier.js?v=1';

export function initFiche() {
  const fiche = $('[data-fiche]');
  if (!fiche) return;
  const d = JSON.parse($('[data-config-donnees]').textContent);
  const form = $('[data-config-form]');
  const fin = Object.fromEntries(d.finitions.map((f) => [f.id, f]));
  const params = new URLSearchParams(location.search);
  let format = d.formats.find((f) => f.id === params.get('format')) || d.formats.find((f) => f.id === d.defaut.format);
  let finition = fin[params.get('finition')] && format.prix[params.get('finition')] != null ? params.get('finition') : d.defaut.finition;
  const cadre = $('.cadre--fiche');
  const cadresCertif = $$('.certificat-grille div:nth-child(5) dd');

  const maj = (ecrireAdresse) => {
    /* Finitions impossibles pour ce format (taille maximale) : grisées ; on bascule si besoin. */
    $$('input[name="finition"]', form).forEach((i) => { i.disabled = format.prix[i.value] == null; });
    if (format.prix[finition] == null) finition = format.prix['caisse-noire'] != null ? 'caisse-noire' : 'toile';
    $(`input[name="format"][value="${format.id}"]`, form).checked = true;
    $(`input[name="finition"][value="${finition}"]`, form).checked = true;
    const f = fin[finition], p = format.prix[finition];
    $$('[data-config-prix], [data-config-prix-barre]').forEach((e) => { e.textContent = euros(p); });
    $$('[data-config-choix-barre]').forEach((e) => { e.textContent = `${format.l} × ${format.h} cm · ${f.court}`; });
    $('[data-config-dims]').textContent = `${cm(format.l + 2 * f.marge)} × ${cm(format.h + 2 * f.marge)} × ${cm(f.epaisseur)} cm`;
    const det = $('[data-config-detail]');
    const carte = $(`[data-finition-texte="${finition}"]`);
    $$('[data-finition-texte]').forEach((b) => { b.hidden = b !== carte; });
    const nom = $('[data-config-finition-nom]'); if (nom) nom.textContent = f.nom;
    if (det) det.textContent = f.nom;
    cadresCertif.forEach((dd) => { dd.textContent = `${format.l} × ${format.h} cm`; });
    if (cadre) {
      cadre.className = cadre.className.replace(/cadre--(toile|caisse-noire|caisse-blanche|fineart)/, `cadre--${finition}`);
      cadre.dataset.cadre = finition;
      if (!etat.calme && window.gsap) window.gsap.fromTo(cadre, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
    }
    const ech = $('.fiche-echantillon img');
    if (ech) {
      const src = { toile: 'toile-insonorisee-echantillon-512', 'caisse-noire': 'caisse-noire-echantillon-359', 'caisse-blanche': 'caisse-blanche-echantillon-359', fineart: 'cadre-bois-echantillon-640' }[finition];
      ech.removeAttribute('srcset'); ech.src = `/assets/images/finitions/${src}.webp`; ech.alt = f.nom;
    }
    if (ecrireAdresse) {
      const u = new URL(location.href);
      u.searchParams.set('format', format.id); u.searchParams.set('finition', finition);
      history.replaceState(history.state, '', u);
    }
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'format') format = d.formats.find((f) => f.id === e.target.value);
    if (e.target.name === 'finition') finition = e.target.value;
    maj(true);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  maj(false);

  /* Ajout au panier : un seul clic compte, le libellé confirme, le tiroir s'ouvre. */
  $$('[data-config-ajouter]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.occupe) return;
    b.dataset.occupe = '1';
    const f = fin[finition];
    ajouter({ slug: d.slug, titre: d.titre, artiste: d.artiste, image: `/assets/images/${d.image}`, url: d.url,
      format: { id: format.id, l: format.l, h: format.h }, finition: { id: f.id, court: f.court }, prix: format.prix[finition] });
    const t = $('[data-config-ajouter-texte]', b);
    const avant = t.textContent;
    t.textContent = b.closest('[data-barre-fixe]') ? '✓' : `${avant} ✓`;
    setTimeout(() => { t.textContent = avant; delete b.dataset.occupe; }, 1400);
    ouvrirTiroir();
  }));

  initVisionneuse();
}

function initVisionneuse() {
  const v = $('[data-visionneuse]');
  if (!v) return;
  const scene = $('[data-visionneuse-scene]', v), img = $('[data-visionneuse-image]', v), lentille = $('[data-loupe-lentille]', v);
  let ouvert = false, retour = null;
  const ouvrir = () => {
    if (ouvert) return;
    ouvert = true; retour = document.activeElement;
    v.hidden = false;
    bloquerDefilement('visionneuse'); suivre(v);
    setTimeout(() => $('[data-visionneuse-fermer]', v).focus({ preventScroll: true }), 30);
    const u = new URL(location.href); u.hash = 'visionneuse'; history.replaceState(history.state, '', u);
  };
  const fermer = () => {
    if (!ouvert) return;
    ouvert = false; v.hidden = true; lentille.classList.remove('est-active');
    debloquerDefilement('visionneuse'); lacher(v);
    const u = new URL(location.href); u.hash = ''; history.replaceState(history.state, '', u.pathname + u.search);
    if (retour && retour.focus) retour.focus({ preventScroll: true });
  };
  $$('[data-visionneuse-ouvrir]').forEach((b) => b.addEventListener('click', ouvrir));
  $$('.cadre--fiche .cadre-oeuvre').forEach((o) => { o.addEventListener('click', ouvrir); });
  $('[data-visionneuse-fermer]', v).addEventListener('click', fermer);
  document.addEventListener('keydown', (e) => {
    if (!ouvert) return;
    if (e.key === 'Escape') { e.preventDefault(); fermer(); } else garderFocus(v, e);
  });
  /* Lien direct vers la visionneuse : #visionneuse. */
  if (location.hash === '#visionneuse') setTimeout(ouvrir, 400);

  /* Loupe : agrandissement 2,5× de l'image d'origine, suit la souris ou le doigt. */
  const Z = 2.5;
  const deplacer = (x, y) => {
    const r = img.getBoundingClientRect(), s = scene.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) { lentille.classList.remove('est-active'); return; }
    lentille.classList.add('est-active');
    lentille.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    lentille.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
    const lx = x - s.left, ly = y - s.top, ix = x - r.left, iy = y - r.top;
    const t = lentille.offsetWidth / 2;
    lentille.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
    lentille.style.backgroundPosition = `${-(ix * Z - t)}px ${-(iy * Z - t)}px`;
  };
  scene.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) deplacer(e.clientX, e.clientY); });
  scene.addEventListener('pointerdown', (e) => { scene.setPointerCapture?.(e.pointerId); deplacer(e.clientX, e.clientY); });
  scene.addEventListener('pointerup', () => { if (!souris()) lentille.classList.remove('est-active'); });
  scene.addEventListener('pointerleave', () => lentille.classList.remove('est-active'));
}
