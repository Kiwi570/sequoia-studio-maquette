/* La Galerie : mur d'ouverture qui s'allume œuvre par œuvre, filtres (univers, artiste, format, couleur),
   tri et recherche gardés dans l'adresse, mur des 42 œuvres à leurs vraies proportions, raccourcis, appel final. */
import { html, brut } from '../../outils/gabarit.mjs';
import { oeuvre, carte, tete } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'galerie', fichier: 'galerie', imagePartage: 'ambiances/salon-bleu-oeuvres-1920.webp', partageSous: '42 œuvres de 3 artistes, éditions limitées, certificat d’authenticité' };

const MUR = ['regard-de-minuit', 'serenite-turquoise', 'oasis-moderne', 'eclat-du-japon', 'harmonie-etheree', 'felin-prisma', 'promenade-provencale', 'lueur-d-aurore-sur-l-ocean', 'evasion-crepusculaire', 'reflexions-sylvestres', 'danse-aquatique', 'l-indien-du-canyon'];
const RACCOURCIS = [['paysage', 'serenite-mediterraneenne'], ['portraits', 'chic-industriel-surreel'], ['architecture', 'reverie-mediterraneenne'], ['nature', 'echos-de-serenite'], ['animaux', 'symbiose-sauvage']];

export default (c) => {
  const oeuvres = [...c.donnees.oeuvres].sort((a, b) => b.ajout.localeCompare(a.ajout) || a.titre.localeCompare(b.titre, 'fr'));
  const univers = c.donnees.univers.univers;
  const artistes = c.donnees.artistes;
  const familles = c.donnees.univers.familles.filter((f) => oeuvres.some((o) => o.familles.includes(f)));
  const compte = (fn) => oeuvres.filter(fn).length;
  const puce = (nom, valeur, libelle, n, coche = false) => html`<label class="puce"><input type="radio" name="${nom}" value="${valeur}"${coche ? brut(' checked') : ''}><span>${libelle}${n != null ? html` <small>${n}</small>` : ''}</span></label>`;
  return html`
<section class="scene scene--galerie ecran" id="debut" data-scene style="--nuit:#0f0d0c">
  <div class="scene-fond scene-fond--plein">${c.media({ nom: 'grok/mur-galerie', alt: c.s('galerie.alt'), priorite: true, sizes: '100vw' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="mur-ouverture" aria-hidden="true">
    ${MUR.map((s, i) => { const o = oeuvre(c, s); return html`<span class="mur-case" style="--i:${i};--r:${o.px.l / o.px.h}" data-anime="gsap"><img src="/assets/images/${o.petit}" alt="" width="${o.px.l}" height="${o.px.h}" ${brut(i < 6 ? 'fetchpriority="high"' : 'loading="eager"')} decoding="async"></span>`; })}
  </div>
  <div class="scene-texte scene-texte--galerie">
    <p class="surtitre" data-anime="gsap">${c.t('galerie.surtitre')}</p>
    <h1 class="titre-hero titre-hero--court"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('galerie.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('galerie.texte')}</p>
    <p class="hero-actions" data-anime="gsap"><a class="bouton bouton--plein" href="#oeuvres" data-action-principale data-magnetique><span>${c.t('galerie.action')}</span>${icone.fleche}</a></p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('galerie.info')}</p>
  </div>
</section>

<section class="catalogue" id="oeuvres" data-catalogue>
  <h2 class="visuellement-cache">${c.t('galerie.filtres')}</h2>
  <form class="filtres" id="recherche" data-filtres action="${c.url('galerie')}" method="get" role="search" aria-label="${c.s('galerie.filtres')}">
    <div class="filtres-rangee conteneur">
      <div class="filtres-recherche">
        <label class="visuellement-cache" for="filtre-q">${c.t('galerie.recherche')}</label>
        ${icone.recherche}<input id="filtre-q" name="q" type="search" placeholder="${c.s('galerie.rechercheChamp')}" autocomplete="off">
      </div>
      <button type="button" class="bouton bouton--contour filtres-ouvrir" data-filtres-ouvrir aria-expanded="false" aria-controls="filtres-panneau">${c.t('galerie.afficherFiltres')}<span class="filtres-compte" data-filtres-compte></span></button>
      <div class="filtres-tri">
        <label for="filtre-tri">${c.t('galerie.tri')}</label>
        <select id="filtre-tri" name="tri">
          <option value="nouveau">${c.t('galerie.triNouveau')}</option>
          <option value="prix">${c.t('galerie.triPrixCroissant')}</option>
          <option value="prix-desc">${c.t('galerie.triPrixDecroissant')}</option>
          <option value="titre">${c.t('galerie.triTitre')}</option>
        </select>
      </div>
      <p class="filtres-nombre" aria-live="polite"><strong data-filtres-nombre>${c.t('galerie.nombre', { n: oeuvres.length })}</strong></p>
    </div>
    <div class="filtres-panneau conteneur" id="filtres-panneau" data-filtres-panneau>
      <fieldset><legend>${c.t('galerie.univers')}</legend><div class="puces">
        ${puce('univers', '', c.t('galerie.tous'), null, true)}${univers.map((u) => puce('univers', u.cle, u.nom, u.nombre))}
      </div></fieldset>
      <fieldset><legend>${c.t('galerie.artiste')}</legend><div class="puces">
        ${puce('artiste', '', c.t('galerie.tous'), null, true)}${artistes.map((a) => puce('artiste', a.slug, a.nom, compte((o) => o.artisteSlug === a.slug)))}
      </div></fieldset>
      <fieldset><legend>${c.t('galerie.orientation')}</legend><div class="puces">
        ${puce('format', '', c.t('galerie.tous'), null, true)}${['paysage', 'portrait', 'carre'].map((f) => puce('format', f, c.t('galerie.' + f), compte((o) => o.orientation === f)))}
      </div></fieldset>
      <fieldset><legend>${c.t('galerie.couleur')}</legend><div class="puces puces--couleurs">
        ${puce('couleur', '', c.t('galerie.toutes'), null, true)}${familles.map((f) => html`<label class="puce puce--couleur"><input type="radio" name="couleur" value="${f}"><span><i class="pastille pastille--${f}" aria-hidden="true"></i>${c.t('galerie.familles.' + f)} <small>${compte((o) => o.familles.includes(f))}</small></span></label>`)}
      </div></fieldset>
      <p class="filtres-pied"><button type="reset" class="lien" data-filtres-reinitialiser>${c.t('galerie.reinitialiser')}</button><span class="mention-prix">${c.t('commun.prixMentionListe')}</span></p>
      <p class="filtres-voir"><button type="button" class="bouton bouton--plein" data-filtres-voir data-modele="${c.s('galerie.voirOeuvres')}">${c.t('galerie.voirOeuvres', { n: oeuvres.length })}</button></p>
    </div>
  </form>
  <div class="conteneur mur-oeuvres-zone">
    <p class="mur-aide"><span class="si-souris">${c.t('galerie.chezVous')}</span><span class="si-tactile">${c.t('galerie.chezVousTactile')}</span></p>
    <div class="mur-oeuvres" data-mur>
      ${oeuvres.map((o) => carte(c, o))}
    </div>
    <div class="mur-vide" data-mur-vide hidden><p>${c.t('galerie.aucune')}</p><p><button type="button" class="bouton bouton--contour" data-filtres-reinitialiser>${c.t('galerie.aucuneAction')}</button></p></div>
  </div>
</section>

<section class="raccourcis" id="univers">
  <div class="conteneur">
    ${tete(c, { titre: c.t('galerie.raccourcis') })}
    <ul class="raccourcis-liste" role="list">
      ${RACCOURCIS.map(([u, s]) => { const o = oeuvre(c, s); const n = univers.find((x) => x.cle === u); return html`<li data-anime><a class="raccourci" href="${c.url('galerie', 'oeuvres', `univers=${u}`)}" data-univers-lien="${u}" style="--nuit:${o.couleur.nuit}">
        <span class="raccourci-image"><img src="/assets/images/${o.petit}" alt="" width="${o.px.l}" height="${o.px.h}" loading="lazy" decoding="async"></span>
        <span class="raccourci-nom">${n.nom}</span><span class="raccourci-nombre">${n.nombre} ${c.t('commun.oeuvres')}</span></a></li>`; })}
    </ul>
  </div>
</section>

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille">
    ${c.media({ nom: 'ambiances/console-trois-oeuvres', alt: c.s('galerie.finAlt'), sizes: '(max-width: 760px) 100vw, 50vw', ratio: '16 / 9', cadrage: '45% 50%' })}
    <div>
      ${tete(c, { titre: c.t('galerie.finTitre'), texte: c.t('galerie.finTexte') })}
      <p class="fin-actions" data-anime>${c.lien('chez-vous', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('galerie.finChezVous')}</span>${icone.fleche}` })} <a class="bouton bouton--contour" href="mailto:${c.site.contact.email}">${icone.mail}<span>${c.t('commun.ecrire')}</span></a></p>
    </div>
  </div>
</section>
`;
};

/* Catalogue de la recherche de l'en-tête (lu à la première ouverture de la fenêtre de recherche). */
export function fichiers({ donnees }) {
  const liste = donnees.oeuvres.map((o) => ({
    slug: o.slug, titre: o.titre, artiste: o.artiste, style: o.style, des: o.des, image: o.petit, url: `/oeuvres/${o.slug}`,
    recherche: [o.titre, o.artiste, o.style, o.universLibelle, ...o.couleursNommees, ...o.motsCles, o.accroche].filter(Boolean).join(' '),
  }));
  return { 'assets/donnees/catalogue.json': liste };
}
