/* Voir l'œuvre chez vous : ouverture (une œuvre se pose sur le mur d'un salon), les trois gestes (feuille A4),
   l'outil (intérieurs à l'échelle ou photo du visiteur, jusqu'à trois œuvres, formats, finitions, prix), inspirations. */
import { html, brut } from '../../outils/gabarit.mjs';
import { oeuvre, cadre, tete, prix, repereScene } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'chez-vous', fichier: 'chez-vous', imagePartage: 'ambiances/salon-quatre-oeuvres-1920.webp', partageSous: 'À l’échelle grâce à une simple feuille A4' };

const HERO = 'serenite-turquoise';

export default (c) => {
  const o = oeuvre(c, HERO);
  const interieurs = c.donnees.interieurs;
  const oeuvres = [...c.donnees.oeuvres].sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
  const artistes = c.donnees.artistes;
  const outil = {
    interieurs: interieurs.map((i) => ({ id: i.id, largeurCm: i.largeurCm, hauteurCm: i.hauteurCm, baseCm: i.baseCm, centreCm: i.centreCm })),
    oeuvres: c.donnees.oeuvres.map((x) => ({ slug: x.slug, titre: x.titre, artiste: x.artiste, image: x.petit, r: x.px.l / x.px.h, formats: x.formats.map((f) => ({ id: f.id, l: f.largeur, h: f.hauteur, prix: f.prix })) })),
    finitions: c.donnees.finitions.map((f) => ({ id: f.id, court: f.court, marge: f.marge, epaisseur: f.epaisseur })),
    defaut: 'lumieres-d-ete-mediterraneen',
  };
  return html`
<section class="scene scene--chez ecran" id="debut" data-scene style="--nuit:${o.couleur.nuit}">
  <div class="chez-ouverture" style="${repereScene(c)}">
    ${c.media({ nom: 'grok/salon-soir', alt: c.s('chezVous.alt'), priorite: true, sizes: '100vw', classe: 'chez-interieur', ratio: '1168 / 784', mobile: false })}
    <div class="chez-pose" data-anime="gsap" data-scene-oeuvre style="--l:${62 + 2 * 1.8};--h:${110 + 2 * 1.8}">${cadre(c, o, { finition: 'caisse-blanche', priorite: true, sizes: '20vw', alt: `${o.titre}, ${o.artiste}` })}</div>
  </div>
  <div class="scene-texte scene-texte--chez">
    <p class="surtitre" data-anime="gsap">${c.t('chezVous.surtitre')}</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('chezVous.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('chezVous.texte')}</p>
    <p class="hero-actions" data-anime="gsap"><a class="bouton bouton--plein" href="#outil" data-action-principale data-magnetique><span>${c.t('chezVous.action')}</span>${icone.fleche}</a></p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('chezVous.info')}</p>
  </div>
</section>

<section class="etapes" id="etapes">
  <div class="conteneur etapes-grille">
    ${c.media({ nom: 'immersion/feuille-a4-salon', alt: c.s('chezVous.etapesAlt'), sizes: '(max-width: 760px) 100vw, 45vw', ratio: '900 / 506', classe: 'etapes-photo' })}
    <div>
      ${tete(c, { titre: c.t('chezVous.etapesTitre') })}
      <ol class="etapes-liste">
        ${['e1', 'e2', 'e3'].map((e, i) => html`<li data-anime><span class="etape-n" aria-hidden="true">${i + 1}</span><h3>${c.t(`chezVous.${e}T`)}</h3><p>${c.t('chezVous.' + e)}</p></li>`)}
      </ol>
    </div>
  </div>
</section>

<section class="outil" id="outil" data-outil>
  <div class="conteneur">
    ${tete(c, { titre: c.t('chezVous.outilTitre'), texte: c.t('chezVous.outilTexte') })}
  </div>
  <div class="outil-grille conteneur">
    <div class="outil-scene" data-outil-scene role="group" aria-label="${c.s('chezVous.scene')}">
      <div class="outil-fonds">
        ${interieurs.map((i, k) => html`<div class="outil-fond${k === 0 ? ' est-actif' : ''}" data-outil-fond="${i.id}">${c.media({ nom: i.image, alt: c.s('interieurs.' + i.id), sizes: '(max-width: 900px) 100vw, 62vw', ratio: `${i.largeurCm} / ${i.hauteurCm}`, mobile: false })}</div>`)}
        <div class="outil-fond outil-fond--photo" data-outil-fond="photo" data-outil-photo-cadre data-alt="${c.s('chezVous.votrePhoto')}"><p class="outil-photo-vide" data-outil-photo-vide>${c.t('chezVous.photoVide')}</p></div>
      </div>
      <div class="outil-oeuvres" data-outil-oeuvres></div>
      <div class="outil-a4" data-outil-a4 hidden>
        <span class="outil-a4-trait" data-outil-a4-trait></span>
        <button type="button" class="outil-a4-repere" data-outil-a4-repere="g" aria-label="${c.s('chezVous.a4Gauche')}"></button>
        <button type="button" class="outil-a4-repere" data-outil-a4-repere="d" aria-label="${c.s('chezVous.a4Droit')}"></button>
      </div>
      <p class="outil-echelle" data-outil-echelle>${c.t('chezVous.' + interieurs[0].echelle)}</p>
      <p class="outil-aide"><span class="si-souris">${c.t('chezVous.glisser')}</span><span class="si-tactile">${c.t('chezVous.glisserTactile')}</span></p>
      <noscript><p class="outil-sans-js">${c.t('commande.sansJs')}</p></noscript>
    </div>
    <div class="outil-panneau">
      <fieldset class="outil-groupe"><legend>${c.t('chezVous.interieur')}</legend><div class="puces">
        ${interieurs.map((i, k) => html`<label class="puce"><input type="radio" name="interieur" value="${i.id}" data-echelle="${c.s('chezVous.' + i.echelle)}"${k === 0 ? brut(' checked') : ''}><span>${c.t('interieurs.' + i.id)}</span></label>`)}
        <label class="puce"><input type="radio" name="interieur" value="photo" data-echelle="${c.s('chezVous.echellePhoto')}"><span>${c.t('chezVous.votrePhoto')}</span></label>
      </div></fieldset>
      <div class="outil-photo" data-outil-photo-zone hidden>
        <label class="bouton bouton--contour outil-fichier">${c.t('chezVous.photoBouton')}<input type="file" accept="image/*" data-outil-fichier class="visuellement-cache"></label>
        <p class="outil-note">${c.t('chezVous.photoAide')}</p>
        <p class="outil-note"><strong>${c.t('chezVous.a4Titre')}</strong> ${c.t('chezVous.a4Aide')}</p>
      </div>
      <h3 class="petit-titre">${c.t('chezVous.choisirOeuvre')}</h3>
      <ul class="outil-liste" data-outil-liste aria-live="polite"></ul>
      <div class="outil-ajout">
        <label class="visuellement-cache" for="outil-choix">${c.t('chezVous.choisirOeuvre')}</label>
        <select id="outil-choix" data-outil-choix>
          ${artistes.map((a) => html`<optgroup label="${a.nom}">${oeuvres.filter((x) => x.artisteSlug === a.slug).map((x) => html`<option value="${x.slug}">${x.titre}</option>`)}</optgroup>`)}
        </select>
        <button type="button" class="bouton bouton--contour" data-outil-ajouter>${c.t('chezVous.ajouter')}</button>
      </div>
      <p class="outil-note" data-outil-max hidden>${c.t('chezVous.max')}</p>
      <p class="outil-total"><span>${c.t('chezVous.total')}</span><strong data-prix data-outil-total>0 €</strong></p>
      <p class="mention-prix">${c.t('commun.prixMention')}</p>
      <p><button type="button" class="bouton bouton--plein" data-outil-panier>${icone.panier}<span>${c.t('chezVous.toutAjouter')}</span></button></p>
      <p class="outil-note">${c.t('chezVous.clavier')}</p>
    </div>
  </div>
  <template data-outil-ligne-modele>
    <li class="outil-ligne">
      <img class="outil-ligne-image" alt="" width="64" height="64">
      <div class="outil-ligne-corps">
        <p class="outil-ligne-titre"></p>
        <div class="outil-ligne-reglages">
          <label><span class="visuellement-cache">${c.t('oeuvre.format')}</span><select data-ligne-format></select></label>
          <label><span class="visuellement-cache">${c.t('oeuvre.finition')}</span><select data-ligne-finition></select></label>
        </div>
        <p class="outil-ligne-prix"><strong data-prix data-ligne-prix></strong> <button type="button" class="lien" data-ligne-retirer>${c.t('chezVous.retirer')}</button></p>
      </div>
    </li>
  </template>
  <script type="application/json" data-outil-donnees>${brut(JSON.stringify(outil).replace(/</g, '\\u003c'))}</script>
</section>

<section class="inspirations" id="inspirations">
  <div class="conteneur">
    ${tete(c, { titre: c.t('chezVous.inspirationsTitre'), texte: c.t('chezVous.inspirationsTexte') })}
    <div class="inspirations-grille">
      ${[['ambiances/salon-quatre-oeuvres', 'insp1', '2021 / 778'], ['ambiances/console-trois-oeuvres', 'insp2', '3616 / 1344'], ['ambiances/salon-bleu-oeuvres', 'insp3', '3616 / 1344'], ['ambiances/salon-deux-oeuvres', 'insp4', '889 / 913']]
        .map(([n, a, r], i) => html`<div class="inspiration inspiration--${i + 1}" data-anime>${c.media({ nom: n, alt: c.s('chezVous.' + a), sizes: '(max-width: 760px) 100vw, 50vw', ratio: r })}</div>`)}
    </div>
  </div>
</section>

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille fin-grille--inverse">
    <div>
      ${tete(c, { titre: c.t('chezVous.finTitre'), texte: c.t('chezVous.finTexte') })}
      <p class="fin-actions" data-anime>${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('chezVous.finAction')}</span>${icone.fleche}` })}</p>
    </div>
    ${c.media({ nom: 'mises/' + o.slug, alt: c.s('oeuvre.miseAlt', { titre: o.titre }), sizes: '(max-width: 760px) 100vw, 40vw', ratio: '1 / 1' })}
  </div>
</section>
`;
};
