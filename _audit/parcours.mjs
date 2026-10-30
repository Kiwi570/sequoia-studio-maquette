/* Parcours propres à Sequoia Studio (lancés par node _audit/audit.mjs, partie « parcours »).
   Configurateur (prix recalculés depuis la formule du client), panier (ajout, tiroir, Échap, deux onglets, donnée abîmée),
   galerie (filtres comptés depuis les données, recherche, adresse), recherche de l'en-tête, outil « Chez vous » (total),
   commande simulée (total, double clic, panier vidé), visionneuse (focus gardé, Échap, focus rendu). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => JSON.parse(readFileSync(join(racine, 'donnees', f), 'utf8'));
const oeuvres = lire('oeuvres.json');
const finitions = Object.fromEntries(lire('finitions.json').map((f) => [f.id, f]));
const nombre = (t) => parseInt(String(t).replace(/[^\d]/g, ''), 10);

/* Formule relevée sur les 2 150 prix du site actuel : arrondi à la dizaine supérieure. */
function prixFormule(format, f) {
  const fin = finitions[f];
  const grand = Math.max(format.largeur, format.hauteur), petit = Math.min(format.largeur, format.hauteur);
  if (grand > fin.maxLong || petit > fin.maxCourt) return null;
  return Math.ceil((format.base + fin.supplement + fin.parCm * Math.max(0, grand - 60)) / 10) * 10;
}

export default async function ({ contexte, attendrePret, attendre, BASE, R, T }) {
  /* 0. Les prix des données suivent la formule (les 42 œuvres, tous les formats et finitions). */
  for (const o of oeuvres) for (const fo of o.formats) for (const f of Object.keys(finitions)) {
    const att = prixFormule(fo, f), dit = fo.prix[f] ?? null;
    if (att !== dit) R.echec('prix', `${o.slug} ${fo.largeur}×${fo.hauteur} ${f} : ${dit} au lieu de ${att}`, { page: `/oeuvres/${o.slug}` });
  }

  const ordi = await contexte({ taille: T('1440×900') });
  try {
    const { ctx, page } = ordi;
    /* 1. Configurateur : chaque format et chaque finition, prix et dimensions affichés. */
    const o = oeuvres.find((x) => x.slug === 'regard-de-minuit');
    const chemin = `/oeuvres/${o.slug}`;
    await page.goto(BASE + chemin, { waitUntil: 'load' });
    await attendrePret(page);
    for (const fo of o.formats) {
      await page.locator(`[data-config-form] input[name="format"][value="${fo.id}"]`).check({ force: true });
      for (const f of Object.keys(finitions)) {
        const att = prixFormule(fo, f);
        const champ = page.locator(`[data-config-form] input[name="finition"][value="${f}"]`);
        if (att == null) { if (!(await champ.isDisabled())) R.echec('configurateur', `${fo.id} ${f} devrait être impossible (taille maximale)`, { page: chemin }); continue; }
        await champ.check({ force: true });
        await attendre(80);
        const { prix, barre, dims } = await page.evaluate(() => ({ prix: document.querySelector('[data-config-prix]').textContent, barre: document.querySelector('[data-config-prix-barre]')?.textContent, dims: document.querySelector('[data-config-dims]').textContent }));
        if (nombre(prix) !== att) R.echec('configurateur', `${fo.id} ${f} : affiché ${prix}, attendu ${att} €`, { page: chemin });
        if (barre && nombre(barre) !== att) R.echec('configurateur', `barre du téléphone : ${barre}, attendu ${att} €`, { page: chemin });
        const m = finitions[f].marge;
        const l = String(Math.round((fo.largeur + 2 * m) * 10) / 10).replace('.', ',');
        if (!dims.replace(/\s/g, ' ').startsWith(`${l} ×`)) R.echec('configurateur', `${fo.id} ${f} : dimensions « ${dims} », largeur attendue ${l} cm`, { page: chemin });
        const url = new URL(page.url());
        if (url.searchParams.get('format') !== fo.id || url.searchParams.get('finition') !== f) R.echec('configurateur', 'le choix n’est pas gardé dans l’adresse', { page: chemin });
      }
    }
    /* Lien profond : le choix est prérempli. */
    const fo2 = o.formats[2];
    await page.goto(BASE + `${chemin}?format=${fo2.id}&finition=toile`, { waitUntil: 'load' });
    await attendrePret(page);
    const pre = await page.evaluate(() => document.querySelector('[data-config-prix]').textContent);
    if (nombre(pre) !== prixFormule(fo2, 'toile')) R.echec('configurateur', `lien profond : ${pre} au lieu de ${prixFormule(fo2, 'toile')} €`, { page: chemin });

    /* 2. Panier : ajout, tiroir ouvert, focus dedans, Échap, focus rendu, compteur. */
    const bouton = page.locator('.fiche-panneau [data-config-ajouter]').first();
    await bouton.click();
    await attendre(500);
    const tiroir = await page.evaluate(() => ({ ouvert: !document.querySelector('[data-tiroir]').hidden, focusDedans: document.querySelector('[data-tiroir]').contains(document.activeElement), n: document.querySelector('[data-panier-nombre]')?.textContent }));
    if (!tiroir.ouvert) R.echec('panier', 'le tiroir ne s’ouvre pas après l’ajout', { page: chemin });
    if (!tiroir.focusDedans) R.echec('panier', 'le focus n’entre pas dans le tiroir', { page: chemin });
    if (nombre(tiroir.n) !== 1) R.echec('panier', `compteur ${tiroir.n} au lieu de 1`, { page: chemin });
    await page.keyboard.press('Escape');
    await attendre(500);
    const ferme = await page.evaluate(() => ({ ferme: document.querySelector('[data-tiroir]').hidden, focus: document.activeElement?.matches('[data-config-ajouter]') }));
    if (!ferme.ferme) R.echec('panier', 'Échap ne ferme pas le tiroir', { page: chemin });
    if (!ferme.focus) R.regarder('panier', 'le focus ne revient pas sur le bouton d’ajout', { page: chemin });

    /* Deux onglets : l'autre onglet voit le même panier sans recharger. */
    const autre = await ctx.newPage();
    await autre.goto(BASE + '/galerie', { waitUntil: 'load' });
    await attendrePret(autre);
    await page.evaluate(() => document.querySelector('.fiche-panneau [data-config-ajouter]').click());
    await attendre(700);
    const n2 = await autre.evaluate(() => document.querySelector('[data-panier-nombre]')?.textContent);
    if (nombre(n2) !== 2) R.echec('panier', `deux onglets : l’autre onglet affiche ${n2} au lieu de 2`, { page: '/galerie' });
    await autre.close();

    /* 3. Commande : total = somme des lignes, double clic = une seule commande, panier vidé. */
    await page.goto(BASE + '/commande', { waitUntil: 'load' });
    await attendrePret(page);
    const recap = await page.evaluate(() => ({ lignes: document.querySelectorAll('[data-commande-liste] > li').length, total: document.querySelector('[data-commande-total]').textContent }));
    const attendu = prixFormule(o.formats.find((f) => f.id === fo2.id) ? fo2 : fo2, 'toile');
    if (recap.lignes !== 1) R.echec('commande', `${recap.lignes} lignes au lieu de 1 (même œuvre, même choix : quantité 2)`, { page: '/commande' });
    if (nombre(recap.total) !== 2 * attendu) R.echec('commande', `total ${recap.total} au lieu de ${2 * attendu} €`, { page: '/commande' });
    await page.fill('#c-prenom', 'Camille'); await page.fill('#c-nom', 'Martin'); await page.fill('#c-email', 'camille@example.com');
    await page.fill('#c-tel', '0600000000'); await page.fill('#c-adresse', '1 rue de la Paix'); await page.fill('#c-cp', '75002'); await page.fill('#c-ville', 'Paris');
    await page.check('#c-cgv', { force: true });
    await page.locator('[data-commande-payer]').dblclick();
    await attendre(2500);
    const fin = await page.evaluate(() => ({ message: [...document.querySelectorAll('[data-message-envoi]')].some((m) => !m.hidden && m.textContent.trim()), panier: localStorage.getItem('sequoia:panier') }));
    if (!fin.message) R.echec('commande', 'aucun message après la commande simulée', { page: '/commande' });
    if (fin.panier && JSON.parse(fin.panier).lignes.length) R.echec('commande', 'le panier n’est pas vidé après la commande simulée', { page: '/commande' });

    /* Donnée abîmée : nettoyée, le site continue. */
    await page.evaluate(() => localStorage.setItem('sequoia:panier', '{abîmé'));
    await page.goto(BASE + '/galerie', { waitUntil: 'load' });
    if ((await attendrePret(page)) === 'jamais-pret') R.echec('panier', 'une donnée abîmée bloque le site', { page: '/galerie' });
    const propre = await page.evaluate(() => localStorage.getItem('sequoia:panier'));
    if (propre && propre.includes('abîmé')) R.echec('panier', 'la donnée abîmée n’est pas nettoyée', { page: '/galerie' });

    /* 4. Galerie : filtres comptés depuis les données, adresse, recherche, réinitialisation. */
    const visibles = () => page.evaluate(() => [...document.querySelectorAll('[data-mur] [data-oeuvre]')].filter((c) => !c.hidden && c.offsetParent !== null).length);
    if ((await visibles()) !== oeuvres.length) R.echec('galerie', `${await visibles()} œuvres affichées au lieu de ${oeuvres.length}`, { page: '/galerie' });
    await page.locator('[data-filtres] input[name="univers"][value="portraits"]').check({ force: true });
    await attendre(500);
    const portraits = oeuvres.filter((x) => x.univers === 'portraits').length;
    if ((await visibles()) !== portraits) R.echec('galerie', `filtre Portraits : ${await visibles()} au lieu de ${portraits}`, { page: '/galerie' });
    if (new URL(page.url()).searchParams.get('univers') !== 'portraits') R.echec('galerie', 'le filtre n’est pas gardé dans l’adresse', { page: '/galerie' });
    await page.goto(BASE + '/galerie?artiste=miyu-mori', { waitUntil: 'load' });
    await attendrePret(page);
    const miyu = oeuvres.filter((x) => x.artisteSlug === 'miyu-mori').length;
    if ((await visibles()) !== miyu) R.echec('galerie', `lien profond artiste : ${await visibles()} au lieu de ${miyu}`, { page: '/galerie?artiste=miyu-mori' });
    await page.goto(BASE + '/galerie?q=zzzz', { waitUntil: 'load' });
    await attendrePret(page);
    const vide = await page.evaluate(() => !document.querySelector('[data-mur-vide]').hidden);
    if (!vide) R.echec('galerie', 'aucun message quand la recherche ne trouve rien', { page: '/galerie?q=zzzz' });
    await page.locator('[data-filtres-reinitialiser]').first().click();
    await attendre(500);
    if ((await visibles()) !== oeuvres.length) R.echec('galerie', 'la réinitialisation ne remet pas les 42 œuvres', { page: '/galerie' });

    /* 5. Recherche de l'en-tête : ouverture, résultats, Échap, focus rendu. */
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await attendrePret(page);
    await page.locator('header [data-recherche-bouton]').click();
    await attendre(400);
    await page.keyboard.type('miyu');
    await attendre(900);
    const res = await page.evaluate(() => ({ ouvert: !document.querySelector('[data-recherche]').hidden, n: document.querySelectorAll('[data-recherche-resultats] li:not(.recherche-tout)').length }));
    if (!res.ouvert) R.echec('recherche', 'la fenêtre de recherche ne s’ouvre pas', { page: '/' });
    if (res.n !== Math.min(12, miyu)) R.echec('recherche', `« miyu » : ${res.n} résultats au lieu de ${Math.min(12, miyu)}`, { page: '/' });
    await page.keyboard.press('Escape');
    await attendre(300);
    if (!(await page.evaluate(() => document.querySelector('[data-recherche]').hidden))) R.echec('recherche', 'Échap ne ferme pas la recherche', { page: '/' });

    /* 6. Visionneuse : ouverture, focus dedans, Échap, focus rendu. */
    await page.goto(BASE + chemin, { waitUntil: 'load' });
    await attendrePret(page);
    await page.locator('[data-visionneuse-ouvrir]').first().click();
    await attendre(400);
    const vis = await page.evaluate(() => ({ ouvert: !document.querySelector('[data-visionneuse]').hidden, focus: document.querySelector('[data-visionneuse]').contains(document.activeElement) }));
    if (!vis.ouvert || !vis.focus) R.echec('visionneuse', 'ouverture ou focus incorrects', { page: chemin });
    await page.keyboard.press('Escape');
    await attendre(400);
    const vis2 = await page.evaluate(() => ({ ferme: document.querySelector('[data-visionneuse]').hidden, focus: document.activeElement?.matches('[data-visionneuse-ouvrir]') }));
    if (!vis2.ferme) R.echec('visionneuse', 'Échap ne ferme pas la visionneuse', { page: chemin });
    if (!vis2.focus) R.regarder('visionneuse', 'le focus ne revient pas sur « Agrandir l’œuvre »', { page: chemin });

    /* 7. Outil « Chez vous » : ajout d'une seconde œuvre, total = somme des lignes, ajout au panier. */
    await page.evaluate(() => localStorage.removeItem('sequoia:panier'));
    await page.goto(BASE + '/chez-vous', { waitUntil: 'load' });
    await attendrePret(page);
    await page.selectOption('[data-outil-choix]', { index: 3 });
    await page.locator('[data-outil-ajouter]').click();
    await attendre(400);
    const outil = await page.evaluate(() => {
      const prix = [...document.querySelectorAll('[data-outil-liste] [data-prix]')].map((e) => parseInt(e.textContent.replace(/[^\d]/g, ''), 10));
      return { n: prix.length, somme: prix.reduce((a, b) => a + b, 0), total: parseInt(document.querySelector('[data-outil-total]').textContent.replace(/[^\d]/g, ''), 10), poses: document.querySelectorAll('[data-outil-oeuvres] > *').length };
    });
    if (outil.n !== 2 || outil.poses !== 2) R.echec('chez-vous', `${outil.n} lignes et ${outil.poses} œuvres au mur au lieu de 2`, { page: '/chez-vous' });
    if (outil.somme !== outil.total) R.echec('chez-vous', `total ${outil.total} € au lieu de ${outil.somme} €`, { page: '/chez-vous' });
    await page.locator('[data-outil-panier]').click();
    await attendre(600);
    const n3 = await page.evaluate(() => JSON.parse(localStorage.getItem('sequoia:panier') || '{"lignes":[]}').lignes.length);
    if (n3 !== 2) R.echec('chez-vous', `la composition ajoute ${n3} lignes au panier au lieu de 2`, { page: '/chez-vous' });
  } finally { await ordi.ctx.close(); }
}
