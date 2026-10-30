/* Les Artistes : ouverture (trois œuvres signatures dans trois flaques de lumière), puis un chapitre par artiste :
   texte repris mot pour mot du site actuel, nombre d'œuvres, salle horizontale de ses œuvres. Aucun portrait
   (identité des artistes à confirmer par le client) : chaque artiste est présenté par ses œuvres. */
import { html } from '../../outils/gabarit.mjs';
import { oeuvre, cadre, cartel, tete, urlOeuvre } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'artistes', fichier: 'artistes', imagePartage: 'oeuvres/l-esprit-flottant-500.webp', partageSous: 'Darren Whitmore · Francesco Conte · Miyu Mori' };

export default (c) => {
  const artistes = c.donnees.artistes;
  const tri = (l) => [...l].sort((a, b) => b.ajout.localeCompare(a.ajout));
  return html`
<section class="scene scene--artistes ecran" id="debut" data-scene style="--nuit:#120e10">
  <div class="scene-fond scene-fond--plein">${c.media({ nom: 'grok/salle-nuit', alt: c.s('artistes.alt'), priorite: true, sizes: '100vw' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="triptyque" data-anime="gsap" data-scene-oeuvre>
    ${artistes.map((a) => { const o = oeuvre(c, a.signature); return html`<a class="triptyque-case zone-oeuvre" href="#${a.slug}" data-sans-transition aria-label="${a.nom}">${cadre(c, o, { finition: 'caisse-noire', priorite: true, sizes: '(max-width: 760px) 30vw, 22vw', alt: `${o.titre}, ${a.nom}` })}<span class="triptyque-nom">${a.nom}</span></a>`; })}
  </div>
  <div class="scene-texte scene-texte--artistes">
    <p class="surtitre" data-anime="gsap">${c.t('artistes.surtitre')}</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('artistes.titre')}</span></span></h1>
    <p class="hero-actions" data-anime="gsap"><a class="bouton bouton--plein" href="#${artistes[0].slug}" data-action-principale data-magnetique><span>${c.t('artistes.action')}</span>${icone.fleche}</a></p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('artistes.info')}</p>
  </div>
</section>

${artistes.map((a, k) => {
  const liste = tri(c.donnees.oeuvres.filter((o) => o.artisteSlug === a.slug));
  const sig = oeuvre(c, a.signature);
  return html`<section class="artiste" id="${a.slug}" style="--nuit:${sig.couleur.nuit}" data-artiste>
  <div class="conteneur artiste-tete">
    <p class="artiste-numero" aria-hidden="true">${String(k + 1).padStart(2, '0')}</p>
    <div>
      <p class="surtitre" data-anime>${a.role}</p>
      <h2 class="titre-section" data-titre-anime>${a.nom}</h2>
      <p class="artiste-nombre" data-anime>${c.t('artistes.oeuvres', { n: liste.length })}</p>
    </div>
    <p class="artiste-bio" data-anime>${a.bio}</p>
  </div>
  <div class="artiste-salle ecran epingle" data-artiste-salle data-plein-ecran>
    <div class="piste artiste-piste" data-galerie tabindex="0" role="region" aria-label="${c.s('artistes.salle', { nom: a.nom })}">
      ${liste.map((o) => html`<article class="artiste-oeuvre" style="--nuit:${o.couleur.nuit}">
        <div class="zone-oeuvre"><a class="zone-lien" href="${urlOeuvre(c, o)}" data-libelle="${o.titre}" tabindex="-1" aria-hidden="true">${cadre(c, o, { finition: 'caisse-noire', sizes: '(max-width: 760px) 70vw, 30vw' })}</a></div>
        ${cartel(c, o, { niveau: 'h3' })}
      </article>`)}
    </div>
    <div class="salle-progres" aria-hidden="true"><span class="salle-progres-barre"><span></span></span><span class="salle-aide"><span class="si-souris">${c.t('artistes.faites')}</span><span class="si-tactile">${c.t('artistes.glissez')}</span></span></div>
  </div>
  <p class="conteneur artiste-lien" data-anime>${c.lien('galerie', { params: `artiste=${a.slug}`, ancre: 'oeuvres', classe: 'bouton bouton--contour', texte: c.t('artistes.voir') })}</p>
</section>`;
})}

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille">
    ${c.media({ nom: 'ambiances/salon-quatre-oeuvres', alt: c.s('chezVous.insp1'), sizes: '(max-width: 760px) 100vw, 50vw', ratio: '2021 / 778' })}
    <div>
      ${tete(c, { titre: c.t('artistes.finTitre'), texte: c.t('artistes.finTexte') })}
      <p class="fin-actions" data-anime>${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('artistes.finAction')}</span>${icone.fleche}` })}</p>
    </div>
  </div>
</section>
`;
};
