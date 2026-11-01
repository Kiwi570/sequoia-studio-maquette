/* Outil « Voir chez vous » : intérieurs dessinés à l'échelle (1 unité = 1 cm) ou photo du visiteur mise à l'échelle
   avec une feuille A4 (29,7 cm) ; jusqu'à trois œuvres, chacune avec son format et sa finition ; glisser à la souris
   ou au doigt, flèches du clavier ; total et ajout au panier. La photo reste dans le navigateur (aucun envoi). */
import { $, $$, euros, borne, annoncer } from './outils.js?v=2';
import { ajouter, ouvrirTiroir } from './panier.js?v=2';

const MAX = 3;

export function initChezVous() {
  const racine = $('[data-outil]');
  if (!racine) return;
  const d = JSON.parse($('[data-outil-donnees]', racine).textContent);
  const scene = $('[data-outil-scene]', racine), zone = $('[data-outil-oeuvres]', racine);
  const liste = $('[data-outil-liste]', racine), modele = $('[data-outil-ligne-modele]', racine);
  const fin = Object.fromEntries(d.finitions.map((f) => [f.id, f]));
  const oeuvres = Object.fromEntries(d.oeuvres.map((o) => [o.slug, o]));
  const a4 = $('[data-outil-a4]', racine);
  let interieur = d.interieurs[0];
  /* Proportion de la scène (hauteur / largeur) : celle des images d'intérieur, 1168 × 784 px. */
  const RATIO = 784 / 1168;
  let photo = null; /* { url, largeurCm } */
  let choisie = 0;
  const items = [];

  /* Repère de la scène en cm : largeur et hauteur visibles, ligne du bas des œuvres, centre. */
  const repere = () => {
    if (interieur.id === 'photo' && photo) return { l: photo.largeurCm, h: photo.largeurCm * RATIO, base: photo.largeurCm * RATIO * 0.58, centre: photo.largeurCm / 2 };
    const i = interieur.id === 'photo' ? d.interieurs[0] : interieur;
    return { l: i.largeurCm, h: i.hauteurCm, base: i.baseCm, centre: i.centreCm };
  };

  const cadreHtml = (o, f) => {
    const r = o.r;
    return `<div class="cadre cadre--${f}" style="--r:${r}"><div class="cadre-bord"><div class="cadre-creux"><div class="cadre-oeuvre"><figure class="media" style="aspect-ratio:${r}"><img src="/assets/images/${o.image}" alt="" draggable="false"></figure></div></div></div></div>`;
  };

  const placer = (it) => {
    const R = repere();
    const o = oeuvres[it.slug], fm = o.formats.find((f) => f.id === it.format), f = fin[it.finition];
    const lt = fm.l + 2 * f.marge, ht = fm.h + 2 * f.marge;
    /* L'œuvre reste entière sur le mur (jamais hors de l'image). */
    it.x = borne(it.x, Math.min(lt / 2, R.l / 2), Math.max(R.l - lt / 2, R.l / 2));
    it.y = borne(it.y, Math.min(ht / 2, R.h / 2), Math.max(R.h - ht / 2, R.h / 2));
    it.el.style.width = `${(lt / R.l) * 100}%`;
    it.el.style.left = `${((it.x - lt / 2) / R.l) * 100}%`;
    it.el.style.top = `${((it.y - ht / 2) / R.h) * 100}%`;
    it.el.setAttribute('aria-label', `${o.titre}, ${fm.l} × ${fm.h} cm, ${f.court}`);
  };

  const rendre = () => {
    zone.replaceChildren();
    liste.replaceChildren();
    let total = 0;
    items.forEach((it, k) => {
      const o = oeuvres[it.slug];
      if (!o.formats.find((f) => f.id === it.format).prix[it.finition]) it.finition = 'toile';
      const fm = o.formats.find((f) => f.id === it.format);
      const prix = fm.prix[it.finition];
      total += prix;
      /* Œuvre sur le mur. */
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'outil-oeuvre' + (k === choisie ? ' est-choisie' : '');
      b.innerHTML = cadreHtml(o, it.finition);
      it.el = b; placer(it);
      b.addEventListener('pointerdown', (e) => glisser(e, it, k));
      b.addEventListener('focus', () => { choisie = k; marquer(); });
      b.addEventListener('keydown', (e) => {
        const pas = e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowLeft' ? -pas : e.key === 'ArrowRight' ? pas : 0, dy = e.key === 'ArrowUp' ? -pas : e.key === 'ArrowDown' ? pas : 0;
        if (!dx && !dy) return;
        e.preventDefault();
        const R = repere();
        it.x = borne(it.x + dx, 0, R.l); it.y = borne(it.y + dy, 0, R.h); placer(it);
      });
      zone.appendChild(b);
      /* Ligne dans le panneau. */
      const li = modele.content.firstElementChild.cloneNode(true);
      li.classList.toggle('est-choisie', k === choisie);
      $('img', li).src = `/assets/images/${o.image}`;
      $('.outil-ligne-titre', li).textContent = `${o.titre} · ${o.artiste}`;
      const sf = $('[data-ligne-format]', li), sfi = $('[data-ligne-finition]', li);
      o.formats.forEach((f) => sf.add(new Option(`${f.l} × ${f.h} cm`, f.id, false, f.id === it.format)));
      d.finitions.forEach((f) => { const opt = new Option(f.court, f.id, false, f.id === it.finition); opt.disabled = fm.prix[f.id] == null; sfi.add(opt); });
      sf.addEventListener('change', () => { it.format = sf.value; choisie = k; rendre(); });
      sfi.addEventListener('change', () => { it.finition = sfi.value; choisie = k; rendre(); });
      $('[data-ligne-prix]', li).textContent = euros(prix);
      $('[data-ligne-retirer]', li).addEventListener('click', () => { items.splice(k, 1); choisie = 0; rendre(); });
      liste.appendChild(li);
    });
    $('[data-outil-total]', racine).textContent = euros(total);
    $('[data-outil-max]', racine).hidden = items.length < MAX;
    $('[data-outil-ajouter]', racine).disabled = items.length >= MAX;
    $('[data-outil-panier]', racine).disabled = !items.length;
  };
  const marquer = () => { $$('.outil-oeuvre', zone).forEach((b, k) => b.classList.toggle('est-choisie', k === choisie)); $$('.outil-ligne', liste).forEach((l, k) => l.classList.toggle('est-choisie', k === choisie)); };

  const glisser = (e, it, k) => {
    choisie = k; marquer();
    const r = scene.getBoundingClientRect(), R = repere();
    const x0 = e.clientX, y0 = e.clientY, ix = it.x, iy = it.y;
    it.el.setPointerCapture(e.pointerId);
    const bouger = (ev) => {
      it.x = borne(ix + ((ev.clientX - x0) / r.width) * R.l, 0, R.l);
      it.y = borne(iy + ((ev.clientY - y0) / r.height) * R.h, 0, R.h);
      placer(it);
    };
    const fini = () => { it.el.removeEventListener('pointermove', bouger); it.el.removeEventListener('pointerup', fini); it.el.removeEventListener('pointercancel', fini); };
    it.el.addEventListener('pointermove', bouger); it.el.addEventListener('pointerup', fini); it.el.addEventListener('pointercancel', fini);
  };

  const ajouterOeuvre = (slug, choix = {}) => {
    if (items.length >= MAX || !oeuvres[slug]) return;
    const o = oeuvres[slug], R = repere();
    /* Format et finition venus de la fiche (?format=…&finition=…) quand ils existent, sinon les valeurs par défaut. */
    const fm = o.formats.find((f) => f.id === choix.format) || o.formats[Math.min(1, o.formats.length - 1)];
    const finition = fm.prix[choix.finition] != null ? choix.finition : fm.prix['caisse-noire'] != null ? 'caisse-noire' : 'toile';
    const lt = fm.l + 2 * fin[finition].marge, ESPACE = 12;
    /* Accrochée à côté des œuvres déjà posées (12 cm d'écart, bas alignés), à droite s'il y a la place, sinon à gauche. */
    const bords = items.map((it) => { const f = oeuvres[it.slug].formats.find((x) => x.id === it.format); const l = f.l + 2 * fin[it.finition].marge; return [it.x - l / 2, it.x + l / 2]; });
    let x = R.centre;
    if (bords.length) {
      const droite = Math.max(...bords.map((b) => b[1])) + ESPACE + lt / 2, gauche = Math.min(...bords.map((b) => b[0])) - ESPACE - lt / 2;
      x = droite + lt / 2 <= R.l - 8 ? droite : gauche - lt / 2 >= 8 ? gauche : R.centre;
    }
    items.push({ slug, format: fm.id, finition, x, y: R.base - (fm.h + 2 * fin[finition].marge) / 2 });
    /* La composition reste centrée sur le mur. */
    const ext = items.map((it) => { const f = oeuvres[it.slug].formats.find((z) => z.id === it.format); const l = f.l + 2 * fin[it.finition].marge; return [it.x - l / 2, it.x + l / 2]; });
    const dx = R.centre - (Math.min(...ext.map((e) => e[0])) + Math.max(...ext.map((e) => e[1]))) / 2;
    items.forEach((it) => { it.x = borne(it.x + dx, 0, R.l); });
    choisie = items.length - 1;
    rendre();
    annoncer(`${o.titre}`);
  };

  /* Intérieurs et photo. */
  const zonePhoto = $('[data-outil-photo-zone]', racine), echelle = $('[data-outil-echelle]', racine);
  $$('input[name="interieur"]', racine).forEach((r) => r.addEventListener('change', () => {
    const id = r.value;
    const avant = repere();
    interieur = id === 'photo' ? { id: 'photo' } : d.interieurs.find((i) => i.id === id);
    /* Les œuvres gardent leur place par rapport au mur : même écart au centre et à la ligne d'accrochage. */
    const apres = repere();
    items.forEach((it) => { it.x = borne(it.x + apres.centre - avant.centre, 0, apres.l); it.y = borne(it.y + apres.base - avant.base, 0, apres.h); });
    $$('[data-outil-fond]', racine).forEach((f) => f.classList.toggle('est-actif', f.dataset.outilFond === id));
    zonePhoto.hidden = id !== 'photo';
    a4.hidden = !(id === 'photo' && photo);
    echelle.textContent = r.dataset.echelle;
    items.forEach(placer);
  }));
  const fichier = $('[data-outil-fichier]', racine), cadrePhoto = $('[data-outil-photo-cadre]', racine);
  /* L'image de la photo n'existe qu'une fois la photo choisie (aucune image vide dans la page). */
  let imgPhoto = null;
  fichier.addEventListener('change', () => {
    const f = fichier.files && fichier.files[0];
    if (!f) return;
    if (photo && photo.url) URL.revokeObjectURL(photo.url);
    photo = { url: URL.createObjectURL(f), largeurCm: 400, g: 0.42, d: 0.58 };
    const vide = $('[data-outil-photo-vide]', cadrePhoto); if (vide) vide.hidden = true;
    if (!imgPhoto) { imgPhoto = document.createElement('img'); imgPhoto.alt = cadrePhoto.dataset.alt || ''; imgPhoto.decoding = 'async'; cadrePhoto.append(imgPhoto); }
    imgPhoto.src = photo.url;
    a4.hidden = false; poserA4();
    items.forEach(placer);
  });
  /* Feuille A4 : deux repères sur les bords de la feuille → échelle de la photo. */
  const poserA4 = () => {
    if (!photo) return;
    const [g, dr] = $$('[data-outil-a4-repere]', a4);
    g.style.left = `${photo.g * 100}%`; dr.style.left = `${photo.d * 100}%`;
    const t = $('[data-outil-a4-trait]', a4); t.style.left = `${photo.g * 100}%`; t.style.width = `${(photo.d - photo.g) * 100}%`;
    photo.largeurCm = 29.7 / Math.max(0.01, photo.d - photo.g);
    items.forEach(placer);
  };
  $$('[data-outil-a4-repere]', a4).forEach((rep) => {
    rep.addEventListener('pointerdown', (e) => {
      const r = scene.getBoundingClientRect();
      rep.setPointerCapture(e.pointerId);
      const bouger = (ev) => { const v = borne((ev.clientX - r.left) / r.width, 0, 1); if (rep.dataset.outilA4Repere === 'g') photo.g = Math.min(v, photo.d - 0.02); else photo.d = Math.max(v, photo.g + 0.02); poserA4(); };
      const fini = () => { rep.removeEventListener('pointermove', bouger); rep.removeEventListener('pointerup', fini); };
      rep.addEventListener('pointermove', bouger); rep.addEventListener('pointerup', fini);
    });
    rep.addEventListener('keydown', (e) => {
      const dx = e.key === 'ArrowLeft' ? -0.005 : e.key === 'ArrowRight' ? 0.005 : 0;
      if (!dx) return; e.preventDefault();
      if (rep.dataset.outilA4Repere === 'g') photo.g = borne(photo.g + dx, 0, photo.d - 0.02); else photo.d = borne(photo.d + dx, photo.g + 0.02, 1);
      poserA4();
    });
  });

  $('[data-outil-ajouter]', racine).addEventListener('click', () => ajouterOeuvre($('[data-outil-choix]', racine).value));
  $('[data-outil-panier]', racine).addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (b.dataset.occupe) return; b.dataset.occupe = '1'; setTimeout(() => delete b.dataset.occupe, 1200);
    items.forEach((it) => {
      const o = oeuvres[it.slug], fm = o.formats.find((f) => f.id === it.format), f = fin[it.finition];
      ajouter({ slug: o.slug, titre: o.titre, artiste: o.artiste, image: `/assets/images/${o.image}`, url: `/oeuvres/${o.slug}`, format: { id: fm.id, l: fm.l, h: fm.h }, finition: { id: f.id, court: f.court }, prix: fm.prix[f.id] });
    });
    ouvrirTiroir();
  });

  /* Œuvre de départ : celle de l'adresse (?oeuvre=…), sinon celle de démonstration. */
  const params = new URLSearchParams(location.search);
  const depart = params.get('oeuvre');
  const slug = oeuvres[depart] ? depart : d.defaut;
  $('[data-outil-choix]', racine).value = slug;
  ajouterOeuvre(slug, oeuvres[depart] ? { format: params.get('format'), finition: params.get('finition') } : {});
}
