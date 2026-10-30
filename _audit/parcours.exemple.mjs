/* Parcours propres au projet : à copier en _audit/parcours.mjs et à adapter.
   Ce que les contrôles généraux ne peuvent pas deviner : calculateurs (totaux vérifiés par le calcul),
   panier (deux onglets, donnée abîmée), filtres et recherche, réservation, comptes à rebours, statuts automatiques.
   Chaque problème s'ajoute au rapport : R.echec(controle, detail, { page, taille, selecteur }) ou R.regarder(...). */
export default async function ({ contexte, attendrePret, attendre, BASE, R, T }) {
  /* Exemple : un estimateur dont le total doit égaler la somme des lignes cochées. */
  const { ctx, page } = await contexte({ taille: T('390×844') });
  try {
    await page.goto(BASE + '/estimateur', { waitUntil: 'load' });
    await attendrePret(page);
    const cases = page.locator('[data-ligne-prix] input[type="checkbox"]');
    const n = Math.min(await cases.count(), 5);
    for (let i = 0; i < n; i++) await cases.nth(i).check();
    await attendre(300);
    const { attendu, affiche, visible } = await page.evaluate(() => {
      const lignes = [...document.querySelectorAll('[data-ligne-prix] input:checked')].map((c) => parseFloat(c.closest('[data-ligne-prix]').dataset.lignePrix));
      const total = document.querySelector('[data-total]');
      const r = total.getBoundingClientRect();
      return { attendu: lignes.reduce((a, b) => a + b, 0), affiche: parseFloat(total.dataset.total), visible: r.top >= 0 && r.bottom <= innerHeight };
    });
    if (Math.abs(attendu - affiche) > 0.005) R.echec('estimateur', `total affiché ${affiche} au lieu de ${attendu}`, { page: '/estimateur', taille: '390×844' });
    if (!visible) R.echec('estimateur', 'le total n’est pas visible pendant qu’on coche', { page: '/estimateur', taille: '390×844' });

    /* Exemple : panier identique dans deux onglets, donnée abîmée nettoyée sans bloquer le site. */
    const autre = await ctx.newPage();
    await autre.goto(BASE + '/', { waitUntil: 'load' });
    await page.evaluate(() => localStorage.setItem('panier', '{abîmé'));
    await page.reload({ waitUntil: 'load' });
    if ((await attendrePret(page)) === 'jamais-pret') R.echec('panier', 'une donnée abîmée bloque le site', { page: '/estimateur' });
  } finally { await ctx.close(); }
}
