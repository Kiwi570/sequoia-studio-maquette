/* Commande simulée : récapitulatif du panier (gardé dans le navigateur), coordonnées, paiement simulé
   sans aucune donnée bancaire, acceptation des CGV. Rien n'est vendu ni envoyé. */
import { html } from '../../outils/gabarit.mjs';
import { tete } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'commande', fichier: 'commande', imagePartage: 'ambiances/console-trois-oeuvres-1920.webp', barre: false };

export default (c) => html`
<section class="commande-tete" id="debut" data-scene style="--nuit:#100d0b">
  <div class="conteneur commande-tete-grille">
    <div>
      <p class="surtitre" data-anime="gsap">${c.t('commande.surtitre')}</p>
      <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('commande.titre')}</span></span></h1>
      <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('commande.texte')}</p>
      <p class="hero-actions" data-anime="gsap"><a class="bouton bouton--plein" href="#coordonnees" data-action-principale>${c.t('commande.action')}${icone.fleche}</a></p>
      <p class="hero-info" data-info-cle data-anime="gsap">${c.t('commande.info')}</p>
    </div>
    ${c.media({ nom: 'grok/emballage', alt: c.s('commande.alt'), priorite: true, sizes: '(max-width: 760px) 100vw, 40vw', ratio: '16 / 10' })}
  </div>
</section>

<section class="commande" id="recapitulatif" data-commande data-sans-visuel>
  <div class="conteneur commande-grille">
    <div class="commande-recap">
      <h2 class="titre-section titre-section--petit">${c.t('commande.recapTitre')}</h2>
      <ul class="commande-liste" data-commande-liste aria-live="polite"></ul>
      <div class="commande-vide" data-commande-vide><p>${c.t('commande.vide')}</p><p>${c.lien('galerie', { classe: 'bouton bouton--contour', texte: c.t('commande.videAction') })}</p></div>
      <noscript><p>${c.t('commande.sansJs')}</p></noscript>
      <dl class="commande-totaux">
        <div><dt>${c.t('commande.sousTotal')}</dt><dd data-prix data-commande-sous-total>0 €</dd></div>
        <div><dt>${c.t('commande.livraison')}</dt><dd class="a-completer">${c.t('commande.livraisonValeur')}</dd></div>
        <div class="commande-total"><dt>${c.t('commande.total')}</dt><dd data-prix data-commande-total>0 €</dd></div>
      </dl>
      <p class="mention-prix">${c.t('commun.prixMention')}</p>
      <p class="outil-note">${c.t('commande.retractation')}</p>
      <ul class="logos logos--inline logos--commande" aria-label="${c.s('commun.paiement')}"><li><img src="/assets/images/logos/cb.svg" alt="CB" width="34" height="24"></li><li><img src="/assets/images/logos/visa.svg" alt="Visa" width="34" height="24"></li><li><img src="/assets/images/logos/mastercard.svg" alt="Mastercard" width="34" height="24"></li></ul>
    </div>
    <form class="commande-form formulaire" id="coordonnees" data-formulaire data-commande-form action="#" novalidate>
      <h2 class="titre-section titre-section--petit">${c.t('commande.coordonneesTitre')}</h2>
      <p class="outil-note">${c.t('commande.etapes')}</p>
      <div class="champs-2">
        <div class="champ"><label for="c-prenom">${c.t('commande.prenom')}</label><input id="c-prenom" name="prenom" autocomplete="given-name" required></div>
        <div class="champ"><label for="c-nom">${c.t('commande.nom')}</label><input id="c-nom" name="nom" autocomplete="family-name" required></div>
      </div>
      <div class="champ"><label for="c-email">${c.t('commande.email')}</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
      <div class="champ"><label for="c-tel">${c.t('commande.tel')}</label><input id="c-tel" name="tel" type="tel" autocomplete="tel" required></div>
      <div class="champ"><label for="c-adresse">${c.t('commande.adresse')}</label><input id="c-adresse" name="adresse" autocomplete="street-address" required></div>
      <div class="champs-2">
        <div class="champ"><label for="c-cp">${c.t('commande.cp')}</label><input id="c-cp" name="cp" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{5}" required></div>
        <div class="champ"><label for="c-ville">${c.t('commande.ville')}</label><input id="c-ville" name="ville" autocomplete="address-level2" required></div>
      </div>
      <div class="champ"><label for="c-pays">${c.t('commande.pays')}</label><select id="c-pays" name="pays"><option>${c.t('commande.paysValeur')}</option></select></div>
      <h3 class="petit-titre">${c.t('commande.paiementTitre')}</h3>
      <p class="paiement-carte">${c.t('commande.paiementTexte')}</p>
      <div class="champ champ--case"><input id="c-cgv" name="cgv" type="checkbox" value="oui" required><label for="c-cgv">${c.t('commande.cgv')} ${c.lien('cgv', { texte: c.t('commande.cgvLien') })}</label></div>
      <p class="mention-donnees">${c.tb('commande.donnees')}</p>
      <button type="submit" class="bouton bouton--plein" data-commande-payer>${c.t('commande.envoyer')}</button>
      <p data-message-envoi data-texte="${c.s('commande.envoye')}" role="status" tabindex="-1" hidden></p>
      <p class="commande-suite">${c.lien('galerie', { classe: 'bouton bouton--contour', texte: c.t('commande.retourGalerie') })}</p>
    </form>
  </div>
  <template data-commande-ligne-modele>
    <li class="commande-ligne">
      <img class="commande-ligne-image" alt="" width="80" height="80">
      <div class="commande-ligne-corps">
        <p class="commande-ligne-titre"><a data-ligne-lien></a></p>
        <p class="commande-ligne-detail" data-ligne-detail></p>
        <p class="commande-ligne-actions"><label><span>${c.t('commun.panier.quantite')}</span> <select data-ligne-quantite><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label> <button type="button" class="lien" data-ligne-retirer>${c.t('commun.panier.retirer')}</button></p>
      </div>
      <strong class="commande-ligne-prix" data-prix data-ligne-prix></strong>
    </li>
  </template>
</section>
`;
