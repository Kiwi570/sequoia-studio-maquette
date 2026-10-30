/* Scripts injectés avant le chargement de chaque page (addInitScript). */

/* Sonde générale : stabilité de la mise en page (CLS), tâches longues, appels requestAnimationFrame,
   enregistrement des durées d'image pendant le défilement (fluidité). */
export function sondeGenerale() {
  const raf0 = window.requestAnimationFrame.bind(window);
  window.__raf0 = raf0;
  window.__cls = 0; window.__clsDetail = []; window.__longues = []; window.__rafAppels = 0;
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        const epingle = (e.sources || []).length > 0 && (e.sources || []).every((s) => s.node && s.node.nodeType === 1 && !!s.node.closest('.pin-spacer'));
        window.__clsDetail.push({ t: Math.round(e.startTime), v: e.value, epingle, sources: (e.sources || []).map((s) => s.node && s.node.nodeType === 1 ? (s.node.tagName.toLowerCase() + (s.node.id ? '#' + s.node.id : '') + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) : '?').slice(0, 3) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longues.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  window.requestAnimationFrame = function (cb) { window.__rafAppels++; return raf0(cb); };
  window.__images = null;
  window.__demarrerImages = () => {
    window.__images = [];
    let avant = 0;
    const boucle = (t) => { if (!window.__images) return; if (avant) window.__images.push(t - avant); avant = t; raf0(boucle); };
    raf0(boucle);
  };
  window.__arreterImages = () => { const d = window.__images || []; window.__images = null; return d; };
  window.__erreursPage = [];
  window.addEventListener('error', (e) => window.__erreursPage.push(String(e.message || e)));
}

/* Sans WebGL : getContext renvoie null pour webgl et webgl2 (le site doit montrer sa version de repli). */
export function sondeSansWebgl() {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...r) {
    if (/webgl/i.test(type)) return null;
    return orig.call(this, type, ...r);
  };
  if (window.OffscreenCanvas) {
    const o2 = OffscreenCanvas.prototype.getContext;
    OffscreenCanvas.prototype.getContext = function (type, ...r) { return /webgl/i.test(type) ? null : o2.call(this, type, ...r); };
  }
}

/* Échantillonneur des films : à chaque image, l'état visible / caché des éléments du premier écran,
   et si le voile ou le panneau d'ouverture couvre l'écran. Démarre avant l'exécution des scripts du site. */
export function sondeFilm() {
  const raf0 = window.__raf0 || window.requestAnimationFrame.bind(window);
  const S = (window.__sonde = { echantillons: [], candidats: [], premier: null, demarre: false });
  const sel = (el) => {
    const p = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) { p.unshift(s + '#' + e.id); break; }
      const c = [...e.classList].slice(0, 2); if (c.length) s += '.' + c.join('.');
      p.unshift(s);
    }
    const t = (el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return p.join(' > ') + (t ? ` « ${t} »` : '');
  };
  const couvre = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.95) return false;
    const r = el.getBoundingClientRect();
    const de = document.documentElement;
    /* La gouttière de la barre de défilement (20 px au plus, à droite) n'est pas à couvrir. */
    return r.top <= 1 && r.left <= 1 && r.bottom >= de.clientHeight - 1 && r.right >= Math.min(de.clientWidth, innerWidth) - 20;
  };
  const choisir = () => {
    const vh = innerHeight, vw = innerWidth;
    S.candidats = [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, main button, main img, main video, main canvas, main figure, [data-anime], [data-info-cle], header a, header img')]
      .filter((el) => !el.closest('[data-ouverture], [data-voile], [data-menu], [data-ephemere], [data-audit-ignorer], .visuellement-cache'))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; })
      .slice(0, 80);
    S.noms = S.candidats.map(sel);
  };
  const echantillon = () => {
    const cache = new Map();
    const opacite = (el) => {
      if (!el || el.nodeType !== 1) return 1;
      if (cache.has(el)) return cache.get(el);
      const s = getComputedStyle(el);
      let o = s.display === 'none' ? 0 : parseFloat(s.opacity) * opacite(el.parentElement);
      cache.set(el, o);
      return o;
    };
    const voile = document.querySelector('[data-voile]');
    const panneau = document.querySelector('[data-ouverture]');
    const couvert = couvre(voile) || couvre(panneau);
    const etats = S.candidats.map((el) => {
      if (!el.isConnected) return 'x';
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden') return 'i';
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return 'i';
      const o = opacite(el);
      return o >= 0.6 ? 'v' : o <= 0.05 ? 'i' : 'p';
    });
    const ouv = panneau ? (() => {
      const s = getComputedStyle(panneau), r = panneau.getBoundingClientRect();
      const entete = document.querySelector('[data-entete]');
      const re = entete ? entete.getBoundingClientRect() : null;
      return { affiche: s.display !== 'none' && s.visibility !== 'hidden' && opacite(panneau) > 0.9,
        dedans: r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1,
        sousEntete: !!(re && s.position !== 'fixed' && r.top < re.bottom - 1 && getComputedStyle(entete).visibility !== 'hidden') };
    })() : null;
    S.echantillons.push({ t: Math.round(performance.now()), couvert, voile: couvre(voile), etats, ouverture: ouv, intro: window.__socle ? window.__socle.intro : null });
  };
  const demarrer = () => {
    if (S.demarre) return;
    S.demarre = true;
    choisir();
    echantillon();
    S.premier = S.echantillons[0];
    const fin = performance.now() + 4500;
    const boucle = () => { if (performance.now() > fin) return; echantillon(); raf0(boucle); };
    raf0(boucle);
  };
  document.addEventListener('readystatechange', () => { if (document.readyState === 'interactive') demarrer(); });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    S.echantillons = []; S.demarre = false; S.restaure = true;
    demarrer();
  });
}

/* Bords de l'écran : à chaque image, les panneaux affichés (intro, voile, menu, [data-recouvrement]) avec leur
   position, leur opacité et leur couleur, horodatés sur l'horloge du système comme les images des films.
   Les relevés partent vers l'audit au fil de l'eau (fonction __auditBords) : ils survivent au changement de page. */
export function sondeBords() {
  const raf0 = window.__raf0 || window.requestAnimationFrame.bind(window);
  let lot = [];
  const envoyer = () => {
    if (!lot.length || typeof window.__auditBords !== 'function') return;
    const l = lot; lot = [];
    try { Promise.resolve(window.__auditBords(l)).catch(() => {}); } catch (e) {}
  };
  const releve = () => {
    const de = document.documentElement;
    const couches = [];
    document.querySelectorAll('[data-ouverture], [data-voile], [data-menu], [data-recouvrement]').forEach((el) => {
      const s = getComputedStyle(el);
      const op = parseFloat(s.opacity);
      if (s.display === 'none' || s.visibility === 'hidden' || !(op > 0.01)) return;
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return;
      const nom = el.matches('[data-ouverture]') ? 'intro' : el.matches('[data-voile]') ? 'voile' : el.matches('[data-menu]') ? 'menu' : 'panneau';
      couches.push({ nom, haut: r.top, bas: r.bottom, gauche: r.left, droite: r.right, op, z: parseInt(s.zIndex, 10) || 0, fond: s.backgroundColor, clip: s.clipPath });
    });
    lot.push({ t: Date.now(), couches, bord: de.getBoundingClientRect().width, w: innerWidth, h: innerHeight, url: location.pathname });
    if (lot.length >= 10) envoyer();
    raf0(releve);
  };
  raf0(releve);
  setInterval(envoyer, 120);
  window.addEventListener('pagehide', envoyer);
}
