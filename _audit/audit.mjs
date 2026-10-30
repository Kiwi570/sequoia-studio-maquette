#!/usr/bin/env node
/* Audit automatique d'une maquette, avant chaque livraison (v1 comprise).
   Usage, depuis la racine du projet :
     node _audit/audit.mjs                 audit complet : toutes les tailles dans tous les modes (avant une livraison)
     node _audit/audit.mjs --rapide        tailles réduites, pendant la construction seulement (jamais pour livrer)
     node _audit/audit.mjs --pages=/,/contact --seulement=fichiers,mesures,films,bords,parcours,ecran,fluidite,vitesse,captures,safari
   Résultat : _audit/rapport/rapport.md (+ rapport.json, captures/, films/, comparaisons/). Code de sortie 1 s'il reste un échec.
   Le rapport dit aussi ce qui n'a pas pu être lancé : rien n'est passé sous silence. */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { demarrerServeur } from './serveur.mjs';
import { installerOutils, defilerTout, mesurer, mesurerHaut, mesurerRecouvrements, textesSurImages, mesurerEpingle } from './page.mjs';
import { analyserFilm, contrasteSurImage, differenceImages, analyserBords } from './images.mjs';
import { sondeGenerale, sondeSansWebgl, sondeFilm, sondeBords } from './sondes.mjs';
import { controlesStatiques } from './statique.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { console.error('Playwright est introuvable : l’audit ne peut pas se lancer.'); process.exit(2); }
const { chromium, webkit } = playwright;

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(args.racine || join(ici, '..'));
const sortie = join(ici, 'rapport');
rmSync(sortie, { recursive: true, force: true });
for (const d of ['captures', 'films', 'comparaisons']) mkdirSync(join(sortie, d), { recursive: true });
const lireJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const config = lireJson(join(ici, 'config.json')) || {};
const site = lireJson(join(racine, 'donnees/site.json')) || {};
const siteActuel = config.siteActuel || site.siteActuel || '';
const versionLivree = existsSync(join(ici, 'version-livree.txt')) ? readFileSync(join(ici, 'version-livree.txt'), 'utf8').trim() : '';
const seulement = args.seulement ? String(args.seulement).split(',') : null;
const faire = (nom) => !seulement || seulement.includes(nom);
const debut = Date.now();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
/* Aucune étape ne peut bloquer l'audit : au-delà du délai, elle échoue et le rapport le dit. */
const limite = (promesse, ms, nom) => Promise.race([promesse, new Promise((_, ko) => setTimeout(() => ko(new Error(`${nom} : plus de ${Math.round(ms / 1000)} s`)), ms))]);
/* axe-core est rangé dans le dossier de l'audit (axe.min.js) : aucune installation npm nécessaire.
   Une version installée avec npm dans _audit/ ou à la racine est utilisée seulement si le fichier manque. */
let axeSource = null, axeVersion = '';
for (const f of [join(ici, 'axe.min.js'), join(ici, 'vendor/axe.min.js')]) {
  if (!axeSource && existsSync(f)) axeSource = readFileSync(f, 'utf8');
}
if (!axeSource) { try { axeSource = readFileSync(require.resolve('axe-core/axe.min.js', { paths: [ici, racine] }), 'utf8'); } catch {} }
if (axeSource) axeVersion = (axeSource.match(/axe v(\d+\.\d+\.\d+)/) || [])[1] || '';

/* ---------- Rapport ---------- */
class Rapport {
  constructor() { this.items = []; this.nonLances = []; this.oks = new Map(); this.infos = []; this.safari = false; }
  ajouter(niveau, controle, detail = '', ctx = {}) { this.items.push({ niveau, controle, detail, ...ctx }); }
  echec(c, d, ctx) { this.ajouter('echec', c, d, ctx); }
  regarder(c, d, ctx) { this.ajouter('regarder', c, d, ctx); }
  nonLance(c, raison) { this.nonLances.push({ controle: c, raison }); }
  ok(c, n = 1) { this.oks.set(c, (this.oks.get(c) || 0) + n); }
  info(t) { this.infos.push(t); }
  /* Une tentative qui échoue (film relancé) ne laisse rien dans le rapport. */
  marque() { return { items: this.items.length, nonLances: this.nonLances.length, infos: this.infos.length, oks: new Map(this.oks) }; }
  revenir(m) { this.items.length = m.items; this.nonLances.length = m.nonLances; this.infos.length = m.infos; this.oks = m.oks; }
}
const R = new Rapport();
async function tache(nom, fn) {
  if (!faire(nom.split(':')[0])) return;
  const t0 = Date.now();
  process.stdout.write(`… ${nom}\n`);
  try { await limite(fn(), 25 * 60000, nom); } catch (err) { R.nonLance(nom, String((err && err.message) || err).split('\n')[0]); }
  process.stdout.write(`  fait en ${Math.round((Date.now() - t0) / 1000)} s\n`);
}

/* ---------- Tailles et modes ---------- */
const TAILLES = [
  [320, 568, true], [375, 667, true], [390, 844, true], [844, 390, true], [768, 1024, true], [1024, 768, true],
  [1000, 560, false], [1280, 720, false], [1366, 768, false], [1440, 900, false], [1728, 1000, false], [1920, 1080, false], [2560, 1440, false],
].map(([w, h, tactile]) => ({ nom: `${w}×${h}`, w, h, tactile }));
const T = (nom) => TAILLES.find((t) => t.nom === nom);
const RAPIDE = !!args.rapide;
const TAILLES_NORMAL = RAPIDE ? ['320×568', '390×844', '768×1024', '1366×768', '1920×1080'].map(T) : TAILLES;
/* Avant une livraison : toutes les tailles dans tous les modes. --rapide ne sert que pendant la construction. */
const TAILLES_AUTRES = RAPIDE ? ['390×844', '1366×768'].map(T) : TAILLES;
const TAILLES_EPINGLE = ['1000×560', '1024×640', '1280×720', '1366×768', '1440×900', '1728×1000', '1920×1080', '2560×1440']
  .map((n) => T(n) || { nom: n, w: +n.split('×')[0], h: +n.split('×')[1], tactile: false });

/* ---------- Navigateur ---------- */
const serveur = await demarrerServeur(racine);
const BASE = serveur.adresse;
const navigateur = await chromium.launch();
const pageAnalyse = await (await navigateur.newContext()).newPage();

async function contexte({ taille, mode = 'normal', film = false, bords = false, ua, plateforme, nav = navigateur } = {}) {
  const releves = [];
  const ctx = await nav.newContext({
    viewport: { width: taille.w, height: taille.h }, deviceScaleFactor: 1, ...(nav === navigateur ? { isMobile: !!taille.tactile } : {}), hasTouch: !!taille.tactile,
    reducedMotion: mode === 'calme' ? 'reduce' : 'no-preference', javaScriptEnabled: mode !== 'sansJs', userAgent: ua, locale: 'fr-FR',
  });
  if (mode !== 'sansJs') {
    await ctx.addInitScript(sondeGenerale);
    if (mode === 'sansWebgl') await ctx.addInitScript(sondeSansWebgl);
    if (film) await ctx.addInitScript(sondeFilm);
    if (bords) { await ctx.exposeFunction('__auditBords', (lot) => { releves.push(...lot); }); await ctx.addInitScript(sondeBords); }
    if (plateforme) await ctx.addInitScript((p) => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => p }); }, plateforme);
  }
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push('console : ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => erreurs.push('erreur : ' + String(e.message).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) erreurs.push(`ressource ${r.status()} : ${r.url().slice(BASE.length)}`); });
  /* Sans JavaScript, les scripts non chargés ne sont pas des erreurs. */
  page.on('requestfailed', (r) => { if (mode !== 'sansJs' && r.url().startsWith(BASE) && !/net::ERR_ABORTED/.test((r.failure() || {}).errorText || '')) erreurs.push(`ressource en échec : ${r.url().slice(BASE.length)}`); });
  return { ctx, page, erreurs, releves };
}

async function attendrePret(page, { delai = 9000, sansJs = false } = {}) {
  if (sansJs) { await page.waitForLoadState('load'); await attendre(400); return 'sansJs'; }
  try {
    await page.waitForFunction(() => document.documentElement.classList.contains('pret') || (window.__socle && window.__socle.pret), null, { timeout: delai });
    return await page.evaluate(() => (window.__socle ? window.__socle.intro : 'pret'));
  } catch {
    const socle = await page.evaluate(() => !!window.__socle).catch(() => false);
    if (!socle) { await attendre(3500); return 'sans-socle'; }
    return 'jamais-pret';
  }
}

/* ---------- Pages ---------- */
let pagesRel = [];
let textesEtrangers = {};
await tache('fichiers', async () => {
  const s = controlesStatiques(racine, { siteActuel, rapport: R, versionLivree });
  pagesRel = s.pages;
  textesEtrangers = s.textesEtrangers;
  if (s.version) R.info(`Numéro de version des fichiers : ?v=${s.version}`);
});
if (!pagesRel.length) pagesRel = ['index.html'];
const versUrl = (rel) => '/' + rel.replace(/\\/g, '/').replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '').replace(/\/$/, '');
let PAGES = pagesRel.map((rel) => ({ rel, url: versUrl(rel) || '/' }));
if (args.pages) { const voulu = String(args.pages).split(','); PAGES = PAGES.filter((p) => voulu.includes(p.url)); }
PAGES.sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.url.localeCompare(b.url)));
const PAGES_CONTENU = PAGES.filter((p) => !/(^|\/)404\.html$/.test(p.rel));
const langueDe = (rel) => { const h = readFileSync(join(racine, rel), 'utf8'); return ((h.match(/<html[^>]*\slang=["']([^"']+)/i) || [])[1] || 'fr').slice(0, 2); };
const ctxPage = (p, taille, mode) => ({ page: p.url, taille: taille.nom, mode });
const noter = (liste, p, taille, mode) => liste.forEach((x) => R.ajouter(x.niveau || 'echec', x.controle, x.detail, { ...ctxPage(p, taille, mode), selecteur: x.selecteur }));
const noterErreurs = (erreurs, p, taille, mode) => [...new Set(erreurs)].forEach((e) => R.echec('erreur de console ou ressource', e, ctxPage(p, taille, mode)));

/* ---------- 1. Mesures ---------- */
async function mesurerUne(p, taille, mode) {
  const { ctx, page, erreurs } = await contexte({ taille, mode });
  try {
    await page.goto(BASE + p.url, { waitUntil: 'load' });
    const etat = await attendrePret(page, { sansJs: mode === 'sansJs' });
    if (etat === 'jamais-pret') R.echec('ouverture', 'la page ne signale jamais qu’elle est prête (html.pret)', ctxPage(p, taille, mode));
    await page.evaluate(installerOutils);
    if (mode !== 'sansJs') await attendre(1200); /* apparitions du premier écran terminées */
    const haut = await page.evaluate(mesurerHaut);
    noter(haut.problemes, p, taille, mode);
    if (mode === 'sansJs') {
      /* Sans JavaScript, les minuteries de la page ne tournent pas : on fait défiler depuis l'audit. */
      const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (let y = 0; y <= h; y += taille.h * 0.8) { await page.evaluate((y) => window.scrollTo(0, y), y); await attendre(30); }
      await page.evaluate(() => window.scrollTo(0, 0));
    } else await limite(page.evaluate(defilerTout, { pas: 0.7, pause: mode === 'calme' ? 40 : 110 }), 60000, 'défilement complet');
    const langue = langueDe(p.rel);
    const res = await page.evaluate(mesurer, {
      galeriesStatiques: mode === 'calme' || mode === 'sansJs', tactile: taille.tactile,
      structure: ['390×844', '1366×768'].includes(taille.nom) && mode !== 'sansWebgl',
      textesEtrangers: mode === 'normal' && ['390×844', '1366×768'].includes(taille.nom) ? (textesEtrangers[langue] || []) : [],
      francais: langue === 'fr' && mode === 'normal' && taille.nom === '1366×768',
    });
    noter(res.problemes, p, taille, mode);
    if (mode === 'normal' && ['390×844', '768×1024', '1366×768', '1920×1080'].includes(taille.nom)) {
      noter(await limite(page.evaluate(mesurerRecouvrements, 60), 60000, 'recouvrements'), p, taille, mode);
    }
    if (mode === 'normal' && ['390×844', '1366×768'].includes(taille.nom)) await limite(contrastesSurImages(page, p, taille), 90000, 'contrastes sur image');
    if (axeSource && mode === 'calme' && ['390×844', '1366×768'].includes(taille.nom)) {
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'], resultTypes: ['violations'] })).violations
        .map((x) => ({ id: x.id, aide: x.help, impact: x.impact, noeuds: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })));
      v.forEach((x) => R.ajouter(x.impact === 'minor' ? 'regarder' : 'echec', `accessibilité (axe) : ${x.id}`, x.aide, { ...ctxPage(p, taille, mode), selecteur: x.noeuds.join(' ; ') }));
    }
    if (mode === 'sansJs') {
      const lisible = await page.evaluate(() => { const h = document.querySelector('h1'); return !!h && getComputedStyle(h).opacity === '1' && document.body.innerText.trim().length > 80; });
      if (!lisible) R.echec('sans JavaScript', 'le contenu n’est pas lisible', ctxPage(p, taille, mode));
    }
    noterErreurs(erreurs, p, taille, mode);
    R.ok('mesures');
  } finally { await ctx.close(); }
}

async function contrastesSurImages(page, p, taille) {
  const items = await page.evaluate(textesSurImages, 25);
  for (const it of items) {
    const clip = await page.evaluate(({ idx, y }) => {
      const el = document.querySelector(`[data-audit-surimage="${idx}"]`);
      if (!el) return null;
      window.scrollTo({ top: Math.max(0, y - innerHeight / 3), behavior: 'instant' });
      el.style.setProperty('color', 'transparent', 'important');
      el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      el.style.setProperty('text-shadow', 'none', 'important');
      const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect();
      return { x: Math.max(0, b.left), y: Math.max(0, b.top), width: Math.min(innerWidth - Math.max(0, b.left), b.width), height: Math.min(innerHeight - Math.max(0, b.top), b.height) };
    }, { idx: it.idx, y: it.rect.y });
    await attendre(80);
    if (clip && clip.width > 2 && clip.height > 2) {
      const b64 = (await page.screenshot({ clip, type: 'png' })).toString('base64');
      const { p10 } = await pageAnalyse.evaluate(contrasteSurImage, { b64, couleur: it.couleur });
      const seuil = it.grand ? 3 : 4.5;
      if (p10 < seuil) R.ajouter(it.ombre ? 'regarder' : 'echec', 'contraste sur image', `${p10.toFixed(2)}:1 sur les 10 % de la photo les moins favorables (minimum ${seuil}:1)${it.ombre ? ', ombre portée à vérifier' : ''}`, { ...ctxPage(p, taille, 'normal'), selecteur: it.selecteur });
    }
    await page.evaluate((idx) => { const el = document.querySelector(`[data-audit-surimage="${idx}"]`); if (el) { el.style.removeProperty('color'); el.style.removeProperty('-webkit-text-fill-color'); el.style.removeProperty('text-shadow'); } }, it.idx);
  }
}

if (!axeSource) R.nonLance('axe-core', 'axe.min.js absent du dossier _audit/ (il est fourni avec la skill) : les contrôles d’accessibilité intégrés ont tourné à la place');
else R.info(`Accessibilité : axe-core ${axeVersion || '(version inconnue)'} en plus des contrôles intégrés.`);
await tache('mesures', async () => {
  const travaux = [];
  for (const p of PAGES) {
    for (const t of TAILLES_NORMAL) travaux.push([p, t, 'normal']);
    for (const t of TAILLES_AUTRES) for (const m of ['calme', 'sansWebgl', 'sansJs']) travaux.push([p, t, m]);
  }
  let i = 0;
  const ouvrier = async () => {
    while (i < travaux.length) {
      const [p, t, m] = travaux[i++];
      try { await limite(mesurerUne(p, t, m), 180000, 'mesures'); } catch (e) { R.nonLance(`mesures ${p.url} ${t.nom} ${m}`, String(e.message).split('\n')[0]); }
    }
  };
  const suivi = setInterval(() => process.stdout.write(`  ${Math.min(i, travaux.length)}/${travaux.length}\n`), 30000);
  await Promise.all([1, 2, 3, 4].map(ouvrier));
  clearInterval(suivi);
});

/* Balayage de toutes les largeurs de 320 à 1920 px : débordements et navigation. */
await tache('mesures:balayage', async () => {
  for (const p of PAGES_CONTENU) {
    const { ctx, page, erreurs } = await contexte({ taille: { nom: 'balayage', w: 320, h: 800, tactile: false } });
    try {
      await page.goto(BASE + p.url, { waitUntil: 'load' });
      await attendrePret(page);
      await page.evaluate(installerOutils);
      const fautes = new Map();
      for (let w = 320; w <= 1920; w += 20) {
        await page.setViewportSize({ width: w, height: 800 });
        await attendre(70);
        const r = await page.evaluate(() => {
          const out = [];
          const large = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          if (large > innerWidth + 1) out.push(['débordement horizontal', `page large de ${large} px`]);
          const m = window.__audit;
          const bouton = document.querySelector('[data-menu-bouton]');
          if (!(bouton && m.visible(bouton))) {
            const liens = [...document.querySelectorAll('[data-nav] a, header nav a')].filter((a) => !a.closest('[data-menu]'));
            const caches = liens.filter((a) => !m.visible(a)).length;
            const ul = document.querySelector('[data-nav] ul');
            if (liens.length && caches) out.push(['trou de navigation', `${caches} lien(s) caché(s) sans bouton Menu`]);
            else if (ul && ul.scrollWidth > ul.clientWidth + 1) out.push(['trou de navigation', 'les liens débordent de leur zone']);
          }
          return out;
        });
        r.forEach(([c, d]) => { if (!fautes.has(c)) fautes.set(c, { d, l: [] }); fautes.get(c).l.push(w); });
      }
      for (const [c, { d, l }] of fautes) R.echec(c, `${d} — largeurs : ${l.length > 6 ? l[0] + ' à ' + l[l.length - 1] + ' px (' + l.length + ' largeurs)' : l.join(', ') + ' px'}`, { page: p.url, taille: 'balayage 320–1920', mode: 'normal' });
      noterErreurs(erreurs, p, { nom: 'balayage' }, 'normal');
      R.ok('balayage');
    } finally { await ctx.close(); }
  }
});

/* ---------- 2. Films : ouverture, transitions, retour, ancre, épinglage ---------- */
/* Pour vérifier la nouvelle tentative : AUDIT_SIMULER_ECHEC_FILM=N fait échouer les N premiers démarrages de film. */
let echecsSimules = +(process.env.AUDIT_SIMULER_ECHEC_FILM || 0);

async function demarrerFilm(page, { largeur = 640, hauteur = 640, qualite = 60 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const images = [];
  let t0 = 0;
  cdp.on('Page.screencastFrame', (f) => {
    const abs = f.metadata.timestamp * 1000;
    if (!t0) t0 = abs;
    images.push({ b64: f.data, t: abs - t0, abs });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  try {
    if (echecsSimules > 0) { echecsSimules--; throw new Error('Page.startScreencast: Not attached to an active page (échec simulé)'); }
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: qualite, maxWidth: largeur, maxHeight: hauteur, everyNthFrame: 1 });
  } catch (e) { await cdp.detach().catch(() => {}); throw e; }
  return { cdp, images };
}

async function filmer(page, action, { duree = 4000, apres = false, largeur, hauteur, qualite } = {}) {
  /* apres : le film démarre une fois la nouvelle page engagée (sans l'image vide d'avant la navigation).
     Un démarrage qui échoue avant l'action est retenté sur le même onglet ; après une navigation (apres),
     c'est le film entier qui est relancé (voir filmAvecReprise). */
  if (apres) await action();
  let film = null, erreur = null;
  for (let essai = 0; essai < (apres ? 1 : 3) && !film; essai++) {
    try { film = await demarrerFilm(page, { largeur, hauteur, qualite }); } catch (e) { erreur = e; await attendre(300); }
  }
  if (!film) throw erreur;
  if (!apres) await action();
  await attendre(duree);
  await film.cdp.send('Page.stopScreencast').catch(() => {});
  await film.cdp.detach().catch(() => {});
  return film.images;
}

/* Un film qui échoue (onglet détaché, session perdue…) est relancé entièrement, dans un nouvel onglet,
   avant d'être classé « Non lancé ». Rien de la tentative ratée ne reste dans le rapport. */
const TENTATIVES_FILM = 3;
async function filmAvecReprise(nom, fn) {
  let derniere = '';
  for (let essai = 1; essai <= TENTATIVES_FILM; essai++) {
    const m = R.marque();
    try {
      await fn();
      if (essai > 1) R.info(`${nom} : réussi à la tentative ${essai} (avant : ${derniere})`);
      return true;
    } catch (e) {
      R.revenir(m);
      derniere = String((e && e.message) || e).split('\n')[0];
      if (essai < TENTATIVES_FILM) await attendre(500 * essai);
    }
  }
  R.nonLance(nom, `${derniere} (${TENTATIVES_FILM} tentatives)`);
  return false;
}

async function analyser(images, nom, { fond = null } = {}) {
  if (!images.length) return { stats: [], pb: [], marques: [] };
  const { stats } = await pageAnalyse.evaluate(analyserFilm, { images, max: 0 });
  const marques = [];
  const pb = [];
  const fondClair = fond ? (0.2126 * fond[0] + 0.7152 * fond[1] + 0.0722 * fond[2]) / 255 > 0.85 : false;
  stats.forEach((s, i) => {
    if (!fondClair && s.moyenne > 0.93 && s.ecart < 0.035) { marques.push(i); pb.push(['echec', 'image blanche', `à ${Math.round(s.t)} ms`]); }
    const suivante = stats[i + 1];
    /* Une image isolée, différente de la précédente et de la suivante, qui se ressemblent : un flash. */
    if (i > 0 && suivante && s.diff > 0.12 && suivante.diff > 0.12 && suivante.t - stats[i - 1].t < 160 && Math.abs(stats[i - 1].moyenne - suivante.moyenne) < 0.04) {
      marques.push(i); pb.push(['echec', 'image isolée différente (flash)', `à ${Math.round(s.t)} ms`]); return;
    }
    if (i > 0 && s.diff > 0.2 && s.t - stats[i - 1].t < 90) { marques.push(i); pb.push(['regarder', 'changement brusque', `à ${Math.round(s.t)} ms (différence ${(s.diff * 100).toFixed(0)} %)`]); }
  });
  const { planche } = await pageAnalyse.evaluate(analyserFilm, { images, marques, max: 30 });
  if (planche) writeFileSync(join(sortie, 'films', nom + '.png'), Buffer.from(planche, 'base64'));
  return { stats, pb, marques };
}

function analyserSonde(S) {
  const out = [];
  if (!S || !S.echantillons || !S.echantillons.length) return out;
  (S.noms || []).forEach((nom, k) => {
    const seq = S.echantillons.filter((e) => !e.couvert).map((e) => e.etats[k]).filter((x) => x === 'v' || x === 'i');
    if (!seq.length) return;
    let vu = false, cacheApres = false, revenu = false;
    for (const x of seq) {
      if (x === 'v') { if (cacheApres) revenu = true; vu = true; }
      if (x === 'i' && vu) cacheApres = true;
    }
    if (revenu) out.push(['echec', 'élément visible, caché puis réaffiché (flash)', nom]);
    else if (cacheApres && seq[seq.length - 1] === 'i') out.push(['echec', 'élément qui apparaît puis disparaît', nom]);
  });
  return out;
}

const fondDe = async (page) => page.evaluate(() => { const m = getComputedStyle(document.documentElement).backgroundColor.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : null; }).catch(() => null);
const nomFichier = (x) => x.replace(/\//g, '-').replace(/-+/g, '-').replace(/-$/, '');

await tache('films', async () => {
  for (const taille of ['1366×768', '390×844'].map(T)) {
    /* Ouverture de chaque page, en arrivant de l'extérieur. */
    for (const p of PAGES_CONTENU) {
      await filmAvecReprise(`film de l'ouverture ${p.url} ${taille.nom}`, async () => {
      const { ctx, page, erreurs } = await contexte({ taille, film: true });
      try {
        await limite((async () => {
          const nom = nomFichier(`ouverture${p.url}-${taille.w}`);
          const images = await filmer(page, () => page.goto(BASE + p.url, { waitUntil: 'commit' }), { duree: 4200, apres: true });
          await attendrePret(page);
          const S = await page.evaluate(() => window.__sonde).catch(() => null);
          const lieu = { page: p.url, taille: taille.nom, mode: 'film' };
          const { pb } = await analyser(images, nom, { fond: await fondDe(page) });
          pb.forEach(([n, c, d]) => R.ajouter(n, `ouverture : ${c}`, `${d} (films/${nom}.png)`, lieu));
          analyserSonde(S).forEach(([n, c, s]) => R.ajouter(n, `ouverture : ${c}`, '', { ...lieu, selecteur: s }));
          if (S && S.premier) {
            if (!S.premier.ouverture) R.regarder('ouverture : aucun élément d’ouverture marqué (data-ouverture)', '', lieu);
            else {
              if (!S.premier.ouverture.affiche) R.echec('ouverture : élément d’ouverture invisible à la première image', '', lieu);
              if (!S.premier.ouverture.dedans) R.echec('ouverture : élément d’ouverture coupé à la première image', '', lieu);
              if (S.premier.ouverture.sousEntete) R.echec('ouverture : élément d’ouverture caché sous l’en-tête', '', lieu);
            }
          }
          const duree = await page.evaluate(() => {
            const m = performance.getEntriesByName('socle:pret')[0]; const n = performance.getEntriesByType('navigation')[0];
            return m && n ? Math.round(m.startTime - n.responseStart) : null;
          });
          if (duree == null) R.nonLance(`durée de l'ouverture ${p.url}`, 'repère socle:pret absent');
          else if (duree > 3000) R.echec('ouverture : plus de 3 s', `${duree} ms depuis le premier octet`, lieu);
          else R.info(`Ouverture ${p.url} (${taille.nom}) : ${duree} ms depuis le premier octet`);
          const intro = await page.evaluate(() => window.__socle && window.__socle.intro);
          if (intro && intro !== 'jouee') R.echec('intro non jouée à l’arrivée sur le site', `état : ${intro}`, lieu);
          const cls = await page.evaluate(() => window.__cls || 0);
          if (cls > 0.05) R.echec('stabilité au chargement (CLS)', `${cls.toFixed(3)} (0 visé, 0,05 au plus)`, { ...lieu, mode: 'premier chargement', selecteur: await page.evaluate(() => (window.__clsDetail || []).flatMap((d) => d.sources).slice(0, 3).join(' ; ')) });
          noterErreurs(erreurs, p, taille, 'film');
          R.ok('films d’ouverture');
        })(), 60000, 'film');
      } finally { await ctx.close().catch(() => {}); }
      });
    }
    /* Transition vers une autre page, puis retour arrière et avant. */
    for (let k = 0; k < PAGES_CONTENU.length; k++) {
      const p = PAGES_CONTENU[k];
      await filmAvecReprise(`film de la transition depuis ${p.url} ${taille.nom}`, async () => {
      const { ctx, page, erreurs } = await contexte({ taille, film: true });
      try {
        await limite((async () => {
          await page.goto(BASE + p.url, { waitUntil: 'load' });
          await attendrePret(page);
          const cible = await page.evaluate(() => {
            const norm = (u) => new URL(u, location.href).pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1');
            const liens = [...document.querySelectorAll('a[href]')].filter((a) => { try { const u = new URL(a.href); return u.origin === location.origin && norm(a.href) !== norm(location.href) && !a.hash && !a.target && !a.hasAttribute('download'); } catch { return false; } });
            const a = liens.find((x) => x.closest('[data-nav]')) || liens.find((x) => x.closest('main')) || liens[0];
            if (!a) return null;
            a.setAttribute('data-audit-cible', '1');
            return new URL(a.href).pathname;
          });
          if (!cible) { R.regarder('transition', 'aucun lien vers une autre page', { page: p.url, taille: taille.nom }); return; }
          const nom = nomFichier(`transition${p.url}-vers${cible}-${taille.w}`);
          const lieu = { page: `${p.url} → ${cible}`, taille: taille.nom, mode: 'film' };
          const images = await filmer(page, () => page.evaluate(() => document.querySelector('[data-audit-cible]').click()), { duree: 3200 });
          await attendrePret(page);
          const S = await page.evaluate(() => window.__sonde).catch(() => null);
          const { pb } = await analyser(images, nom, { fond: await fondDe(page) });
          pb.forEach(([n, c, d]) => R.ajouter(n, `transition : ${c}`, `${d} (films/${nom}.png)`, lieu));
          analyserSonde(S).forEach(([n, c, s]) => R.ajouter(n, `transition : ${c}`, '', { ...lieu, selecteur: s }));
          const etat = await page.evaluate(() => ({ intro: window.__socle && window.__socle.intro, arrivee: document.documentElement.dataset.arrivee }));
          if (etat.intro === 'jouee') R.echec('intro jouée sur un changement de page interne', '', lieu);
          else if (etat.arrivee !== 'voile') R.echec('changement de page interne sans voile', `arrivée : ${etat.arrivee}`, lieu);
          if (S && S.premier && !S.premier.voile) R.echec('transition : le voile ne couvre pas l’écran dès l’arrivée', '', lieu);
          if (k === 0) {
            /* Retour arrière puis avant : état final directement, jamais d'intro, aucun voile resté. */
            for (const sens of ['arrière', 'avant']) {
              const nomR = `retour-${sens}-${taille.w}`;
              const imagesR = await filmer(page, () => (sens === 'arrière' ? page.goBack() : page.goForward()), { duree: 1600 });
              await attendrePret(page, { delai: 4000 });
              const { pb: pbR } = await analyser(imagesR, nomR, { fond: await fondDe(page) });
              const lieuR = { page: sens === 'arrière' ? p.url : cible, taille: taille.nom, mode: `retour ${sens}` };
              pbR.forEach(([n, c, d]) => R.ajouter(n, `retour ${sens} : ${c}`, `${d} (films/${nomR}.png)`, lieuR));
              const r = await page.evaluate(() => {
                const v = document.querySelector('[data-voile]');
                const vr = v && v.getBoundingClientRect(), vs = v && getComputedStyle(v);
                const S = window.__sonde;
                let reanime = [];
                if (S && S.echantillons.length > 2) {
                  const premier = S.echantillons[0], dernier = S.echantillons[S.echantillons.length - 1];
                  reanime = S.noms.filter((n, k) => premier.etats[k] === 'i' && dernier.etats[k] === 'v').slice(0, 4);
                }
                return { intro: window.__socle && window.__socle.intro, voile: !!(v && vs.visibility !== 'hidden' && vr.top < innerHeight - 2 && vr.bottom > 2), reanime };
              });
              if (r.intro === 'jouee') R.echec(`intro rejouée au retour ${sens}`, '', lieuR);
              if (r.voile) R.echec(`voile resté à l’écran au retour ${sens}`, '', lieuR);
              r.reanime.forEach((s) => R.regarder(`au retour ${sens}, élément qui réapparaît en s’animant`, '', { ...lieuR, selecteur: s }));
            }
          }
          noterErreurs(erreurs, p, taille, 'film');
          R.ok('films de transition');
        })(), 60000, 'film');
      } finally { await ctx.close().catch(() => {}); }
      });
    }
  }
});

/* ---------- 2 bis. Bords de l'écran, avec une barre de défilement classique ----------
   Le navigateur de l'audit cache d'ordinaire les barres de défilement. Ici, Chromium les affiche comme Windows
   ou un Mac avec une souris (bande d'environ 15 px à droite, réservée par scrollbar-gutter: stable).
   Pendant l'intro, le voile (départ et arrivée) et le menu, aucune bande d'une autre couleur ne doit border l'écran. */
await tache('bords', async () => {
  let navBarres;
  try { navBarres = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] }); }
  catch (e) { R.nonLance('bords de l’écran (barre de défilement classique)', String(e.message).split('\n')[0]); return; }
  try {
    const largeurBarre = await (async () => {
      const c = await navBarres.newContext(); const pg = await c.newPage();
      await pg.setContent('<div style="overflow:scroll;width:100px;height:50px"></div>');
      const w = await pg.evaluate(() => { const d = document.querySelector('div'); return d.offsetWidth - d.clientWidth; });
      await c.close(); return w;
    })().catch(() => 0);
    if (!largeurBarre) R.info('Bords de l’écran : la barre de défilement classique n’a pas pu être affichée ici ; bords contrôlés sans elle.');
    const essais = PAGES_CONTENU.map((p) => [p, T('1366×768')]);
    if (!RAPIDE && PAGES_CONTENU.length) essais.push([PAGES_CONTENU[0], T('1920×1080')]);
    const optFilm = (taille) => ({ largeur: taille.w, hauteur: taille.h, qualite: 85 });
    const jugees = { intro: 0, voile: 0, menu: 0 };
    for (const [p, taille] of essais) {
      await filmAvecReprise(`bords de l’écran ${p.url} ${taille.nom}`, async () => {
        const { ctx, page, erreurs, releves } = await contexte({ taille, bords: true, nav: navBarres });
        const constats = [];
        const examiner = async (images, scene) => {
          if (!images.length) return;
          const { resultats, analysees } = await pageAnalyse.evaluate(analyserBords, { images, releves: releves.slice() });
          constats.push({ scene, images, resultats, analysees });
        };
        try {
          await limite((async () => {
            /* 1. Intro, en arrivant de l'extérieur. */
            const intro = await filmer(page, () => page.goto(BASE + p.url, { waitUntil: 'commit' }), { apres: true, duree: 3600, ...optFilm(taille) });
            await attendrePret(page);
            await examiner(intro, 'intro');
            /* 2. Départ sous le voile, puis arrivée sur la page suivante. */
            const cible = await page.evaluate(() => {
              const norm = (u) => new URL(u, location.href).pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1');
              const liens = [...document.querySelectorAll('a[href]')].filter((a) => { try { const u = new URL(a.href); return u.origin === location.origin && norm(a.href) !== norm(location.href) && !a.hash && !a.target && !a.hasAttribute('download') && !a.hasAttribute('data-sans-transition'); } catch { return false; } });
              const a = liens.find((x) => x.closest('[data-nav]')) || liens.find((x) => x.closest('main')) || liens[0];
              if (!a) return null;
              a.setAttribute('data-audit-cible', '1');
              return new URL(a.href).pathname;
            });
            if (cible) {
              const voile = await filmer(page, () => page.evaluate(() => document.querySelector('[data-audit-cible]').click()), { duree: 3000, ...optFilm(taille) });
              await attendrePret(page);
              await examiner(voile, 'voile');
            }
            /* 3. Menu : ouverture puis fermeture (bouton Menu affiché au besoin). */
            const aMenu = await page.evaluate(() => {
              const b = document.querySelector('[data-menu-bouton]');
              if (!b) return false;
              if (getComputedStyle(b).display === 'none') document.documentElement.classList.add('nav-compacte');
              return getComputedStyle(b).display !== 'none';
            });
            if (aMenu) {
              const menu = await filmer(page, async () => { await page.click('[data-menu-bouton]'); await attendre(900); await page.keyboard.press('Escape'); }, { duree: 700, ...optFilm(taille) });
              await examiner(menu, 'menu');
            }
          })(), 90000, 'bords');
        } finally { await ctx.close().catch(() => {}); }
        for (const { scene, images, resultats, analysees } of constats) {
          const groupes = new Map();
          resultats.forEach((r) => { const k = `${r.panneau}|${r.cote}|${r.url}`; if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(r); });
          const nom = nomFichier(`bords-${scene}${p.url}-${taille.w}`);
          if (groupes.size) {
            const { planche } = await pageAnalyse.evaluate(analyserFilm, { images, marques: [...new Set(resultats.map((r) => r.i))], max: 24 });
            if (planche) writeFileSync(join(sortie, 'films', nom + '.png'), Buffer.from(planche, 'base64'));
          }
          for (const liste of groupes.values()) {
            const r0 = liste[Math.floor(liste.length / 2)];
            const cote = { droite: 'bord droit', gauche: 'bord gauche', haut: 'bord du haut', bas: 'bord du bas' }[r0.cote];
            const panneau = { intro: 'l’intro', voile: 'le voile', menu: 'le menu', panneau: 'un panneau' }[r0.panneau];
            const aCote = { intro: 'de l’intro', voile: 'du voile', menu: 'du menu', panneau: 'd’un panneau' }[r0.panneau];
            const detail = `bande ${r0.largeur ? `d’environ ${r0.largeur} px ` : ''}en rgb(${r0.bande.join(', ')}) à côté ${aCote} en rgb(${r0.panneauCouleur.join(', ')}), sur ${liste.length} image(s) sur ${analysees} (films/${nom}.png)`;
            R.ajouter(liste.length >= 2 ? 'echec' : 'regarder', `bords de l’écran : bande d’une autre couleur le long du ${cote} pendant ${panneau}`, detail,
              { page: r0.url, taille: taille.nom, mode: largeurBarre ? `barre de défilement classique (${largeurBarre} px)` : 'barres cachées' });
          }
          if (!analysees && scene === 'intro') R.info(`Bords de l’écran ${p.url} (${taille.nom}) : aucune image où l’intro couvre tout l’écran, rien à juger.`);
        }
        noterErreurs(erreurs, p, taille, 'bords');
        constats.forEach((x) => { jugees[x.scene] += x.analysees; });
        R.ok('bords de l’écran');
      });
    }
    R.info(`Bords de l’écran : ${jugees.intro} images d’intro, ${jugees.voile} de voile et ${jugees.menu} de menu jugées (panneau immobile couvrant tout l’écran)${largeurBarre ? `, barre de défilement classique de ${largeurBarre} px` : ''}.`);
  } finally { await navBarres.close().catch(() => {}); }
});

/* ---------- 3. Règles de l'intro ---------- */
await tache('parcours:intro', async () => {
  const accueil = PAGES_CONTENU[0];
  for (const taille of ['1366×768', '390×844'].map(T)) {
    const { ctx, page, erreurs } = await contexte({ taille });
    try {
      const lieu = { page: accueil.url, taille: taille.nom, mode: 'intro' };
      await page.goto(BASE + accueil.url, { waitUntil: 'load' });
      const e1 = await attendrePret(page);
      if (e1 === 'sans-socle') { R.nonLance('règles de l’intro', 'socle absent (window.__socle)'); return; }
      if (e1 !== 'jouee') R.echec('intro non jouée à l’arrivée sur le site', `état : ${e1}`, lieu);
      await page.reload({ waitUntil: 'load' });
      const e2 = await attendrePret(page);
      if (e2 !== 'jouee') R.echec('intro non rejouée au rechargement', `état : ${e2}`, lieu);
      /* Accélérer puis passer : clic, touche, molette, toucher, glissement. Défilement bloqué pendant. */
      const essais = taille.tactile ? ['toucher', 'glisser', 'deux-touchers'] : ['clic', 'touche', 'molette', 'deux-clics'];
      const noms = { clic: 'un clic', touche: 'une touche', molette: 'la molette', toucher: 'un toucher', glisser: 'un glissement', 'deux-clics': 'deux clics', 'deux-touchers': 'deux touchers' };
      for (const essai of essais) {
        await page.goto(BASE + accueil.url + '?audit=' + essai, { waitUntil: 'commit' });
        try { await page.waitForFunction(() => document.documentElement.classList.contains('intro-en-cours'), null, { timeout: 3000 }); }
        catch { R.echec('intro jamais lancée', `essai : ${noms[essai]}`, lieu); continue; }
        await attendre(150);
        const bloque = await page.evaluate(() => document.documentElement.classList.contains('defilement-bloque') || getComputedStyle(document.documentElement).overflowY === 'hidden');
        if (!bloque) R.echec('défilement non bloqué pendant l’intro', '', lieu);
        const t0 = Date.now();
        const c = { x: taille.w / 2, y: taille.h / 2 };
        let t2 = 0;
        if (essai === 'clic') await page.mouse.click(c.x, c.y);
        if (essai === 'touche') await page.keyboard.press('Space');
        if (essai === 'molette') { await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, 500); await attendre(60); const y = await page.evaluate(() => scrollY); if (y > 2) R.echec('la page défile pendant l’intro', `${y} px`, lieu); }
        if (essai === 'toucher') await page.touchscreen.tap(c.x, c.y);
        if (essai === 'glisser') {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y + 100 }] });
          for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x, y: c.y + 100 - i * 40 }] }); await attendre(60); }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await attendre(100);
          const y = await page.evaluate(() => scrollY); if (y > 2) R.echec('la page défile pendant l’intro', `${y} px après un glissement`, lieu);
        }
        if (essai === 'deux-clics' || essai === 'deux-touchers') {
          if (essai === 'deux-clics') await page.mouse.click(c.x, c.y); else await page.touchscreen.tap(c.x, c.y);
          await attendre(120);
          t2 = Date.now();
          if (essai === 'deux-clics') await page.mouse.click(c.x, c.y); else await page.touchscreen.tap(c.x, c.y);
        }
        try {
          await page.waitForFunction(() => document.documentElement.classList.contains('pret'), null, { timeout: 2500 });
          if (t2 && Date.now() - t2 > 700) R.echec('intro pas passée par une seconde action', `fin ${Date.now() - t2} ms après la seconde action`, lieu);
          else if (!t2 && Date.now() - t0 > 1100) R.echec(`intro pas accélérée par ${noms[essai]}`, `fin ${Date.now() - t0} ms après l'action`, lieu);
          else R.ok('intro accélérable et passable');
        } catch { R.echec(`intro ni accélérée ni passée (${noms[essai]})`, 'toujours en cours 2,5 s après l’action', lieu); }
      }
      /* Chaque page : intro à l'arrivée et au rechargement. */
      for (const p of PAGES_CONTENU.slice(1)) {
        await page.goto(BASE + p.url, { waitUntil: 'load' });
        const a = await attendrePret(page);
        await page.reload({ waitUntil: 'load' });
        const b = await attendrePret(page);
        if (a !== 'jouee') R.echec('intro non jouée à l’arrivée sur le site', `état : ${a}`, { page: p.url, taille: taille.nom, mode: 'intro' });
        if (b !== 'jouee') R.echec('intro non rejouée au rechargement', `état : ${b}`, { page: p.url, taille: taille.nom, mode: 'intro' });
      }
      noterErreurs(erreurs, accueil, taille, 'intro');
    } finally { await ctx.close(); }
  }
});

/* ---------- 4. Menu, clavier, liens, boutons, liens profonds, liens vers la page en cours ---------- */
await tache('parcours:menu', async () => {
  const taille = T('390×844');
  const { ctx, page, erreurs } = await contexte({ taille });
  try {
    const p = PAGES_CONTENU[0];
    const lieu = { page: p.url, taille: taille.nom, mode: 'menu' };
    await page.goto(BASE + p.url, { waitUntil: 'load' });
    await attendrePret(page);
    const bouton = page.locator('[data-menu-bouton]');
    if (!(await bouton.count())) { R.nonLance('menu', 'aucun bouton [data-menu-bouton]'); return; }
    if (!(await bouton.isVisible())) { await page.setViewportSize({ width: 320, height: 568 }); await attendre(300); }
    if (!(await bouton.isVisible())) {
      /* Les liens tiennent à toutes les largeurs : on teste quand même le menu, en l'affichant de force. */
      await page.evaluate(() => document.documentElement.classList.add('nav-compacte'));
      await attendre(200);
      R.info('Menu : les liens tiennent à toutes les largeurs, le menu a été testé en l’affichant de force.');
    }
    await bouton.click();
    await attendre(450);
    const ouvert = await page.evaluate(() => ({ exp: document.querySelector('[data-menu-bouton]').getAttribute('aria-expanded'), vis: (() => { const m = document.querySelector('[data-menu]'); return !!m && getComputedStyle(m).visibility !== 'hidden' && !m.inert; })() }));
    if (ouvert.exp !== 'true' || !ouvert.vis) R.echec('menu', 'ne s’ouvre pas (aria-expanded ou visibilité)', lieu);
    let dehors = 0;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const dedans = await page.evaluate(() => { const a = document.activeElement; return !!a && (!!a.closest('[data-menu]') || a.matches('[data-menu-bouton]')); });
      if (!dedans) dehors++;
    }
    if (dehors) R.echec('menu', `le focus sort du menu ouvert (${dehors} fois sur 25)`, lieu);
    await page.keyboard.press('Escape');
    await attendre(350);
    const ferme = await page.evaluate(() => ({ exp: document.querySelector('[data-menu-bouton]').getAttribute('aria-expanded'), focus: !!document.activeElement && document.activeElement.matches('[data-menu-bouton]') }));
    if (ferme.exp !== 'false') R.echec('menu', 'Échap ne le ferme pas', lieu);
    if (!ferme.focus) R.echec('menu', 'le focus ne revient pas au bouton après Échap', lieu);
    await bouton.click();
    await attendre(450);
    const lien = page.locator('[data-menu] a[href]:not([aria-current]):not([href^="tel:"]):not([href^="mailto:"]):not([data-langue])').first();
    if (await lien.count()) {
      await lien.click();
      await page.waitForLoadState('load');
      await attendrePret(page);
      const apres = await page.evaluate(() => {
        const b = document.querySelector('[data-menu-bouton]');
        return { exp: b && b.getAttribute('aria-expanded'), lib: b && (b.querySelector('[data-libelle-bouton]') || b).textContent.trim(), attendu: b && b.dataset.libelleOuvrir, courant: !!document.querySelector('[data-menu] [aria-current="page"]') };
      });
      const ici2 = { ...lieu, page: page.url().slice(BASE.length) };
      if (apres.exp !== 'false' || (apres.attendu && apres.lib !== apres.attendu)) R.echec('menu', `le bouton ne revient pas à « ${apres.attendu || 'Menu'} » après un choix (${apres.lib})`, ici2);
      if (!apres.courant) R.echec('menu', 'la page en cours n’est pas signalée (aria-current)', ici2);
    }
    noterErreurs(erreurs, p, taille, 'menu');
    R.ok('menu');
  } finally { await ctx.close(); }
});

await tache('parcours:liens', async () => {
  const taille = T('1366×768');
  const cache = new Map();
  const charger = async (chemin) => {
    if (!cache.has(chemin)) {
      const r = await fetch(BASE + chemin, { redirect: 'manual' });
      cache.set(chemin, { code: r.status, html: r.status === 200 ? await r.text() : '', lieu: r.headers.get('location') });
    }
    return cache.get(chemin);
  };
  const profonds = new Map();
  for (const p of PAGES) {
    const { ctx, page, erreurs } = await contexte({ taille });
    try {
      await page.goto(BASE + p.url, { waitUntil: 'load' });
      await attendrePret(page);
      const liens = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), abs: a.href, texte: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40) })));
      for (const l of liens) {
        if (/^(tel:|mailto:|sms:)/.test(l.href)) continue;
        let u; try { u = new URL(l.abs); } catch { R.echec('lien mort', l.href, { page: p.url }); continue; }
        if (u.origin !== new URL(BASE).origin) continue;
        if (/\.html$/.test(u.pathname)) R.regarder('lien avec « .html »', `${l.href} (préférer l’adresse sans .html)`, { page: p.url });
        const r = await charger(u.pathname);
        if (r.code >= 400) { R.echec('lien mort', `${l.href} (${r.code})`, { page: p.url, selecteur: l.texte }); continue; }
        if (u.hash.length > 1) {
          const html = r.code === 200 ? r.html : (await charger(r.lieu || '/')).html;
          const id = decodeURIComponent(u.hash.slice(1));
          if (!new RegExp(`id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html)) R.echec('ancre introuvable', l.href, { page: p.url, selecteur: l.texte });
          const norm = (x) => x.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1');
          if (norm(u.pathname) !== norm(p.url)) profonds.set(l.abs, { depuis: p.url, href: l.href });
        }
      }
      /* Tabulation à travers la page : focus toujours visible, jamais sur un élément caché. */
      await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
      const vus = new Set();
      for (let i = 0; i < 120; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const a = document.activeElement;
          if (!a || a === document.body) return { fin: true };
          const r = a.getBoundingClientRect(), s = getComputedStyle(a);
          const contour = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
          const cache = r.width < 2 || r.height < 2 || s.visibility === 'hidden' || !!a.closest('[inert], [aria-hidden="true"]') || r.bottom < 0 || r.top > innerHeight;
          return { n: a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + ' « ' + (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30) + ' »', contour, cache };
        });
        if (f.fin || vus.has(f.n)) break;
        vus.add(f.n);
        if (f.cache) R.echec('clavier', 'le focus arrive sur un élément caché', { page: p.url, taille: taille.nom, selecteur: f.n });
        else if (!f.contour) R.echec('clavier', 'focus invisible (aucun contour)', { page: p.url, taille: taille.nom, selecteur: f.n });
      }
      R.ok('clavier');
      /* Boutons : chacun fait quelque chose de visible. */
      const n = await page.evaluate(() => {
        const bs = [...document.querySelectorAll('button, [role="button"]')].filter((b) => b.type !== 'submit' && !b.disabled && !b.matches('[data-menu-bouton], [data-calme-bascule]') && !b.closest('[inert], form') && getComputedStyle(b).visibility !== 'hidden' && b.getBoundingClientRect().width > 0);
        bs.forEach((b, i) => b.setAttribute('data-audit-bouton', String(i)));
        return Math.min(bs.length, 25);
      });
      for (let i = 0; i < n; i++) {
        const effet = await page.evaluate(async (i) => {
          const b = document.querySelector(`[data-audit-bouton="${i}"]`);
          if (!b) return true;
          b.scrollIntoView({ block: 'center' });
          let mutations = 0;
          const mo = new MutationObserver((l) => { mutations += l.length; });
          mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true });
          const avant = { url: location.href, y: scrollY, focus: document.activeElement };
          b.click();
          await new Promise((r) => setTimeout(r, 600));
          mo.disconnect();
          return mutations > 0 || location.href !== avant.url || Math.abs(scrollY - avant.y) > 2 || document.activeElement !== avant.focus;
        }, i).catch(() => true);
        if (!effet) R.regarder('bouton sans effet visible', '', { page: p.url, taille: taille.nom, selecteur: await page.evaluate((i) => { const b = document.querySelector(`[data-audit-bouton="${i}"]`); return b ? (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40) : ''; }, i).catch(() => '') });
        if (!page.url().startsWith(BASE + p.url.replace(/\/$/, ''))) { await page.goto(BASE + p.url, { waitUntil: 'load' }); await attendrePret(page); }
      }
      noterErreurs(erreurs, p, taille, 'liens');
      R.ok('liens et boutons');
    } finally { await ctx.close(); }
  }

  /* Liens profonds : arrivée sur la bonne section, sous l'en-tête ; choix prérempli dans le formulaire. */
  let k = 0;
  const essaisProfonds = [...profonds].slice(0, 12).flatMap((x, i) => (i < 4 ? [[x, taille], [x, T('390×844')]] : [[x, taille]]));
  for (const [[abs, { depuis, href }], tailleLien] of essaisProfonds) {
    k++;
    const { ctx, page, erreurs } = await contexte({ taille: tailleLien });
    try {
      await page.goto(BASE + depuis, { waitUntil: 'load' });
      await attendrePret(page);
      const cliquer = () => page.evaluate((h) => { const a = [...document.querySelectorAll('a[href]')].find((x) => x.getAttribute('href') === h); if (!a) return false; a.click(); return true; }, href);
      let ok;
      if (k <= 2) {
        const nom = nomFichier(`ancre${depuis}-${tailleLien.w}`);
        const images = await filmer(page, async () => { ok = await cliquer(); }, { duree: 3200 });
        const { pb } = await analyser(images, nom, { fond: await fondDe(page) });
        pb.forEach(([n, c, d]) => R.ajouter(n, `lien vers une ancre : ${c}`, `${d} (films/${nom}.png)`, { page: `${depuis} → ${href}`, taille: tailleLien.nom, mode: 'film' }));
      } else ok = await cliquer();
      if (!ok) continue;
      await page.waitForURL((u) => u.href.split('#')[0] === abs.split('#')[0], { timeout: 6000 }).catch(() => {});
      await attendrePret(page);
      await attendre(900);
      const r = await page.evaluate((abs) => {
        const u = new URL(abs);
        const cible = document.getElementById(decodeURIComponent(u.hash.slice(1)));
        if (!cible) return { absent: true };
        const entete = document.querySelector('[data-entete]');
        const eb = entete && getComputedStyle(entete).visibility !== 'hidden' ? Math.max(0, entete.getBoundingClientRect().bottom) : 0;
        const top = cible.getBoundingClientRect().top;
        const finPage = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
        const champs = [...u.searchParams].map(([nom, val]) => { const c = document.querySelector(`form [name="${CSS.escape(nom)}"]`); return c ? { nom, val, actuel: c.type === 'radio' || c.type === 'checkbox' ? (document.querySelector(`form [name="${CSS.escape(nom)}"]:checked`) || {}).value : c.value } : null; }).filter(Boolean);
        return { top, eb, finPage, champs };
      }, abs);
      const lieu = { page: `${depuis} → ${href}`, taille: tailleLien.nom, mode: 'lien profond' };
      if (r.absent) R.echec('lien profond', 'section introuvable à l’arrivée', lieu);
      else if (r.top < r.eb - 4) R.echec('lien profond', `section cachée sous l'en-tête (${Math.round(r.eb - r.top)} px)`, lieu);
      else if (r.top > r.eb + 120 && !r.finPage) R.echec('lien profond', `section pas en haut de l'écran (${Math.round(r.top)} px)`, lieu);
      (r.champs || []).forEach((c) => { if (String(c.actuel) !== c.val) R.echec('lien profond', `choix « ${c.nom}=${c.val} » non prérempli (valeur : ${c.actuel})`, lieu); });
      noterErreurs(erreurs, { url: depuis }, tailleLien, 'lien profond');
      R.ok('liens profonds');
    } finally { await ctx.close(); }
  }
  if (!profonds.size) R.info('Aucun lien profond vers une section d’une autre page.');

  /* Liens vers la page en cours (adresses sans .html) : défilement, sans rechargement. */
  for (const p of PAGES_CONTENU) {
    const { ctx, page } = await contexte({ taille });
    try {
      await page.goto(BASE + p.url, { waitUntil: 'load' });
      await attendrePret(page);
      const r = await page.evaluate(async () => {
        const norm = (x) => new URL(x, location.href).pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1');
        const a = [...document.querySelectorAll('main a[href*="#"], footer a[href*="#"]')].find((x) => norm(x.href) === norm(location.href) && x.hash.length > 1 && document.getElementById(decodeURIComponent(x.hash.slice(1))) && x.getBoundingClientRect().width > 0);
        if (!a) return null;
        window.__marqueur = 1;
        a.click();
        await new Promise((r) => setTimeout(r, 1500));
        return { recharge: window.__marqueur !== 1, hash: location.hash, attendu: a.hash, href: a.getAttribute('href') };
      }).catch(() => ({ recharge: true }));
      if (!r) { R.info(`Liens vers la page en cours ${p.url} : aucun lien vers une section de la page elle-même.`); continue; }
      if (r.recharge) R.echec('lien vers la page en cours', 'la page se recharge au lieu de défiler', { page: p.url, selecteur: r.href || '' });
      else if (r.hash !== r.attendu) R.regarder('lien vers la page en cours', `adresse non mise à jour (${r.hash} au lieu de ${r.attendu})`, { page: p.url });
      R.ok('liens vers la page en cours');
    } finally { await ctx.close(); }
  }
});

/* ---------- 5. Changements de hauteur, rechargement au milieu, mode calme ---------- */
await tache('parcours:hauteur', async () => {
  const taille = T('1366×768');
  for (const p of PAGES_CONTENU) {
    const { ctx, page } = await contexte({ taille });
    try {
      await page.goto(BASE + p.url, { waitUntil: 'load' });
      await attendrePret(page);
      const n = await page.evaluate(() => {
        if (!window.ScrollTrigger || !ScrollTrigger.getAll().length) return -1;
        const ts = [...document.querySelectorAll('details > summary, main [aria-expanded][aria-controls]:not([data-menu-bouton]), main [aria-pressed]:not([data-pause-pour])')];
        ts.forEach((t, i) => t.setAttribute('data-audit-depli', String(i)));
        return Math.min(ts.length, 12);
      });
      if (n < 0) { R.info(`Changements de hauteur ${p.url} : aucun effet ScrollTrigger, rien à recalculer.`); continue; }
      for (let i = 0; i < n; i++) {
        const r = await page.evaluate(async (i) => {
          const el = document.querySelector(`[data-audit-depli="${i}"]`);
          el.scrollIntoView({ block: 'center' });
          el.click();
          await new Promise((r) => setTimeout(r, 700));
          const avant = ScrollTrigger.getAll().map((t) => [Math.round(t.start), Math.round(t.end)]);
          ScrollTrigger.refresh();
          const apres = ScrollTrigger.getAll().map((t) => [Math.round(t.start), Math.round(t.end)]);
          const ecart = Math.max(0, ...avant.map((a, k) => Math.max(Math.abs(a[0] - (apres[k] || a)[0]), Math.abs(a[1] - (apres[k] || a)[1]))));
          return { ecart, nom: (el.textContent || '').trim().slice(0, 40) };
        }, i);
        if (r.ecart > 2) R.echec('positions non recalculées après un changement de hauteur', `décalage de ${r.ecart} px`, { page: p.url, taille: taille.nom, selecteur: r.nom });
      }
      /* Rechargement au milieu de la page : l'intro repart du haut, puis tout est à sa place à la même position. */
      const milieu = await page.evaluate(async () => { const y = Math.round((document.documentElement.scrollHeight - innerHeight) * 0.5); window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 900)); return y; });
      const a = (await page.screenshot({ type: 'png' })).toString('base64');
      await page.reload({ waitUntil: 'load' });
      await attendrePret(page);
      const yApres = await page.evaluate(() => scrollY);
      if (yApres > 4) R.regarder('rechargement', `la page ne repart pas du haut pour l'intro (${yApres} px)`, { page: p.url, taille: taille.nom });
      await page.evaluate(async (y) => { const pas = innerHeight * 0.6; for (let x = 0; x < y; x += pas) { window.scrollTo({ top: x, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 90)); } window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 900)); }, milieu);
      const b = (await page.screenshot({ type: 'png' })).toString('base64');
      const diff = await pageAnalyse.evaluate(differenceImages, { a, b });
      if (diff > 0.04) {
        const nom = nomFichier(`rechargement${p.url}`);
        writeFileSync(join(sortie, 'comparaisons', nom + '-avant.png'), Buffer.from(a, 'base64'));
        writeFileSync(join(sortie, 'comparaisons', nom + '-apres.png'), Buffer.from(b, 'base64'));
        R.regarder('rechargement au milieu de la page', `écran différent à la même position après rechargement (${(diff * 100).toFixed(1)} %), voir comparaisons/${nom}-*.png`, { page: p.url, taille: taille.nom });
      }
      R.ok('changements de hauteur');
    } finally { await ctx.close(); }
  }
});

await tache('parcours:calme', async () => {
  for (const taille of ['390×844', '1366×768'].map(T)) {
    for (const p of PAGES_CONTENU) {
      const { ctx, page, erreurs } = await contexte({ taille, mode: 'calme' });
      try {
        await page.goto(BASE + p.url, { waitUntil: 'load' });
        await attendrePret(page);
        await page.evaluate(installerOutils);
        await page.evaluate(defilerTout, { pas: 0.8, pause: 40 });
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight / 3, behavior: 'instant' }));
        await attendre(1200);
        const r = await page.evaluate(async () => {
          const a0 = window.__rafAppels; await new Promise((r) => setTimeout(r, 1000)); const raf = window.__rafAppels - a0;
          const infinies = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).map((a) => a.effect.target && (a.effect.target.className || a.effect.target.tagName));
          return { raf, infinies: infinies.slice(0, 4), defil: window.__socle ? window.__socle.defilement : null, boucles: window.__socle ? window.__socle.bouclesActives() : 0 };
        });
        const lieu = { page: p.url, taille: taille.nom, mode: 'calme' };
        if (r.raf > 8) R.echec('mode calme', `une boucle tourne encore (${r.raf} images par seconde)`, lieu);
        if (r.infinies.length) R.echec('mode calme', `animation en boucle toujours active : ${r.infinies.join(', ')}`, lieu);
        if (r.boucles) R.echec('mode calme', `${r.boucles} boucle(s) du socle actives`, lieu);
        if (r.defil === 'adouci') R.echec('mode calme', 'défilement adouci toujours actif', lieu);
        noterErreurs(erreurs, p, taille, 'calme');
        R.ok('mode calme');
      } finally { await ctx.close(); }
    }
  }
  /* Bouton « Réduire les animations », puis « Rétablir » : après chaque rechargement, retour à la section, sans intro. */
  const taille = T('390×844');
  const { ctx, page } = await contexte({ taille });
  try {
    const p = PAGES_CONTENU[0];
    await page.goto(BASE + p.url, { waitUntil: 'load' });
    await attendrePret(page);
    for (const etape of ['réduire', 'rétablir']) {
      const choix = await page.evaluate(async () => {
        const ss = [...document.querySelectorAll('main section[id]')];
        const s = ss[Math.floor(ss.length / 2)] || ss[0];
        if (!s) return null;
        s.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 600));
        return s.id;
      });
      const b = await page.$('[data-menu-bouton]');
      let bascule = null;
      /* En-tête caché en descendant (bouton Menu hors de l'écran) : le bouton du pied de page est utilisé. */
      const menuVisible = b && await b.isVisible() && await b.evaluate((x) => { const r = x.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
      if (etape === 'réduire' && menuVisible) { await b.click(); await attendre(500); bascule = await page.$('[data-menu] [data-calme-bascule]'); }
      if (!bascule) bascule = (await page.$('footer [data-calme-bascule]')) || (await page.$('[data-calme-bascule]'));
      if (!choix || !bascule) { R.nonLance('bouton du mode calme', 'aucune section ou aucun bouton [data-calme-bascule]'); return; }
      await Promise.all([page.waitForNavigation({ waitUntil: 'commit' }), bascule.evaluate((x) => x.click())]);
      const premier = await page.evaluate(() => ({ panneau: (() => { const o = document.querySelector('[data-ouverture]'); return !!o && getComputedStyle(o).display !== 'none'; })() })).catch(() => ({}));
      await attendrePret(page);
      await attendre(500);
      const apres = await page.evaluate((id) => {
        const s = document.getElementById(id); const r = s && s.getBoundingClientRect();
        return { calme: document.documentElement.classList.contains('calme'), visible: !!r && r.top < innerHeight && r.bottom > 0, intro: window.__socle && window.__socle.intro };
      }, choix);
      const lieu = { page: p.url, taille: taille.nom, mode: `bouton ${etape}` };
      if (etape === 'réduire' && !apres.calme) R.echec('bouton du mode calme', 'le mode calme n’est pas actif après le choix', lieu);
      if (etape === 'rétablir' && apres.calme) R.echec('bouton du mode calme', 'les animations ne sont pas rétablies', lieu);
      if (!apres.visible) R.echec('bouton du mode calme', `pas de retour à la section #${choix} après le rechargement`, lieu);
      if (apres.intro === 'jouee' || premier.panneau) R.echec('bouton du mode calme', 'l’intro (ou son panneau) apparaît au rechargement dû au bouton', lieu);
      R.ok('bouton du mode calme');
    }
  } finally { await ctx.close(); }
});

/* ---------- Parcours propres au projet (_audit/parcours.mjs) ---------- */
await tache('parcours:projet', async () => {
  const f = join(ici, 'parcours.mjs');
  if (!existsSync(f)) { R.info('Aucun parcours propre au projet (_audit/parcours.mjs) : filtres, calculateurs, panier, réservation, fenêtres testés seulement par les contrôles généraux.'); return; }
  const m = await import(f);
  await m.default({ contexte, attendrePret, attendre, BASE, R, T, pages: PAGES_CONTENU });
  R.ok('parcours du projet');
});

/* ---------- 6. Tient dans l'écran (sections épinglées et plein écran), film de chaque épinglage ---------- */
await tache('ecran', async () => {
  for (const p of PAGES_CONTENU) {
    for (const taille of TAILLES_EPINGLE) {
      const { ctx, page } = await contexte({ taille });
      try {
        await page.goto(BASE + p.url, { waitUntil: 'load' });
        await attendrePret(page);
        await page.evaluate(installerOutils);
        const pins = await page.evaluate(() => {
          const out = [];
          if (window.ScrollTrigger) ScrollTrigger.getAll().filter((t) => t.pin).forEach((t, i) => { t.pin.setAttribute('data-audit-pin', String(i)); out.push({ sel: `[data-audit-pin="${i}"]`, start: t.start, end: t.end }); });
          document.querySelectorAll('[data-plein-ecran]').forEach((el, i) => { el.setAttribute('data-audit-plein', String(i)); const y = el.getBoundingClientRect().top + scrollY; out.push({ sel: `[data-audit-plein="${i}"]`, start: y, end: y }); });
          return out;
        });
        if (!pins.length) { if (taille === TAILLES_EPINGLE[0]) R.info(`Tient dans l'écran ${p.url} : aucune section épinglée ou plein écran.`); break; }
        for (const pin of pins) {
          for (const f of [0.04, 0.5, 0.96]) {
            const y = Math.round(pin.start + (pin.end - pin.start) * f);
            await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
            await attendre(450);
            const pb = await page.evaluate(mesurerEpingle, pin.sel);
            pb.forEach((x) => R.echec(x.controle, `${x.detail} (à ${Math.round(f * 100)} % de la scène)`, { page: p.url, taille: taille.nom, mode: 'épinglé', selecteur: x.selecteur }));
          }
        }
        if (taille.nom === '1366×768') {
          /* Film de l'épinglage : la scène ne doit pas sauter quand elle s'épingle ni quand elle se libère. */
          for (const [k, pin] of pins.filter((x) => x.end > x.start).entries()) {
            await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - 420), behavior: 'instant' }), pin.start);
            await attendre(500);
            await page.mouse.move(taille.w / 2, taille.h / 2);
            const nom = nomFichier(`epinglage${p.url}-${k + 1}`);
            const images = await filmer(page, async () => {
              for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 90); await attendre(45); if (await page.evaluate((e) => scrollY > e + 300, pin.end)) break; }
            }, { duree: 600 });
            const { pb } = await analyser(images, nom, { fond: await fondDe(page) });
            pb.forEach(([, c, d]) => R.echec(`épinglage : ${c}`, `${d} (films/${nom}.png)`, { page: p.url, taille: taille.nom }));
            R.ok('films des épinglages');
          }
        }
        R.ok('tient dans l’écran');
      } finally { await ctx.close().catch(() => {}); }
    }
  }
});

/* ---------- 7. Fluidité et vitesse ---------- */
await tache('fluidite', async () => {
  for (const [taille, mode] of [[T('1366×768'), 'molette'], [T('390×844'), 'doigt']]) {
    for (const p of PAGES_CONTENU) {
      const { ctx, page } = await contexte({ taille });
      try {
        await page.goto(BASE + p.url, { waitUntil: 'load' });
        await attendrePret(page);
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const t0 = await page.evaluate(() => { window.__longues = []; window.__demarrerImages(); return performance.now(); });
        const hauteur = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        const debutDefil = Date.now();
        if (mode === 'molette') {
          await page.mouse.move(taille.w / 2, taille.h / 2);
          for (let i = 0; i < 400; i++) {
            await page.mouse.wheel(0, 120); await attendre(45);
            if (i % 10 === 9 && (await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4))) break;
            if (Date.now() - debutDefil > 30000) break;
          }
        } else {
          for (let i = 0; i < 14; i++) {
            await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(taille.w / 2), y: Math.round(taille.h * 0.8), yDistance: -Math.round(taille.h * 0.7), speed: 2500, gestureSourceType: 'touch', repeatCount: 3, repeatDelayMs: 0 }).catch(() => {});
            if (await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4)) break;
            if (Date.now() - debutDefil > 30000) break;
          }
        }
        await attendre(500);
        const { images, longues, fin } = await page.evaluate((t0) => ({ images: window.__arreterImages(), longues: window.__longues.filter((l) => l.t >= t0), fin: scrollY + innerHeight >= document.documentElement.scrollHeight - 4 }), t0);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        /* Chrome compte un décalage quand une scène passe en position fixe pour s'épingler, même si l'image ne bouge pas :
           ces décalages-là sont exclus ici ; chaque épinglage est filmé et vérifié à part (contrôle « écran »). */
        const { clsDefil, sources } = await page.evaluate((t0) => {
          const l = (window.__clsDetail || []).filter((d) => d.t >= t0 && !d.epingle);
          return { clsDefil: l.reduce((a, d) => a + d.v, 0), sources: l.flatMap((d) => d.sources).slice(0, 3).join(' ; ') };
        }, t0);
        const lieu = { page: p.url, taille: taille.nom, mode: `défilement ${mode === 'molette' ? 'à la molette' : 'au doigt'}, processeur ralenti 4 fois` };
        if (clsDefil > 0.05) R.echec('stabilité pendant le défilement (CLS)', `${clsDefil.toFixed(3)} (0,05 au plus)`, { ...lieu, selecteur: sources });
        const lentes = images.filter((d) => d > 50).length;
        const part = images.length ? lentes / images.length : 0;
        const pire = Math.max(0, ...longues.map((l) => l.d));
        if (!fin && hauteur > 0 && mode === 'molette') R.regarder('fluidité', 'le défilement n’a pas atteint le bas de la page en 30 s', lieu);
        if (part > 0.1 || pire > 250) R.echec('fluidité', `${Math.round(part * 100)} % d'images de plus de 50 ms, tâche la plus longue ${Math.round(pire)} ms`, lieu);
        else if (part > 0.03) R.regarder('fluidité', `${Math.round(part * 100)} % d'images de plus de 50 ms`, lieu);
        else R.info(`Fluidité ${p.url} ${taille.nom} (${mode}) : ${Math.round(part * 100)} % d'images lentes sur ${images.length}, tâche la plus longue ${Math.round(pire)} ms`);
        R.ok('fluidité');
      } finally { await ctx.close(); }
    }
  }
  /* Défilement adouci : jamais sur Mac, iPhone, iPad ni écran tactile ; à la molette sous Windows. */
  const appareils = [
    { nom: 'Mac', taille: T('1440×900'), ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', plateforme: 'MacIntel', attendu: 'natif' },
    { nom: 'iPhone', taille: T('390×844'), ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', plateforme: 'iPhone', attendu: 'natif' },
    { nom: 'iPad', taille: T('1024×768'), ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', plateforme: 'iPad', attendu: 'natif' },
    { nom: 'écran tactile', taille: { ...T('1280×720'), tactile: true }, attendu: 'natif' },
    { nom: 'Windows à la souris', taille: T('1366×768'), ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', plateforme: 'Win32', attendu: 'adouci' },
  ];
  for (const a of appareils) {
    const { ctx, page } = await contexte({ taille: a.taille, ua: a.ua, plateforme: a.plateforme });
    try {
      await page.goto(BASE + PAGES_CONTENU[0].url, { waitUntil: 'load' });
      await attendrePret(page);
      const d = await page.evaluate(() => (window.__socle ? window.__socle.defilement : document.documentElement.dataset.defilement || null));
      if (!d) { R.nonLance('défilement adouci selon l’appareil', 'socle absent'); break; }
      if (a.attendu === 'natif' && d !== 'natif') R.echec('défilement adouci actif', `sur ${a.nom} : le défilement doit rester natif`, { page: PAGES_CONTENU[0].url, taille: a.taille.nom });
      if (a.attendu === 'adouci' && d !== 'adouci') {
        const choix = await page.evaluate(() => document.documentElement.hasAttribute('data-defilement-natif'));
        if (choix) R.info('Défilement natif partout : choix du projet (data-defilement-natif).');
        else R.echec('défilement adouci inactif', 'sous Windows à la souris, le défilement adouci est attendu', { page: PAGES_CONTENU[0].url, taille: a.taille.nom });
      }
      R.ok('défilement selon l’appareil');
    } finally { await ctx.close(); }
  }
});

await tache('vitesse', async () => {
  const taille = T('390×844');
  for (const p of PAGES_CONTENU) {
    const { ctx, page } = await contexte({ taille });
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Performance.enable');
      await page.goto(BASE + p.url, { waitUntil: 'load', timeout: 60000 });
      await attendrePret(page, { delai: 15000 });
      const { metrics } = await cdp.send('Performance.getMetrics');
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      const calcul = (m.ScriptDuration || 0) + (m.LayoutDuration || 0) + (m.RecalcStyleDuration || 0);
      const lourdes = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('img').forEach((img) => {
          const r = img.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= innerHeight || r.width === 0) return;
          const e = performance.getEntriesByName(img.currentSrc)[0];
          const taille = e ? (e.encodedBodySize || e.transferSize) : 0;
          if (taille > 300 * 1024) out.push(`${img.currentSrc.split('/').slice(-2).join('/')} (${Math.round(taille / 1024)} Ko)`);
        });
        return out;
      });
      const lieu = { page: p.url, taille: taille.nom, mode: 'téléphone ralenti (processeur ÷4, réseau 4G)' };
      if (calcul > 2) R.echec('vitesse', `${calcul.toFixed(2)} s de calcul au chargement (2 s au plus)`, lieu);
      else R.info(`Vitesse ${p.url} : ${calcul.toFixed(2)} s de calcul au chargement (téléphone ralenti).`);
      lourdes.forEach((l) => R.echec('vitesse', `image de plus de 300 Ko dans le premier écran : ${l}`, lieu));
      R.ok('vitesse');
    } finally { await ctx.close(); }
  }
});

/* ---------- 8. Captures pour le regard humain et le second agent ---------- */
await tache('captures', async () => {
  for (const p of PAGES) {
    for (const taille of ['390×844', '768×1024', '1366×768'].map(T)) {
      const { ctx, page } = await contexte({ taille });
      try {
        await page.goto(BASE + p.url, { waitUntil: 'load' });
        await attendrePret(page);
        await limite(page.evaluate(defilerTout, { pas: 0.7, pause: 110 }), 60000, 'défilement complet');
        const nom = (p.url === '/' ? 'accueil' : p.url.slice(1).replace(/\//g, '-')) + '-' + taille.w;
        const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
        const ecrans = taille.w === 768 ? 1 : Math.min(16, Math.ceil(hauteur / (taille.h * 0.9)));
        for (let i = 0; i < ecrans; i++) {
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(i * taille.h * 0.9));
          await attendre(450);
          await page.screenshot({ path: join(sortie, 'captures', `${nom}-${String(i + 1).padStart(2, '0')}.png`) });
        }
      } finally { await ctx.close(); }
    }
  }
  R.ok('captures');
});

/* ---------- 9. Safari (WebKit) ---------- */
await tache('safari', async () => {
  let w = null;
  try { w = await webkit.launch(); } catch {
    R.nonLance('Safari (WebKit)', 'WebKit ne peut pas s’installer ici : vérification à faire dans Safari sur le Mac (liste dans le rapport)');
    R.safari = true;
    return;
  }
  R.nonLance('films dans Safari', 'le film image par image n’existe que dans Chromium : captures seulement');
  try {
    for (const p of PAGES) {
      for (const taille of ['390×844', '1366×768'].map(T)) {
        const { ctx, page, erreurs } = await contexte({ taille, nav: w });
        try {
          await page.goto(BASE + p.url, { waitUntil: 'load' });
          await attendrePret(page);
          await limite(page.evaluate(defilerTout, { pas: 0.7, pause: 110 }), 60000, 'défilement complet');
          const large = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          if (large > 1) R.echec('Safari : débordement horizontal', `${large} px`, { page: p.url, taille: taille.nom, mode: 'webkit' });
          await page.screenshot({ path: join(sortie, 'captures', `safari-${p.url === '/' ? 'accueil' : p.url.slice(1).replace(/\//g, '-')}-${taille.w}.png`) });
          noterErreurs(erreurs, p, taille, 'webkit');
        } finally { await ctx.close(); }
      }
    }
    R.ok('Safari');
  } finally { await w.close(); }
});

/* ---------- Rapport ---------- */
await navigateur.close();
await serveur.fermer();

const cle = (x) => [x.niveau, x.controle, x.page || '', x.selecteur || '', x.detail || ''].join('|');
const groupes = new Map();
for (const x of R.items) {
  const k = cle({ ...x, detail: x.controle === 'texte sous 12 px' || x.controle === 'zone tactile sous 44 px' ? '' : x.detail });
  if (!groupes.has(k)) groupes.set(k, { ...x, lieux: new Set() });
  groupes.get(k).lieux.add([x.taille, x.mode].filter(Boolean).join(' '));
}
const liste = [...groupes.values()];
const echecs = liste.filter((x) => x.niveau === 'echec');
const aRegarder = liste.filter((x) => x.niveau === 'regarder');
const ligne = (x) => {
  const lieux = [...x.lieux].filter(Boolean);
  return `- **${x.controle}**${x.page ? ` — \`${x.page}\`` : ''}${x.selecteur ? ` — ${x.selecteur}` : ''}${x.detail ? ` — ${x.detail}` : ''}${lieux.length ? ` _(${lieux.slice(0, 6).join(', ')}${lieux.length > 6 ? `, +${lieux.length - 6}` : ''})_` : ''}`;
};
const parControle = (l) => { const m = new Map(); l.forEach((x) => { if (!m.has(x.controle)) m.set(x.controle, []); m.get(x.controle).push(x); }); return m; };
const md = [];
md.push('# Rapport d’audit', '', `Projet : \`${racine.split('/').pop()}\` · ${new Date().toLocaleString('fr-FR')} · ${Math.round((Date.now() - debut) / 60000)} min · ${PAGES.length} page(s) · ${RAPIDE ? 'audit RAPIDE : ne vaut pas pour une livraison' : 'audit complet'}`, '');
md.push('## Résumé', '', `- Échecs : **${echecs.length}**`, `- À regarder : **${aRegarder.length}**`, `- Non lancé : **${R.nonLances.length}**`, `- Contrôles passés : ${[...R.oks.entries()].map(([k, n]) => `${k} (${n})`).join(', ') || 'aucun'}`, '');
md.push('## Échecs', '');
if (!echecs.length) md.push('Aucun.', '');
for (const [c, l] of parControle(echecs)) { md.push(`### ${c} (${l.length})`, ''); l.slice(0, 40).forEach((x) => md.push(ligne(x))); if (l.length > 40) md.push(`- … et ${l.length - 40} autres (rapport.json)`); md.push(''); }
md.push('## À regarder', '');
if (!aRegarder.length) md.push('Rien.', '');
for (const [c, l] of parControle(aRegarder)) { md.push(`### ${c} (${l.length})`, ''); l.slice(0, 25).forEach((x) => md.push(ligne(x))); if (l.length > 25) md.push(`- … et ${l.length - 25} autres (rapport.json)`); md.push(''); }
md.push('## Non lancé', '');
if (!R.nonLances.length) md.push('Tout a été lancé.', '');
R.nonLances.forEach((x) => md.push(`- **${x.controle}** : ${x.raison}`));
if (R.safari) {
  md.push('', '### À vérifier dans Safari sur le Mac (WebKit indisponible ici)', '',
    '- Ouverture de chaque page : rien qui clignote, intro complète au premier chargement et au rechargement.',
    '- Changement de page : le voile couvre l’écran, pas de page blanche ; retour arrière sans intro ni voile resté.',
    '- Défilement : fluide (natif), en-tête qui se cache et revient sans clignoter, sections épinglées entières.',
    '- Menu sur iPhone (mode Responsive de Safari) : ouverture, fermeture, page bloquée derrière.',
    '- Polices, images, mention « Illustration générée », formulaires et barre fixe du bas.');
}
md.push('', '## Repères', '', ...R.infos.map((x) => `- ${x}`), '', '## Fichiers', '',
  '- Captures : `captures/` (téléphone, tablette, ordinateur, écran par écran)',
  '- Films : `films/` (planches contact de l’ouverture, des transitions, des retours, des ancres et des épinglages ; ⚠ = image signalée)',
  '- Comparaisons : `comparaisons/`', '- Détail complet : `rapport.json`', '');
writeFileSync(join(sortie, 'rapport.md'), md.join('\n'));
writeFileSync(join(sortie, 'rapport.json'), JSON.stringify({ echecs, aRegarder, nonLances: R.nonLances, oks: Object.fromEntries(R.oks), infos: R.infos }, (k, v) => (v instanceof Set ? [...v] : v), 2));
console.log(`\nÉchecs : ${echecs.length} · À regarder : ${aRegarder.length} · Non lancé : ${R.nonLances.length}`);
console.log(`Rapport : ${join(sortie, 'rapport.md')}`);
process.exit(echecs.length ? 1 : 0);
