/* Gabarit commun Sequoia Studio : head, en-tête, menu, recherche, panier, pied de page, barre fixe du téléphone,
   voile et panneau d'ouverture. Les conventions data-* sont celles que lisent le socle JavaScript et l'audit. */
import { html, brut } from '../../outils/gabarit.mjs';

const navigation = (c) => c.site.navigation.filter((cle) => c.pages[cle] && (c.pages[cle].langues || c.langues).includes(c.l));

/* Icônes en ligne (traits fins, couleur du texte). */
export const icone = {
  recherche: brut('<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'),
  panier: brut('<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14l-1.2 12H6.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'),
  fleche: brut('<svg class="icone icone--fleche" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
  fermer: brut('<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'),
  mail: brut('<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'),
};

function tete(c) {
  const p = c.page, cle = p.cle;
  const titre = c.s(`pages.${cle}.titre`), description = c.s(`pages.${cle}.description`);
  const ici = c.abs(c.url(cle));
  const imagePartage = c.abs(`/assets/partage/${p.partage === false ? 'accueil' : cle.replace(/\//g, '-')}-${c.l}.jpg`);
  const structure = p.structure || (cle === 'accueil' ? c.donnees.structure : null);
  const json = structure ? JSON.stringify(structure).replace(/</g, '\\u003c') : '';
  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${titre}</title>
<meta name="description" content="${description}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${ici}">
<style>${brut(c.critique.css)}</style>
<script>${brut(c.critique.js)}</script>
${(c.site.polices || []).map((f) => html`<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>\n`)}<link rel="stylesheet" href="${c.asset('css/socle.css')}">
<link rel="stylesheet" href="${c.asset('css/site.css')}">
<link rel="modulepreload" href="${c.asset('js/site.js')}">
<link rel="modulepreload" href="${c.asset('js/socle/index.js')}">
<script src="/assets/vendor/gsap.min.js" defer></script>
<script src="/assets/vendor/ScrollTrigger.min.js" defer></script>
<script src="/assets/vendor/SplitText.min.js" defer></script>
<script type="module" src="${c.asset('js/site.js')}"></script>
<meta name="theme-color" content="${c.site.couleurs.theme || c.site.couleurs.fond}">
<link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
<meta property="og:type" content="${p.ogType || 'website'}">
<meta property="og:site_name" content="${c.site.nom}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${ici}">
<meta property="og:image" content="${imagePartage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${c.s(`pages.${p.partage === false ? 'accueil' : cle}.partageAlt`)}">
<meta name="twitter:card" content="summary_large_image">
${json ? html`<script type="application/ld+json">${brut(json)}</script>` : ''}
</head>`;
}

function entete(c) {
  return html`<header data-entete>
  <div class="entete-rangee">
    <a class="entete-logo" href="${c.url('accueil')}" data-libelle="${c.libelle('accueil')}"${c.page.cle === 'accueil' ? brut(' aria-current="page"') : ''}>
      <img src="/assets/images/logo.svg" alt="" width="36" height="36"><span>${c.site.nom}</span>
    </a>
    <nav data-nav aria-label="${c.s('commun.navigation')}">
      <ul>${navigation(c).filter((k) => k !== 'accueil').map((k) => html`<li>${c.lien(k, { classe: 'nav-lien' })}</li>`)}</ul>
    </nav>
    <div class="entete-actions">
      <a class="entete-icone" href="${c.url('galerie', 'recherche')}" data-recherche-bouton data-libelle="${c.libelle('galerie')}" aria-label="${c.s('commun.recherche.titre')}">${icone.recherche}<span class="entete-icone-texte">${c.t('commun.recherche.bouton')}</span></a>
      <a class="bouton bouton--entete" href="${c.url('commande')}" data-panier-bouton data-libelle="${c.libelle('commande')}" aria-label="${c.s('commun.panierLibelle')}">${icone.panier}<span>${c.t('commun.actionEntete')}</span><span class="panier-nombre" data-panier-nombre></span></a>
      <button type="button" class="bouton-menu" data-menu-bouton aria-controls="menu" aria-expanded="false" data-libelle-ouvrir="${c.s('commun.menu')}" data-libelle-fermer="${c.s('commun.fermer')}"><span class="bouton-menu-traits" aria-hidden="true"></span><span data-libelle-bouton>${c.t('commun.menu')}</span></button>
    </div>
  </div>
</header>
<div id="menu" data-menu role="dialog" aria-modal="true" aria-label="${c.s('commun.menu')}">
  <div class="menu-grille">
    <ul class="menu-liste">${navigation(c).map((k, i) => html`<li style="--i:${i}">${c.lien(k, { classe: 'menu-lien' })}</li>`)}</ul>
    <div class="menu-cote">
      <p><a class="bouton" href="${c.url('commande')}" data-libelle="${c.libelle('commande')}">${icone.panier}<span>${c.t('commun.actionEntete')}</span></a></p>
      <p><a class="lien-fleche" href="mailto:${c.site.contact.email}">${icone.mail}<span>${c.site.contact.email}</span></a></p>
      <p><button type="button" class="lien" data-calme-bascule data-libelle-reduire="${c.s('commun.calmeReduire')}" data-libelle-retablir="${c.s('commun.calmeRetablir')}" data-libelle-systeme="${c.s('commun.calmeSysteme')}"><span data-libelle-bouton>${c.t('commun.calmeReduire')}</span></button></p>
    </div>
  </div>
</div>
<div class="recherche" id="recherche-fenetre" data-recherche data-recouvrement role="dialog" aria-modal="true" aria-labelledby="recherche-titre" hidden>
  <div class="recherche-boite">
    <div class="recherche-tete">
      <h2 id="recherche-titre" class="recherche-titre">${c.t('commun.recherche.titre')}</h2>
      <button type="button" class="bouton-rond" data-recherche-fermer aria-label="${c.s('commun.fermer')}">${icone.fermer}</button>
    </div>
    <form class="recherche-form" action="${c.url('galerie')}" method="get" role="search">
      <label class="visuellement-cache" for="recherche-champ">${c.t('commun.recherche.titre')}</label>
      ${icone.recherche}<input id="recherche-champ" name="q" type="search" autocomplete="off" placeholder="${c.s('commun.recherche.champ')}">
    </form>
    <p class="recherche-statut" data-recherche-statut aria-live="polite" data-resultats="${c.s('commun.recherche.resultats')}" data-aucun="${c.s('commun.recherche.aucun')}" data-tout="${c.s('commun.recherche.tout')}" data-galerie="${c.libelle('galerie')}" data-des="${c.s('commun.recherche.des')}"></p>
    <ul class="recherche-resultats" data-recherche-resultats></ul>
  </div>
</div>
<aside class="tiroir" id="panier" data-tiroir data-recouvrement role="dialog" aria-modal="true" aria-labelledby="panier-titre" hidden>
  <div class="tiroir-voile" data-tiroir-fermer></div>
  <div class="tiroir-boite">
    <div class="tiroir-tete">
      <h2 id="panier-titre">${c.t('commun.panier.titre')}</h2>
      <button type="button" class="bouton-rond" data-tiroir-fermer aria-label="${c.s('commun.fermer')}">${icone.fermer}</button>
    </div>
    <div class="tiroir-corps"><ul class="tiroir-liste" data-panier-liste></ul><div class="tiroir-vide" data-panier-vide><p>${c.t('commun.panier.vide')}</p><p>${c.lien('galerie', { classe: 'bouton bouton--contour', texte: c.t('commun.panier.videAction') })}</p></div></div>
    <div class="tiroir-pied">
      <p class="tiroir-total"><span>${c.t('commun.panier.total')}</span><strong data-panier-total data-prix>0 €</strong></p>
      <p class="mention-prix">${c.t('commun.prixMention')} · ${c.t('commun.panier.livraison')}</p>
      <p><a class="bouton bouton--plein" href="${c.url('commande')}" data-libelle="${c.libelle('commande')}" data-panier-commander>${c.t('commun.panier.commander')}</a></p>
      <p class="tiroir-note">${c.t('commun.panier.simule')}</p>
    </div>
  </div>
</aside>
<template data-panier-modele data-ajoute="${c.s('commun.panier.ajoute', { titre: '' })}" data-retire="${c.s('commun.panier.retire', { titre: '' })}" data-quantite="${c.s('commun.panier.quantite')}" data-retirer="${c.s('commun.panier.retirer')}">
  <li class="tiroir-ligne">
    <a class="tiroir-ligne-image" data-ligne-lien tabindex="-1" aria-hidden="true"><img alt="" width="72" height="72"></a>
    <div class="tiroir-ligne-corps">
      <p class="tiroir-ligne-titre"><a data-ligne-lien></a></p>
      <p class="tiroir-ligne-detail" data-ligne-detail></p>
      <p class="tiroir-ligne-actions"><span data-ligne-quantite-texte></span> <button type="button" class="lien" data-ligne-retirer>${c.t('commun.panier.retirer')}</button></p>
    </div>
    <strong class="tiroir-ligne-prix" data-prix data-ligne-prix></strong>
  </li>
</template>
<p class="visuellement-cache" aria-live="polite" data-annonce></p>`;
}

function pied(c) {
  const legales = ['mentions-legales', 'cgv', 'confidentialite'];
  return html`<footer class="pied" id="pied">
  <div class="conteneur pied-grille">
    <div class="pied-marque">
      <div class="pied-sequoia" aria-hidden="true"><img src="/assets/images/logo-nuit-256.webp" alt="" width="256" height="256" loading="lazy" decoding="async"></div>
      <p class="pied-nom">${c.site.nom}</p>
      <p class="pied-texte">${c.t('commun.piedTexte')}</p>
      <p><a class="lien-fleche" href="mailto:${c.site.contact.email}">${icone.mail}<span>${c.site.contact.email}</span></a></p>
      <p><a class="lien-fleche" href="${c.site.contact.instagram}" target="_blank" rel="noopener" aria-label="${c.s('commun.instagramLibelle')}"><span>Instagram ${c.site.contact.instagramNom}</span></a></p>
    </div>
    <nav aria-label="${c.s('commun.sommaire')}">
      <p class="pied-titre">${c.t('commun.sommaire')}</p>
      <ul>${navigation(c).map((k) => html`<li>${c.lien(k)}</li>`)}<li>${c.lien('commande')}</li></ul>
    </nav>
    <div>
      <p class="pied-titre">${c.t('commun.legal')}</p>
      <ul>${legales.map((k) => html`<li>${c.lien(k)}</li>`)}</ul>
      <p class="pied-titre pied-titre--espace">${c.t('commun.paiement')}</p>
      <ul class="logos" aria-label="${c.s('commun.paiement')}">
        <li><img src="/assets/images/logos/cb.svg" alt="CB" width="34" height="24" loading="lazy"></li>
        <li><img src="/assets/images/logos/visa.svg" alt="Visa" width="34" height="24" loading="lazy"></li>
        <li><img src="/assets/images/logos/mastercard.svg" alt="Mastercard" width="34" height="24" loading="lazy"></li>
      </ul>
    </div>
    <div>
      <p class="pied-titre">${c.t('commun.expedition')}</p>
      <ul class="logos logos--transport" aria-label="${c.s('commun.expedition')}">
        <li><img src="/assets/images/logos/ups.svg" alt="UPS" width="21" height="25" loading="lazy"></li>
        <li><img src="/assets/images/logos/dpd.svg" alt="DPD" width="50" height="21" loading="lazy"></li>
        <li><img src="/assets/images/logos/colissimo.svg" alt="Colissimo" width="82" height="21" loading="lazy"></li>
      </ul>
      <p class="pied-titre pied-titre--espace">${c.t('commun.confort')}</p>
      <ul>
        <li><button type="button" class="lien" data-calme-bascule data-libelle-reduire="${c.s('commun.calmeReduire')}" data-libelle-retablir="${c.s('commun.calmeRetablir')}" data-libelle-systeme="${c.s('commun.calmeSysteme')}"><span data-libelle-bouton>${c.t('commun.calmeReduire')}</span></button></li>
        <li><a href="#haut" data-sans-transition>${c.t('commun.retourHaut')}</a></li>
      </ul>
    </div>
  </div>
  <div class="conteneur pied-bas"><p>${c.t('commun.maquette')}</p><p>© 2018–2026 ${c.site.contact.societe}</p></div>
</footer>`;
}

function barre(c) {
  if (c.page.barre === 'oeuvre') {
    /* Fiche œuvre : total de la sélection et ajout au panier, toujours visibles sur téléphone. */
    const o = c.donnees.oeuvres.find((x) => x.slug === c.page.slug);
    const f = o.formats[Math.min(1, o.formats.length - 1)];
    const fi = f.prix['caisse-noire'] != null ? 'caisse-noire' : 'toile';
    const nomFi = c.donnees.finitions.find((x) => x.id === fi).court;
    const euros = `${new Intl.NumberFormat('fr-FR').format(f.prix[fi]).replace(/[  ]/g, ' ')} €`;
    return html`<div data-barre-fixe class="barre-oeuvre">
  <p class="barre-total"><span class="barre-libelle">${c.t('oeuvre.barreTotal')}</span><strong data-prix data-config-prix-barre>${euros}</strong><span class="barre-choix" data-config-choix-barre>${f.largeur} × ${f.hauteur} cm · ${nomFi}</span></p>
  <button type="button" class="bouton bouton--plein" data-config-ajouter>${icone.panier}<span data-config-ajouter-texte>${c.t('oeuvre.ajouter')}</span></button>
</div>`;
  }
  if (c.page.barre === false) return '';
  return html`<div data-barre-fixe>
  <a class="bouton bouton--contour" href="mailto:${c.site.contact.email}" aria-label="${c.s('commun.ecrireLibelle')}">${icone.mail}<span>${c.t('commun.ecrire')}</span></a>
  ${c.page.cle === 'galerie' ? html`<a class="bouton" href="${c.url('commande')}" data-panier-bouton data-libelle="${c.libelle('commande')}">${icone.panier}<span>${c.t('commun.actionEntete')}</span><span class="panier-nombre" data-panier-nombre></span></a>`
    : html`<a class="bouton" href="${c.url('galerie')}" data-libelle="${c.libelle('galerie')}">${c.t('commun.galerie')}</a>`}
</div>`;
}

function voile(c) {
  return html`<div data-voile aria-hidden="true"><div class="voile-contenu"><img src="/assets/images/logo-clair.svg" alt="" width="72" height="72"><span class="voile-trait"></span><span data-voile-libelle>${c.libelle(c.page.cle)}</span></div></div>`;
}

export function page(c, contenu) {
  return html`<!doctype html>
<html lang="${c.l}" data-v="${c.v}" data-page="${c.page.gabarit || c.page.cle}"${c.site.curseur ? brut(' data-curseur') : ''}${c.page.fond ? brut(` style="--fond-page:${c.page.fond}"`) : ''}>
${tete(c)}
<body id="haut">
${voile(c)}
<div class="ouverture-panneau" data-ouverture aria-hidden="true">
  <img class="ouverture-logo" src="/assets/images/logo-clair.svg" alt="" width="120" height="120">
  <p class="ouverture-nom">${c.site.nom}</p>
  <p class="ouverture-ligne">${c.t('commun.introLigne')}</p>
</div>
<a class="evitement" href="#contenu">${c.t('commun.evitement')}</a>
${entete(c)}
<main id="contenu" tabindex="-1"${c.page.sansAction ? brut(' data-sans-action') : ''}>
${contenu}
</main>
${pied(c)}
${barre(c)}
</body>
</html>`;
}
