/* Certificat & authenticité : ouverture (certificat spécimen dessiné en code, reflet holographique qui suit
   la lumière), technologies, double étiquette (fil entre le certificat et l'œuvre), vérification par smartphone
   avec démonstration illustrative, revente, perte ou vol. Textes repris du site actuel. */
import { html } from '../../outils/gabarit.mjs';
import { oeuvre, tete, certificat } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'certificat', fichier: 'certificat', imagePartage: 'certificat/hologramme-nfc-1920.webp', partageSous: 'Hologramme et puce NFC, sur le certificat et sur l’œuvre' };

export default (c) => {
  const o = oeuvre(c, 'solitude-hivernale');
  const article = c.donnees.articles[0];
  return html`
<section class="scene scene--certificat ecran" id="debut" data-scene style="--nuit:#100d14">
  <div class="scene-fond scene-fond--plein">${c.media({ nom: 'grok/texture-hologramme', alt: c.s('certificat.alt'), priorite: true, sizes: '100vw' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="certificat-ouverture" data-anime="gsap" data-scene-oeuvre data-visuel>${certificat(c, o, { classe: 'certificat--ouverture' })}</div>
  <div class="scene-texte scene-texte--certificat">
    <p class="surtitre" data-anime="gsap">${c.t('certificat.surtitre')}</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('certificat.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('certificat.texte')}</p>
    <p class="hero-actions" data-anime="gsap"><a class="bouton bouton--plein" href="#verification" data-action-principale data-magnetique><span>${c.t('certificat.action')}</span>${icone.fleche}</a></p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('certificat.info')}</p>
  </div>
</section>

<section class="techno" id="technologies">
  <div class="conteneur techno-grille">
    <div>
      ${tete(c, { titre: c.t('certificat.techTitre') })}
      <p data-anime>${c.t('certificat.tech1')}</p>
      <p data-anime>${c.t('certificat.tech2')}</p>
      <p data-anime>${c.t('certificat.tech3')}</p>
    </div>
    ${c.media({ nom: 'certificat/hologramme-nfc', alt: c.s('certificat.techAlt'), sizes: '(max-width: 760px) 100vw, 45vw', ratio: '1 / 1' })}
  </div>
</section>

<section class="double" id="double-securisation" data-double>
  <div class="conteneur">
    ${tete(c, { titre: c.t('certificat.doubleTitre'), texte: c.t('certificat.double1') })}
  </div>
  <div class="conteneur double-grille">
    <figure class="double-cote" data-anime>
      <div class="double-certificat">${certificat(c, o, { classe: 'certificat--petit' })}</div>
      <figcaption><span class="eclate-puce" aria-hidden="true">1</span>${c.t('certificat.etiquette1')}</figcaption>
    </figure>
    <svg class="double-fil" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true" data-double-fil><path d="M0 50 C60 0 140 100 200 50" pathLength="1"/></svg>
    <figure class="double-cote" data-anime>
      ${c.media({ nom: 'certificat/etiquette-dos-cadre-hologramme', alt: c.s('certificat.doubleAlt'), sizes: '(max-width: 760px) 80vw, 30vw', ratio: '1 / 1' })}
      <figcaption><span class="eclate-puce" aria-hidden="true">2</span>${c.t('certificat.etiquette2')}</figcaption>
    </figure>
  </div>
  <div class="conteneur double-texte">
    <p data-anime>${c.t('certificat.double2')}</p>
    <p data-anime>${c.t('certificat.double3')}</p>
  </div>
</section>

<section class="verification" id="verification" data-verification>
  <div class="conteneur verification-grille">
    <div>
      ${tete(c, { titre: c.t('certificat.verifTitre') })}
      <p data-anime>${c.t('certificat.verif1')}</p>
      <p data-anime>${c.t('certificat.verif2')}</p>
      <p data-anime>${c.t('certificat.verif3')}</p>
    </div>
    <div class="demo-nfc" data-demo-nfc>
      <p class="petit-titre">${c.t('certificat.demoTitre')}</p>
      <div class="demo-nfc-scene">
        <div class="demo-nfc-etiquette" aria-hidden="true"><span class="certificat-holo"><span>${c.t('certificatCarte.nfc')}</span></span></div>
        <svg class="demo-nfc-ondes" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="30"/><circle cx="100" cy="100" r="30"/><circle cx="100" cy="100" r="30"/></svg>
        <div class="demo-nfc-telephone" data-demo-nfc-telephone>
          <div class="demo-nfc-ecran">
            <img src="/assets/images/logo-nuit-256.webp" alt="" width="64" height="64">
            <p class="demo-nfc-etat" data-demo-nfc-etat role="status" aria-live="polite">${c.t('certificat.demoBouton')}</p>
            <ul class="demo-nfc-etapes" data-demo-nfc-etapes>
              <li>${c.t('certificat.demoLecture')}</li><li>${c.t('certificat.demoControle')}</li><li>${c.t('certificat.demoValide')}</li>
            </ul>
          </div>
        </div>
      </div>
      <p><button type="button" class="bouton bouton--contour" data-demo-nfc-bouton data-libelle-recommencer="${c.s('certificat.demoRecommencer')}">${c.t('certificat.demoBouton')}</button></p>
      <p class="outil-note">${c.t('certificat.demoNote')}</p>
    </div>
  </div>
  <div class="conteneur">${c.media({ nom: 'certificat/verification-smartphone', alt: c.s('certificat.verifAlt'), sizes: '(max-width: 760px) 100vw, 50vw', ratio: '16 / 9', cadrage: '50% 50%', classe: 'verification-photo' })}</div>
</section>

<section class="transmission" id="transmission">
  <div class="conteneur transmission-grille">
    ${c.media({ nom: 'grok/atelier-gants', alt: c.s('certificat.transmissionAlt'), sizes: '(max-width: 760px) 100vw, 45vw', ratio: '4 / 3' })}
    <div>
      ${tete(c, { titre: c.t('certificat.transmissionTitre') })}
      <p data-anime>${c.t('certificat.transmission1')}</p>
      <p data-anime>${c.t('certificat.transmission2')}</p>
    </div>
  </div>
</section>

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille">
    ${c.media({ nom: 'certificat/hologramme-gros-plan', alt: article.couvertureAlt, sizes: '(max-width: 760px) 100vw, 45vw', ratio: '16 / 9', cadrage: '45% 55%' })}
    <div>
      ${tete(c, { titre: c.t('certificat.finTitre'), texte: c.t('certificat.finTexte') })}
      <p class="fin-actions" data-anime>${c.lien('article-' + article.slug, { classe: 'bouton bouton--contour', texte: c.t('certificat.finArticle') })} ${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('certificat.finAction')}</span>${icone.fleche}` })}</p>
    </div>
  </div>
</section>
`;
};
