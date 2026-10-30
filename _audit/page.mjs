/* Fonctions exécutées dans la page par l'audit (page.evaluate). Chacune est autonome :
   elle ne peut rien utiliser de ce fichier en dehors d'elle-même. */

/* Outils communs, injectés une fois par page sous window.__audit. */
export function installerOutils() {
  if (window.__audit) return;
  const sel = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    const parties = [];
    let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 4; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parties.unshift(s + '#' + e.id); break; }
      const cl = [...e.classList].filter((c) => !/^(vu|js)$/.test(c)).slice(0, 2);
      if (cl.length) s += '.' + cl.join('.');
      const freres = e.parentElement ? [...e.parentElement.children].filter((x) => x.tagName === e.tagName) : [];
      if (freres.length > 1) s += `:nth-of-type(${freres.indexOf(e) + 1})`;
      parties.unshift(s);
    }
    const texte = (el.innerText || el.getAttribute('alt') || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return parties.join(' > ') + (texte ? ` « ${texte} »` : '');
  };
  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.closest('[inert], [data-audit-ignorer]')) return false;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const fixe = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };
  const rectTexte = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect();
  };
  const elementsTexte = () => {
    const out = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      if (n.textContent.trim() && !n.parentElement.closest('script, style, noscript, template, [data-audit-ignorer]')) out.add(n.parentElement);
    }
    return [...out];
  };
  const toile = document.createElement('canvas'); toile.width = toile.height = 1;
  const ctx2d = toile.getContext('2d', { willReadFrequently: true });
  const couleur = (c) => {
    if (!c || c === 'transparent') return [0, 0, 0, 0];
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; }
    m = c.match(/^color\(srgb\s+([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] === undefined ? 1 : p[3]]; }
    /* oklab, oklch, lab… : on laisse le navigateur peindre un pixel. */
    ctx2d.clearRect(0, 0, 1, 1); ctx2d.fillStyle = '#000'; ctx2d.fillStyle = c; ctx2d.fillRect(0, 0, 1, 1);
    const d = ctx2d.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const melanger = (avant, arriere) => {
    const a = avant[3];
    return [avant[0] * a + arriere[0] * (1 - a), avant[1] * a + arriere[1] * (1 - a), avant[2] * a + arriere[2] * (1 - a), 1];
  };
  window.__audit = { sel, visible, fixe, rectTexte, elementsTexte, couleur, lum, ratio, melanger };
}

/* Fait défiler toute la page pour déclencher les apparitions, puis revient en haut. */
export async function defilerTout({ pas = 0.7, pause = 110 } = {}) {
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  let y = 0, garde = 0;
  while (y < document.documentElement.scrollHeight - innerHeight && garde++ < 400) {
    y += innerHeight * pas;
    window.scrollTo({ top: y, behavior: 'instant' });
    await attendre(pause);
  }
  await attendre(900);
  window.scrollTo({ top: 0, behavior: 'instant' });
  await attendre(500);
  return document.documentElement.scrollHeight;
}

/* Mesures 1 à 12 pour une page, une taille et un mode. */
export function mesurer(o) {
  const A = window.__audit;
  const pb = [];
  const ajouter = (controle, detail, el, niveau = 'echec') => pb.push({ controle, detail, selecteur: el ? A.sel(el) : '', niveau });
  const vw = innerWidth, vh = innerHeight;
  const textes = A.elementsTexte().filter((el) => A.visible(el));
  const dansGalerie = (el) => !!el.closest('[data-galerie], .pin-spacer, [data-boucle-css], [data-ruban]');

  /* 1. Débordement horizontal. */
  const largeur = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (largeur > vw + 1) {
    const coupables = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width === 0) return false;
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return false;
      }
      return true;
    }).slice(0, 4);
    ajouter('débordement horizontal', `page large de ${largeur} px pour un écran de ${vw} px`, coupables[0]);
    coupables.slice(1).forEach((c) => ajouter('débordement horizontal', 'dépasse aussi à droite', c));
  }

  /* 1b. Galeries sans épinglage (mode calme, sans JavaScript) : chaque carte doit rester atteignable. */
  if (o.galeriesStatiques) {
    document.querySelectorAll('[data-galerie]').forEach((g) => {
      const defilable = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1) return true; } return false; };
      const perdus = [...g.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && (r.left >= vw - 1 || r.right <= 1) && !defilable(c); });
      if (perdus.length) ajouter('contenu inaccessible', `${perdus.length} élément(s) de galerie hors de l'écran, sans défilement possible`, perdus[0]);
    });
  }

  /* 2. Textes sous 12 px. */
  textes.forEach((el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11.95 && !el.closest('.visuellement-cache, .sr-only')) ajouter('texte sous 12 px', `${fs.toFixed(1)} px`, el);
  });

  /* 3. Zones tactiles sous 44 px (tailles tactiles). */
  if (o.tactile) {
    document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"]').forEach((el) => {
      if (!A.visible(el) || el.disabled || el.classList.contains('evitement')) return;
      if (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type) && el.closest('label')) return;
      const r = el.getBoundingClientRect();
      if (r.width >= 43.5 && r.height >= 43.5) return;
      if (el.tagName === 'A') {
        const bloc = el.closest('p, li, dd, td, figcaption, blockquote');
        if (bloc && bloc.textContent.trim().length > el.textContent.trim().length + 3 && getComputedStyle(el).display === 'inline') return;
      }
      ajouter('zone tactile sous 44 px', `${Math.round(r.width)} × ${Math.round(r.height)} px`, el);
    });
  }

  /* 4. Textes coupés (débordement interne, points de suspension, coupure par un parent). */
  textes.forEach((el) => {
    if (el.closest('[data-audit-ignorer]') || /^(TEXTAREA|SELECT|INPUT|OPTION)$/.test(el.tagName)) return;
    const s = getComputedStyle(el);
    const masque = /(hidden|clip)/.test(s.overflowX + s.overflowY);
    if (masque && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && el.clientWidth > 0) {
      ajouter('texte coupé', 'le contenu dépasse de son cadre', el); return;
    }
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) { ajouter('texte coupé', 'points de suspension', el); return; }
    if (dansGalerie(el) || el.closest('[data-menu], [data-ouverture], [data-voile], .visuellement-cache')) return;
    const r = A.rectTexte(el);
    if (r.width < 2 || r.height < 2) return;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (/(auto|scroll)/.test(ps.overflowX + ps.overflowY)) return;
      if (!/(hidden|clip)/.test(ps.overflowX + ps.overflowY)) continue;
      const pr = p.getBoundingClientRect();
      const dedans = r.left >= pr.left - 1 && r.right <= pr.right + 1 && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1;
      const dehors = r.right <= pr.left || r.left >= pr.right || r.bottom <= pr.top || r.top >= pr.bottom;
      if (!dedans && !dehors) { ajouter('texte coupé', `coupé par ${A.sel(p)}`, el); return; }
    }
  });

  /* 5a. Textes qui se chevauchent. */
  const blocs = textes.filter((el) => !A.fixe(el) && !el.closest('[data-superpose], [data-menu], [data-ouverture], [data-voile], .visuellement-cache') && !dansGalerie(el))
    .map((el) => ({ el, r: A.rectTexte(el) })).filter((b) => b.r.width > 2 && b.r.height > 2);
  for (let i = 0; i < blocs.length; i++) {
    for (let j = i + 1; j < blocs.length; j++) {
      const a = blocs[i], b = blocs[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x > 3 && y > 3) ajouter('textes qui se chevauchent', `avec ${A.sel(b.el)}`, a.el);
    }
  }

  /* 6. Contrastes sur fond uni (les textes sur image sont mesurés à part, sur capture). */
  const surImage = [];
  textes.forEach((el) => {
    if (el.closest('[data-ouverture], [data-voile], [inert], .visuellement-cache, [data-audit-ignorer]')) return;
    const s = getComputedStyle(el);
    let fg = A.couleur(s.color);
    let fond = null, image = false;
    for (let e = el; e; e = e.parentElement) {
      const es = getComputedStyle(e);
      if (es.backgroundImage !== 'none' && !/gradient/.test(es.backgroundImage)) { image = true; break; }
      if (/gradient/.test(es.backgroundImage)) { image = true; break; }
      const c = A.couleur(es.backgroundColor);
      if (c[3] > 0) { fond = fond ? A.melanger(fond, c) : c; if (c[3] >= 0.99) break; }
      if (e === document.documentElement) break;
    }
    /* Une image, une vidéo ou un canvas sous le texte ? */
    if (!image) {
      const r = A.rectTexte(el);
      const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = r.top + r.height / 2;
      if (cy > 0 && cy < vh) {
        const pile = document.elementsFromPoint(cx, cy);
        const i = pile.indexOf(el);
        if (i >= 0) {
          for (const sous of pile.slice(i + 1)) {
            if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(sous.tagName) || sous.closest('picture') && sous.tagName !== 'SOURCE' && /^(IMG)$/.test(sous.tagName)) { image = true; break; }
            const c = A.couleur(getComputedStyle(sous).backgroundColor);
            if (c[3] >= 0.99) break;
          }
        }
      }
    }
    if (image) { surImage.push(el); return; }
    if (!fond) fond = A.couleur(getComputedStyle(document.documentElement).backgroundColor);
    if (fond[3] < 1) fond = A.melanger(fond, [255, 255, 255, 1]);
    if (fg[3] < 1) fg = A.melanger(fg, fond);
    const taille = parseFloat(s.fontSize), gras = parseInt(s.fontWeight, 10) >= 700;
    const seuil = taille >= 24 || (taille >= 18.66 && gras) ? 3 : 4.5;
    const rt = A.ratio(fg, fond);
    if (rt < seuil - 0.01) ajouter('contraste insuffisant', `${rt.toFixed(2)}:1 (minimum ${seuil}:1)`, el);
  });

  /* 6b. Structure : un seul h1, titres dans l'ordre, textes alternatifs, noms accessibles. */
  if (o.structure) {
    const h1 = [...document.querySelectorAll('h1')].filter((h) => !h.closest('[data-audit-ignorer]'));
    if (h1.length !== 1) ajouter('un seul h1 par page', `${h1.length} titres h1`, h1[1] || null);
    let precedent = 0;
    document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6').forEach((h) => {
      const n = +h.tagName[1];
      if (precedent && n > precedent + 1) ajouter('titres dans l’ordre', `h${precedent} suivi de h${n}`, h);
      precedent = n;
    });
    document.querySelectorAll('img').forEach((img) => { if (!img.hasAttribute('alt')) ajouter('texte alternatif manquant', img.getAttribute('src') || '', img); });
    document.querySelectorAll('a[href], button, [role="button"]').forEach((el) => {
      if (el.closest('[aria-hidden="true"]')) return;
      const nom = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join('')).trim();
      if (!nom && !el.getAttribute('aria-labelledby')) ajouter('élément sans nom accessible', '', el);
    });
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea').forEach((c) => {
      const lab = (c.id && document.querySelector(`label[for="${CSS.escape(c.id)}"]`)) || c.closest('label') || c.getAttribute('aria-label') || c.getAttribute('aria-labelledby');
      if (!lab) ajouter('champ sans libellé', c.name || '', c);
    });
    const ids = {};
    document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
    Object.entries(ids).filter(([, n]) => n > 1).forEach(([id]) => ajouter('identifiant en double', `id="${id}"`, document.getElementById(id), 'regarder'));
  }

  /* 9. Images chargées, un visuel par section, mention des illustrations générées. */
  document.querySelectorAll('img').forEach((img) => {
    if (img.closest('[inert]') && !A.visible(img)) return;
    if (img.loading === 'lazy' && !img.complete) return;
    if (!img.complete || img.naturalWidth === 0) ajouter('image non chargée', img.currentSrc || img.src, img);
  });
  document.querySelectorAll('main > section, main section[id], [data-section]').forEach((s) => {
    if (s.closest('[data-sans-visuel]')) return;
    const visuel = [...s.querySelectorAll('img, picture, video, canvas, svg, [data-visuel]')].some((v) => {
      const r = v.getBoundingClientRect(); return r.width >= 60 && r.height >= 60;
    }) || [s, ...s.querySelectorAll('*')].some((e) => { const bi = getComputedStyle(e).backgroundImage; const r = e.getBoundingClientRect(); return bi && bi !== 'none' && !/gradient/.test(bi) && r.width >= 120 && r.height >= 80; });
    if (!visuel) ajouter('section sans visuel', '', s);
  });
  document.querySelectorAll('img').forEach((img) => {
    const src = img.currentSrc || img.src || '';
    if (!/\/grok\//.test(src) || !A.visible(img)) return;
    const conteneur = img.closest('figure, [data-grok], .media') || img.parentElement;
    const mention = conteneur && conteneur.querySelector('.mention-ia');
    if (!mention || !A.visible(mention)) ajouter('mention « Illustration générée » absente', src.split('/').pop(), img);
    else if (parseFloat(getComputedStyle(mention).fontSize) < 11.95) ajouter('mention « Illustration générée » trop petite', '', mention);
  });

  /* 11. Langues : aucun texte d'une autre langue. */
  if (o.textesEtrangers && o.textesEtrangers.length) {
    const etrangers = new Set(o.textesEtrangers);
    textes.forEach((el) => {
      [...el.childNodes].filter((n) => n.nodeType === 3).forEach((n) => {
        const t = n.textContent.replace(/[\s  ]+/g, ' ').trim();
        if (t.length >= 6 && etrangers.has(t)) ajouter('texte non traduit', t.slice(0, 60), el);
      });
    });
  }

  /* 12. Typographie française : espace insécable avant : ; ? ! » et après «. */
  if (o.francais) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vus = new Set();
    while (w.nextNode()) {
      if (w.currentNode.parentElement.closest('script, style, code, pre, kbd, samp, [data-typo-ignorer], [data-audit-ignorer], [lang]:not([lang^="fr"])')) continue;
      const t = w.currentNode.textContent;
      const fautes = [];
      for (let i = 0; i < t.length; i++) {
        const ch = t[i], av = t[i - 1], ap = t[i + 1];
        const espace = av === ' ' || av === ' ';
        if (';!?'.includes(ch) && av !== undefined && !espace && !';!?'.includes(av) && !/[\s(«"']/.test(av || ' ')) fautes.push(ch);
        else if (';!?'.includes(ch) && av === ' ') fautes.push(ch);
        else if (ch === ':' && (av === ' ' || (/[\p{L}»)]/u.test(av || '') && (ap === undefined || /\s/.test(ap))))) fautes.push(':');
        else if (ch === '»' && av && !(av === ' ' || av === ' ')) fautes.push('»');
        else if (ch === '«' && ap && !(ap === ' ' || ap === ' ')) fautes.push('«');
      }
      if (fautes.length && !vus.has(w.currentNode.parentElement)) {
        vus.add(w.currentNode.parentElement);
        if (A.visible(w.currentNode.parentElement)) ajouter('typographie française', `espace insécable manquante avant ou après « ${[...new Set(fautes)].join(' ')} »`, w.currentNode.parentElement, 'regarder');
      }
    }
  }
  return { problemes: pb, surImage: surImage.length };
}

/* 7 et 8. En-tête, navigation et premier écran (page en haut, après l'ouverture). */
export function mesurerHaut() {
  const A = window.__audit;
  const pb = [];
  const ajouter = (controle, detail, el, niveau = 'echec') => pb.push({ controle, detail, selecteur: el ? A.sel(el) : '', niveau });
  const vh = innerHeight, vw = innerWidth;
  const entete = document.querySelector('[data-entete]') || document.querySelector('header');
  let basEntete = 0;
  if (entete && A.visible(entete)) {
    const r = entete.getBoundingClientRect();
    basEntete = Math.max(0, r.bottom);
    if (r.top < -1) ajouter('en-tête coupé en haut', `${Math.round(r.top)} px`, entete);
    if (r.bottom > vh) ajouter('en-tête plus haut que l’écran', '', entete);
    const s = getComputedStyle(entete);
    const fond = A.couleur(s.backgroundColor);
    if (fond[3] < 0.95 && s.backgroundImage === 'none') ajouter('en-tête transparent', `opacité du fond ${fond[3]}`, entete);
    if (s.backdropFilter && s.backdropFilter !== 'none') ajouter('flou derrière l’en-tête', s.backdropFilter, entete);
  } else if (!entete) ajouter('en-tête absent', '', null, 'regarder');

  /* Navigation : soit tous les liens tiennent sans se toucher, soit le bouton Menu est visible. */
  const bouton = document.querySelector('[data-menu-bouton]');
  const boutonVisible = bouton && A.visible(bouton);
  if (!boutonVisible) {
    const liens = [...document.querySelectorAll('[data-nav] a, header nav a')].filter((a) => !a.closest('[data-menu]'));
    const montres = liens.filter((a) => A.visible(a));
    if (!liens.length) ajouter('navigation absente', 'ni liens ni bouton Menu', entete, 'regarder');
    else if (montres.length < liens.length) ajouter('trou de navigation', `${liens.length - montres.length} lien(s) caché(s) sans bouton Menu`, liens.find((a) => !A.visible(a)));
    else {
      const rs = montres.map((a) => a.getBoundingClientRect());
      if (rs.some((r) => r.right > vw + 1 || r.left < -1)) ajouter('trou de navigation', 'des liens sortent de l’écran', montres[rs.findIndex((r) => r.right > vw + 1 || r.left < -1)]);
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
        if (Math.min(rs[i].right, rs[j].right) - Math.max(rs[i].left, rs[j].left) > 1 && Math.min(rs[i].bottom, rs[j].bottom) - Math.max(rs[i].top, rs[j].top) > 1) ajouter('liens de navigation qui se touchent', A.sel(montres[j]), montres[i]);
      }
      const ul = document.querySelector('[data-nav] ul');
      if (ul && ul.scrollWidth > ul.clientWidth + 1) ajouter('trou de navigation', 'les liens débordent de leur zone', ul);
    }
  }

  /* Premier écran : titre, bouton principal et information clé visibles sans défiler, au-dessus des barres fixes. */
  let hautBarres = vh;
  document.querySelectorAll('[data-barre-fixe]').forEach((b) => { if (A.visible(b)) hautBarres = Math.min(hautBarres, b.getBoundingClientRect().top); });
  const dansEcran = (el) => { const r = el.getBoundingClientRect(); return r.top >= basEntete - 2 && r.bottom <= hautBarres + 1 && r.left >= -1 && r.right <= vw + 1; };
  const h1 = [...document.querySelectorAll('h1')].find((h) => A.visible(h));
  if (!h1) ajouter('premier écran : titre h1 invisible', '', document.querySelector('h1'));
  else if (!dansEcran(h1)) ajouter('premier écran : titre hors de l’écran', `haut ${Math.round(h1.getBoundingClientRect().top)} px, bas ${Math.round(h1.getBoundingClientRect().bottom)} px, zone ${Math.round(basEntete)}–${Math.round(hautBarres)} px`, h1);
  const action = [...document.querySelectorAll('main [data-action-principale]')].find((a) => A.visible(a));
  if (document.querySelector('main[data-sans-action]')) { /* page sans action principale (pages légales) */ }
  else if (!document.querySelector('main [data-action-principale]')) ajouter('premier écran : aucun bouton principal marqué (data-action-principale)', '', null, 'regarder');
  else if (!action || !dansEcran(action)) ajouter('premier écran : bouton principal hors de l’écran', '', document.querySelector('main [data-action-principale]'));
  const info = document.querySelector('main [data-info-cle]');
  if (info && (!A.visible(info) || !dansEcran(info))) ajouter('premier écran : information clé hors de l’écran', '', info);
  return { problemes: pb, basEntete, hautBarres };
}

/* 5b. Éléments importants recouverts par autre chose (pile d'affichage réelle). */
export async function mesurerRecouvrements(max = 60) {
  const A = window.__audit;
  const pb = [];
  const style = document.createElement('style');
  style.textContent = '*{pointer-events:auto!important}';
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const cibles = [...document.querySelectorAll('main h1, main h2, main h3, main .bouton, main button, main [data-prix], main [data-repere], main [data-action-principale], main [data-info-cle]')]
    .filter((el) => A.visible(el) && !A.fixe(el) && !el.closest('[data-superpose], [data-galerie], .pin-spacer')).slice(0, max);
  const entete = document.querySelector('[data-entete]');
  for (const el of cibles) {
    const r0 = el.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, r0.top + scrollY - innerHeight / 3), behavior: 'instant' });
    await attendre(60);
    document.head.appendChild(style);
    const r = el.getBoundingClientRect();
    const points = [[0.5, 0.5], [0.15, 0.3], [0.85, 0.3], [0.15, 0.75], [0.85, 0.75]].map(([x, y]) => [r.left + r.width * x, r.top + r.height * y]);
    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const haut = document.elementFromPoint(x, y);
      if (!haut || haut === el || el.contains(haut) || haut.contains(el)) continue;
      if (A.fixe(haut) || haut.closest('[data-superpose], [data-audit-ignorer], [data-voile], [data-ouverture]')) continue;
      if (entete && entete.contains(haut)) continue;
      pb.push({ controle: 'élément recouvert', detail: `par ${A.sel(haut)}`, selecteur: A.sel(el), niveau: 'echec' });
      break;
    }
    style.remove();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  return pb;
}

/* Textes posés sur une image : leurs rectangles, pour mesurer le contraste sur la capture. */
export function textesSurImages(max = 40) {
  const A = window.__audit;
  const out = [];
  A.elementsTexte().filter((el) => A.visible(el) && !el.closest('[data-ouverture], [data-voile], [inert], .visuellement-cache, .mention-ia')).forEach((el) => {
    if (out.length >= max) return;
    const r = A.rectTexte(el);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cy < 0 || cy > innerHeight || r.width < 4) return;
    const pile = document.elementsFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), cy);
    const i = pile.indexOf(el);
    if (i < 0) return;
    let image = false;
    for (const sous of pile.slice(i + 1)) {
      if (/^(IMG|VIDEO|CANVAS)$/.test(sous.tagName)) { image = true; break; }
      const st = getComputedStyle(sous);
      if (st.backgroundImage !== 'none') { image = true; break; }
      if (A.couleur(st.backgroundColor)[3] >= 0.99) break;
    }
    if (!image) return;
    const s = getComputedStyle(el);
    out.push({ selecteur: A.sel(el), rect: { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }, couleur: A.couleur(s.color),
      grand: parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && parseInt(s.fontWeight, 10) >= 700),
      ombre: s.textShadow !== 'none', idx: out.length });
    el.setAttribute('data-audit-surimage', String(out.length - 1));
  });
  return out;
}

/* Test « tient dans l'écran » d'une section épinglée, à la position courante. */
export function mesurerEpingle(selecteurPin) {
  const A = window.__audit;
  const pin = document.querySelector(selecteurPin);
  if (!pin) return [];
  const pb = [];
  const vh = innerHeight, vw = innerWidth;
  const entete = document.querySelector('[data-entete]');
  let haut = 0;
  if (entete && A.visible(entete)) { const r = entete.getBoundingClientRect(); if (r.bottom > 0) haut = r.bottom; }
  let bas = vh;
  document.querySelectorAll('[data-barre-fixe]').forEach((b) => { if (A.visible(b)) { const r = b.getBoundingClientRect(); if (r.top < vh) bas = Math.min(bas, r.top); } });
  const marge = 4;
  const elements = [...pin.querySelectorAll('img, video, canvas, h1, h2, h3, h4, p, figcaption, button, a, li, [data-indicateur], .carte, [class*="progres"]')]
    .filter((el) => A.visible(el) && !el.closest('[data-audit-ignorer]'));
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    if (r.right <= 0 || r.left >= vw || r.width < 2 || r.height < 2) continue;
    if (r.top < haut - 1) { pb.push({ controle: 'ne tient pas dans l’écran', detail: `caché sous l'en-tête de ${Math.round(haut - r.top)} px`, selecteur: A.sel(el), niveau: 'echec' }); }
    else if (r.bottom > bas - marge + 0.5) { pb.push({ controle: 'ne tient pas dans l’écran', detail: `coupé en bas de ${Math.round(r.bottom - (bas - marge))} px`, selecteur: A.sel(el), niveau: 'echec' }); }
    if (pb.length >= 6) break;
  }
  return pb;
}
