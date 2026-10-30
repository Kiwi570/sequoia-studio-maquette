/* Page 404 : un mur vide qui attend son œuvre, retour à la galerie. */
import { html } from '../../outils/gabarit.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: '404', fichier: '404', partage: false };

export default (c) => html`
<section class="scene scene--introuvable ecran" id="debut" data-scene style="--nuit:#0e0d0c">
  <div class="scene-fond scene-fond--plein">${c.media({ nom: 'grok/mur-vide-404', alt: c.s('introuvable.alt'), priorite: true, sizes: '100vw' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="scene-texte scene-texte--centre">
    <p class="surtitre" data-anime="gsap">404</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('introuvable.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('introuvable.texte')}</p>
    <p class="hero-actions" data-anime="gsap">${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('introuvable.retour')}</span>${icone.fleche}`, attrs: 'data-action-principale' })} ${c.lien('accueil', { classe: 'bouton bouton--contour', texte: c.t('introuvable.accueil') })}</p>
  </div>
</section>
`;
