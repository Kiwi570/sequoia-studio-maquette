/* Qui sommes-nous : textes du site actuel, photos du showroom, portraits et citations des fondateurs. */
import { html } from '../../outils/gabarit.mjs';
import { tete } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'qui-sommes-nous', fichier: 'qui-sommes-nous', imagePartage: 'equipe/freres-tost-showroom-1023.webp', partageSous: 'Gilles et Frédéric TOST, fondateurs de Sequoia Studio' };

export default (c) => html`
<section class="scene scene--studio ecran" id="debut" data-scene style="--nuit:#110f0d">
  <div class="studio-ouverture">
    <div class="studio-photo" data-anime="gsap" data-scene-oeuvre>${c.media({ nom: 'equipe/freres-tost-showroom', alt: c.s('studio.alt'), priorite: true, sizes: '(max-width: 760px) 100vw, 42vw', ratio: '1023 / 1537', cadrage: '50% 35%', cadrageMobile: '50% 30%' })}</div>
  </div>
  <div class="scene-texte scene-texte--studio">
    <p class="surtitre" data-anime="gsap">${c.t('studio.surtitre')}</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('studio.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('studio.texte')}</p>
    <p class="hero-actions" data-anime="gsap">${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('studio.action')}</span>${icone.fleche}`, attrs: 'data-action-principale data-magnetique' })}</p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('studio.info')}</p>
  </div>
</section>

<section class="studio-bloc" id="ambition">
  <div class="conteneur studio-grille">
    <div>
      <p class="studio-lettrine" data-anime>${c.t('studio.texte2')}</p>
      ${tete(c, { titre: c.t('studio.muralTitre') })}
      <p data-anime>${c.t('studio.mural')}</p>
    </div>
    ${c.media({ nom: 'ambiances/salon-deux-oeuvres', alt: c.s('studio.muralAlt'), sizes: '(max-width: 760px) 100vw, 45vw', ratio: '889 / 913' })}
  </div>
</section>

<section class="studio-bloc studio-bloc--inverse" id="selection">
  <div class="conteneur studio-grille">
    ${c.media({ nom: 'equipe/gilles-tost-showroom', alt: c.s('studio.selectionAlt'), sizes: '(max-width: 760px) 100vw, 40vw', ratio: '1086 / 1448', cadrage: '50% 40%' })}
    <div>
      ${tete(c, { titre: c.t('studio.selectionTitre') })}
      <p data-anime>${c.t('studio.selection1')}</p>
      <p data-anime>${c.t('studio.selection2')}</p>
    </div>
  </div>
</section>

<section class="studio-bloc" id="atelier">
  <div class="conteneur studio-grille">
    <div>
      ${tete(c, { titre: c.t('studio.atelierTitre') })}
      <p data-anime>${c.t('studio.atelier1')}</p>
      <p data-anime>${c.t('studio.atelier2')}</p>
      <p data-anime>${c.lien('cadres-et-finitions', { classe: 'lien-fleche', texte: html`${c.libelle('cadres-et-finitions')}${icone.fleche}` })}</p>
    </div>
    ${c.media({ nom: 'grok/atelier-nuit', alt: c.s('studio.atelierAlt'), sizes: '(max-width: 760px) 100vw, 50vw', ratio: '16 / 10' })}
  </div>
</section>

<section class="createurs" id="createurs">
  <div class="conteneur">
    ${tete(c, { titre: c.t('studio.createursTitre'), centre: true })}
    <div class="createurs-grille">
      ${[['gilles-tost', 'gilles'], ['frederic-tost', 'fred']].map(([img, k]) => html`<figure class="createur" data-anime>
        ${c.media({ nom: 'equipe/' + img, alt: c.s(`studio.${k}Alt`), sizes: '(max-width: 760px) 50vw, 18vw', ratio: '1 / 1', classe: 'createur-photo' })}
        <blockquote class="citation"><p>${c.t(`studio.${k}Citation`)}</p></blockquote>
        <figcaption><strong>${c.t(`studio.${k}Nom`)}</strong><span>${c.t(`studio.${k}Role`)}</span></figcaption>
      </figure>`)}
    </div>
  </div>
</section>

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille">
    ${c.media({ nom: 'ambiances/console-trois-oeuvres', alt: c.s('galerie.finAlt'), sizes: '(max-width: 760px) 100vw, 50vw', ratio: '16 / 9', cadrage: '45% 50%' })}
    <div>
      ${tete(c, { titre: c.t('studio.finTitre'), texte: c.t('studio.finTexte') })}
      <p class="fin-actions" data-anime><a class="bouton bouton--plein" href="mailto:${c.site.contact.email}">${icone.mail}<span>${c.t('studio.finAction')}</span></a> ${c.lien('galerie', { classe: 'bouton bouton--contour', texte: c.t('studio.finGalerie') })}</p>
    </div>
  </div>
</section>
`;
