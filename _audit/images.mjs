/* Analyse d'images dans une page vierge du navigateur (canvas), sans dépendance :
   statistiques des images d'un film, planche contact, contraste d'un texte sur sa zone de photo. */

/* Statistiques de chaque image d'un film (luminance moyenne, écart, différence avec la précédente)
   et planche contact. Entrée : [{ b64, t }] en JPEG. */
export async function analyserFilm({ images, colonnes = 6, largeur = 220, max = 36, marques = [] }) {
  const charger = async (b64) => createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob());
  const petit = document.createElement('canvas'); petit.width = 64; petit.height = 36;
  const pc = petit.getContext('2d', { willReadFrequently: true });
  const stats = [];
  let avant = null;
  const bitmaps = [];
  for (let i = 0; i < images.length; i++) {
    const bm = await charger(images[i].b64);
    bitmaps.push(bm);
    pc.drawImage(bm, 0, 0, 64, 36);
    const d = pc.getImageData(0, 0, 64, 36).data;
    const g = new Float32Array(64 * 36);
    let somme = 0, somme2 = 0, r = 0, v = 0, b = 0;
    for (let k = 0; k < g.length; k++) {
      const l = (0.2126 * d[k * 4] + 0.7152 * d[k * 4 + 1] + 0.0722 * d[k * 4 + 2]) / 255;
      g[k] = l; somme += l; somme2 += l * l; r += d[k * 4]; v += d[k * 4 + 1]; b += d[k * 4 + 2];
    }
    const n = g.length, moy = somme / n;
    let diff = 0;
    if (avant) { for (let k = 0; k < n; k++) diff += Math.abs(g[k] - avant[k]); diff /= n; }
    stats.push({ t: images[i].t, moyenne: moy, ecart: Math.sqrt(Math.max(0, somme2 / n - moy * moy)), diff, couleur: [r / n, v / n, b / n] });
    avant = g;
  }
  /* Planche : images réparties régulièrement + images marquées (problèmes). */
  const choix = new Set(marques.filter((i) => i < images.length));
  const pasPlanche = Math.max(1, Math.ceil(images.length / Math.max(1, max - choix.size)));
  for (let i = 0; i < images.length; i += pasPlanche) choix.add(i);
  choix.add(images.length - 1);
  const liste = [...choix].sort((a, b) => a - b).slice(0, max + 8);
  let planche = null;
  if (liste.length && bitmaps.length) {
    const ratio = bitmaps[0].height / bitmaps[0].width;
    const h = Math.round(largeur * ratio);
    const lignes = Math.ceil(liste.length / colonnes);
    const c = document.createElement('canvas');
    c.width = colonnes * (largeur + 6) + 6; c.height = lignes * (h + 24) + 6;
    const x = c.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
    x.font = '12px sans-serif';
    liste.forEach((idx, k) => {
      const cx = 6 + (k % colonnes) * (largeur + 6), cy = 6 + Math.floor(k / colonnes) * (h + 24);
      x.drawImage(bitmaps[idx], cx, cy, largeur, h);
      x.fillStyle = marques.includes(idx) ? '#ff5a4a' : '#ddd';
      x.fillText(`${Math.round(images[idx].t)} ms${marques.includes(idx) ? '  ⚠' : ''}`, cx, cy + h + 15);
    });
    planche = c.toDataURL('image/png').split(',')[1];
  }
  return { stats, planche };
}

/* Contraste d'un texte sur la photo : on reçoit la capture de la zone sans le texte (texte rendu transparent)
   et la couleur du texte ; on renvoie le contraste au 10e centile (les 10 % de pixels les moins favorables). */
export async function contrasteSurImage({ b64, couleur }) {
  const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bm, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const lt = L(couleur[0], couleur[1], couleur[2]);
  const ratios = [];
  for (let k = 0; k < d.length; k += 4 * 3) {
    const lp = L(d[k], d[k + 1], d[k + 2]);
    ratios.push((Math.max(lt, lp) + 0.05) / (Math.min(lt, lp) + 0.05));
  }
  ratios.sort((a, b) => a - b);
  return { p10: ratios[Math.floor(ratios.length * 0.1)] || 21, median: ratios[Math.floor(ratios.length / 2)] || 21 };
}

/* Différence moyenne entre deux captures (PNG), de 0 à 1. */
export async function differenceImages({ a, b }) {
  const ch = async (s) => createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob());
  const [ia, ib] = [await ch(a), await ch(b)];
  const c = document.createElement('canvas'); c.width = 160; c.height = 90;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(ia, 0, 0, 160, 90); const da = x.getImageData(0, 0, 160, 90).data;
  x.drawImage(ib, 0, 0, 160, 90); const db = x.getImageData(0, 0, 160, 90).data;
  let s = 0;
  for (let k = 0; k < da.length; k += 4) s += (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2])) / 765;
  return s / (da.length / 4);
}

/* Bandes le long des bords pendant qu'un panneau (intro, voile, menu) couvre tout l'écran, immobile :
   pour chaque bord, la couleur des 3 pixels les plus au bord est comparée à celle du panneau, juste à côté.
   Typiquement : la bande de la barre de défilement (scrollbar-gutter: stable) restée claire à côté d'un voile sombre.
   Entrée : images [{ b64, abs }] (JPEG à la taille de l'écran) et relevés [{ t, couches, bord, w, h, url }]. */
export async function analyserBords({ images, releves, seuil = 28 }) {
  const charger = async (b64) => createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob());
  const c = document.createElement('canvas');
  const x = c.getContext('2d', { willReadFrequently: true });
  const resultats = [];
  let analysees = 0;
  /* Partie visible d'un panneau : sa découpe clip-path: inset() comprise ; autre découpe : on ne juge pas. */
  const zone = (k) => {
    if (!k.clip || k.clip === 'none') return k;
    const m = /^inset\(([^)]*)\)/.exec(k.clip);
    if (!m) return null;
    const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
    const [a, b = a, c = a, g = b] = v;
    const H = k.bas - k.haut, L = k.droite - k.gauche;
    const val = (x, t) => (x.endsWith('%') ? (parseFloat(x) / 100) * t : parseFloat(x) || 0);
    return { ...k, haut: k.haut + val(a, H), droite: k.droite - val(b, L), bas: k.bas - val(c, H), gauche: k.gauche + val(g, L) };
  };
  const etatStable = (abs) => {
    const fen = releves.filter((r) => r.t >= abs - 150 && r.t <= abs + 30);
    if (fen.length < 2 || new Set(fen.map((r) => r.url)).size > 1) return null;
    let nom = null;
    for (const r of fen) {
      const couvrantes = r.couches.map(zone).filter((k) => k && k.op >= 0.99 && k.haut <= 1 && k.gauche <= 1 && k.bas >= r.h - 1 && k.droite >= r.bord - 1);
      if (!couvrantes.length) return null;
      const dessus = couvrantes.sort((a, b) => b.z - a.z)[0];
      /* Un panneau plus haut qui ne couvre qu'une partie (en mouvement) : on ne juge pas. */
      if (r.couches.some((k) => k.z > dessus.z && k.nom !== dessus.nom)) return null;
      if (nom && nom !== dessus.nom) return null;
      nom = dessus.nom;
    }
    const r = fen[fen.length - 1];
    return { nom, bord: r.bord, w: r.w, h: r.h, url: r.url };
  };
  const moyenne = (d, w, x0, y0, x1, y1) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) { const k = (y * w + xx) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
    return [r / n, g / n, b / n];
  };
  const ecart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  for (let i = 0; i < images.length; i++) {
    const e = etatStable(images[i].abs);
    if (!e) continue;
    const bm = await charger(images[i].b64);
    c.width = bm.width; c.height = bm.height;
    x.drawImage(bm, 0, 0);
    const W = bm.width, H = bm.height, sc = W / e.w;
    const d = x.getImageData(0, 0, W, H).data;
    analysees++;
    const bordPage = Math.min(W, Math.round(e.bord * sc));
    /* Pour chaque bord : [ligne de mesure, zone au bord, zone dans le panneau]. */
    const bords = {
      droite: (y) => [moyenne(d, W, W - 3, y, W - 1, y + 1), moyenne(d, W, Math.max(0, bordPage - 30), y, Math.max(1, bordPage - 18), y + 1)],
      gauche: (y) => [moyenne(d, W, 0, y, 2, y + 1), moyenne(d, W, 18, y, 30, y + 1)],
      haut: (xx) => [moyenne(d, W, xx, 0, xx + 1, 2), moyenne(d, W, xx, 18, xx + 1, 30)],
      bas: (xx) => [moyenne(d, W, xx, H - 3, xx + 1, H - 1), moyenne(d, W, xx, H - 31, xx + 1, H - 19)],
    };
    for (const [cote, mesure] of Object.entries(bords)) {
      const vertical = cote === 'droite' || cote === 'gauche';
      const fin = vertical ? H - 40 : Math.min(W, bordPage) - 40;
      const lignes = [];
      for (let v = 40; v < fin; v += 6) lignes.push(mesure(v));
      if (lignes.length < 6) continue;
      /* Le panneau doit être uni près du bord pour juger (sinon : image, dégradé). */
      const dedans = lignes.map((l) => l[1]);
      const m = [0, 1, 2].map((k) => dedans.reduce((s, l) => s + l[k], 0) / dedans.length);
      if (dedans.some((l) => ecart(l, m) > 18)) continue;
      const differentes = lignes.filter((l) => ecart(l[0], l[1]) > seuil);
      if (differentes.length / lignes.length < 0.6) continue;
      const exterieur = [0, 1, 2].map((k) => Math.round(differentes.reduce((s, l) => s + l[0][k], 0) / differentes.length));
      /* Largeur de la bande, mesurée au milieu du bord. */
      let largeur = 0;
      if (cote === 'droite') {
        const y = Math.round(H / 2);
        for (let xx = W - 1; xx > W - 60 && ecart(moyenne(d, W, xx, y, xx, y), exterieur) <= 20; xx--) largeur++;
      }
      resultats.push({ i, cote, panneau: e.nom, url: e.url, bande: exterieur, panneauCouleur: m.map(Math.round), largeur: Math.round(largeur / sc) });
    }
  }
  return { resultats, analysees };
}
