/* Cadres & finitions : ouverture (baguettes d'encadrement), comparatif des quatre finitions (données du catalogue),
   caisse américaine en vue éclatée au défilement, toile insonorisée et sa courbe d'absorption mesurée,
   FineArt Hahnemühle, accroche. */
import { html, brut } from '../../outils/gabarit.mjs';
import { oeuvre, tete } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'cadres-et-finitions', fichier: 'cadres-et-finitions', imagePartage: 'finitions/caisse-noire-demo-2-760.webp', partageSous: 'Caisse américaine · Cadre bois FineArt · Toile insonorisée' };

const ABSORPTION = [[125, 0.29], [250, 0.30], [500, 0.45], [1000, 0.80], [2000, 0.98], [4000, 0.94]];

/* Courbe en SVG (traits, aire, points) ; valeurs et graduations en texte HTML posé par-dessus,
   pour rester lisibles (12 px au moins) à toutes les tailles. */
function courbe(c) {
  const W = 500, H = 260;
  const x = (i) => (i * W) / (ABSORPTION.length - 1);
  const y = (v) => (1 - v) * H;
  const px = (i) => `${((x(i) / W) * 100).toFixed(2)}%`, py = (v) => `${((y(v) / H) * 100).toFixed(2)}%`;
  const chemin = ABSORPTION.map(([, v], i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const aire = `${chemin} L${W},${H} L0,${H}Z`;
  const v = (n) => String(n).replace('.', ',');
  return html`<figure class="courbe" data-courbe>
  <p class="petit-titre" id="courbe-titre">${c.t('finitions.courbeTitre')}</p>
  <div class="courbe-zone">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-labelledby="courbe-titre" aria-describedby="courbe-desc">
      ${[0, 0.25, 0.5, 0.75, 1].map((g) => brut(`<line class="courbe-grille" x1="0" x2="${W}" y1="${y(g)}" y2="${y(g)}" vector-effect="non-scaling-stroke"/>`))}
      <path class="courbe-aire" d="${aire}"/>
      <path class="courbe-trait" d="${chemin}" pathLength="1" vector-effect="non-scaling-stroke"/>
    </svg>
    ${[0, 0.5, 1].map((g) => html`<span class="courbe-y" style="left:0;top:${py(g)}" aria-hidden="true">${v(g)}</span>`)}
    ${ABSORPTION.map(([f, a], i) => html`<span class="courbe-point-html" style="left:${px(i)};top:${py(a)}" aria-hidden="true"></span><span class="courbe-etiquette" style="left:${px(i)};top:${py(a)}" aria-hidden="true">${v(a)}</span><span class="courbe-x" style="left:${px(i)};top:100%" aria-hidden="true">${f >= 1000 ? `${f / 1000} k` : f}</span>`)}
  </div>
  <p class="courbe-axe" aria-hidden="true">${c.t('finitions.courbeAxe')}</p>
  <p class="visuellement-cache" id="courbe-desc">${ABSORPTION.map(([f, a]) => `${f} Hz : ${v(a)}`).join(' ; ')}</p>
  <figcaption class="courbe-source">${c.t('finitions.courbeSource')}</figcaption>
</figure>`;
}

export default (c) => {
  const finitions = c.donnees.finitions;
  const sup = { toile: 'supplementToile', 'caisse-noire': 'supplementCaisse', 'caisse-blanche': 'supplementCaisse', fineart: 'supplementFineart' };
  const ech = { toile: 512, 'caisse-noire': 359, 'caisse-blanche': 359, fineart: 640 };
  return html`
<section class="scene scene--finitions ecran" id="debut" data-scene style="--nuit:#120f0b">
  <div class="scene-fond scene-fond--plein">${c.media({ nom: 'grok/atelier-baguettes', alt: c.s('finitions.alt'), priorite: true, sizes: '100vw' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="scene-texte scene-texte--bas">
    <p class="surtitre" data-anime="gsap">${c.t('finitions.surtitre')}</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('finitions.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte" data-anime="gsap">${c.t('finitions.texte')}</p>
    <p class="hero-actions" data-anime="gsap"><a class="bouton bouton--plein" href="#comparer" data-action-principale data-magnetique><span>${c.t('finitions.action')}</span>${icone.fleche}</a></p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('finitions.info')}</p>
  </div>
</section>

<section class="comparer" id="comparer">
  <div class="conteneur">
    ${tete(c, { titre: c.t('finitions.comparerTitre') })}
    <ul class="finitions-liste" role="list">
      ${finitions.map((f) => html`<li class="finition" data-anime data-finition-carte="${f.id}">
        ${c.media({ nom: f.echantillon, alt: f.nom, sizes: '(max-width: 760px) 80vw, 22vw', ratio: '4 / 3', classe: 'finition-image' })}
        <h3>${f.nom}</h3>
        <dl class="finition-dl">
          <div><dt>${c.t('finitions.support')}</dt><dd>${f.support}</dd></div>
          <div><dt>${c.t('finitions.cadre')}</dt><dd>${f.cadre}</dd></div>
          <div><dt>${c.t('finitions.epaisseur')}</dt><dd>${String(f.epaisseur).replace('.', ',')} cm</dd></div>
          <div><dt>${c.t('finitions.tailleMax')}</dt><dd>${f.maxLong} × ${f.maxCourt} cm</dd></div>
          <div><dt>${c.t('finitions.supplement')}</dt><dd>${c.t('finitions.' + sup[f.id])}</dd></div>
        </dl>
        <details class="finition-plus"><summary>${c.t('finitions.plus')}</summary>${f.texte.map((t) => html`<p>${t}</p>`)}</details>
      </li>`)}
    </ul>
    <p class="mention-prix">${c.t('commun.prixMentionListe')}</p>
  </div>
</section>

<section class="caisse" id="caisse-americaine" data-eclate-section>
  <div class="conteneur caisse-grille">
    <div class="caisse-texte">
      ${tete(c, { surtitre: c.t('finitions.caisseSurtitre'), titre: c.t('finitions.caisseTitre'), texte: c.t('finitions.caisseTexte') })}
      <ul class="eclate-legendes eclate-legendes--liste" data-eclate-legendes>
        ${['coupe1', 'coupe2', 'coupe3', 'coupe4'].map((k, i) => html`<li data-anime style="--i:${i}"><span class="eclate-puce" aria-hidden="true">${i + 1}</span>${c.t('finitions.' + k)}</li>`)}
      </ul>
      <p class="outil-note">${c.t('finitions.coupeAide')}</p>
    </div>
    <div class="eclate eclate--grand" data-eclate aria-hidden="true">
      <div class="eclate-pile" data-eclate-pile>
        <div class="eclate-couche eclate-couche--dos"></div>
        <div class="eclate-couche eclate-couche--cadre"></div>
        <div class="eclate-couche eclate-couche--creux"></div>
        <div class="eclate-couche eclate-couche--oeuvre"><img src="/assets/images/${oeuvre(c, 'jardin-mediterraneen-au-crepuscule').grand}" alt="" width="800" height="400" loading="lazy" decoding="async"></div>
      </div>
    </div>
  </div>
  <div class="conteneur caisse-photos">
    ${c.media({ nom: 'finitions/caisse-noire-demo', alt: c.s('finitions.caisseAlt1'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '652 / 436' })}
    ${c.media({ nom: 'finitions/caisse-blanche-demo', alt: c.s('finitions.caisseAlt2'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '652 / 436' })}
    ${c.media({ nom: 'finitions/support-aluminium', alt: c.s('finitions.caisseAlt3'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '760 / 533' })}
  </div>
</section>

<section class="toile" id="toile-insonorisee">
  <div class="conteneur toile-grille">
    <div>
      ${tete(c, { surtitre: c.t('finitions.toileSurtitre'), titre: c.t('finitions.toileTitre'), texte: c.t('finitions.toileTexte') })}
      <h3 class="petit-titre" data-anime>${c.t('finitions.toileStructureT')}</h3><p data-anime>${c.t('finitions.toileStructure')}</p>
      <h3 class="petit-titre" data-anime>${c.t('finitions.toileConfortT')}</h3><p data-anime>${c.t('finitions.toileConfort')}</p>
    </div>
    <div class="toile-visuels">
      ${courbe(c)}
      <div class="toile-images">
        ${c.media({ nom: 'grok/mousse-melamine', alt: c.s('finitions.mousseAlt'), sizes: '(max-width: 760px) 45vw, 20vw', ratio: '1 / 1' })}
        ${c.media({ nom: 'finitions/toile-insonorisee-echantillon', alt: c.s('finitions.toileAlt2'), sizes: '(max-width: 760px) 45vw, 20vw', ratio: '1 / 1' })}
      </div>
    </div>
  </div>
  <div class="conteneur">${c.media({ nom: 'finitions/toile-insonorisee-interieur', alt: c.s('finitions.toileAlt1'), sizes: '(max-width: 760px) 100vw, 80vw', ratio: '1498 / 1050', classe: 'toile-interieur' })}</div>
</section>

<section class="fineart" id="fineart">
  <div class="conteneur fineart-grille">
    <div>
      ${tete(c, { surtitre: c.t('finitions.fineartSurtitre'), titre: c.t('finitions.fineartTitre'), texte: c.t('finitions.fineartTexte') })}
      <p class="fineart-specs" data-anime>${c.t('finitions.fineartSpecs')}</p>
      <p data-anime>${c.t('finitions.passePartout')}</p>
    </div>
    <div class="fineart-images">
      ${c.media({ nom: 'finitions/fine-art-mur', alt: c.s('finitions.fineartAlt1'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '1388 / 1133', classe: 'fineart-1' })}
      ${c.media({ nom: 'finitions/fine-art-main', alt: c.s('finitions.fineartAlt2'), sizes: '(max-width: 760px) 45vw, 18vw', ratio: '1240 / 1274', classe: 'fineart-2' })}
      ${c.media({ nom: 'finitions/fine-art-papier', alt: c.s('finitions.fineartAlt3'), sizes: '(max-width: 760px) 45vw, 18vw', ratio: '1284 / 1312', classe: 'fineart-3' })}
    </div>
  </div>
</section>

<section class="accroche" id="accroche">
  <div class="conteneur">
    ${tete(c, { surtitre: c.t('finitions.accrocheSurtitre'), titre: c.t('finitions.accrocheTitre'), texte: c.t('finitions.accrocheTexte') })}
    <ul class="accroche-liste" role="list">
      <li data-anime>${c.media({ nom: 'finitions/toile-insonorisee-accroche', alt: c.s('finitions.accrocheAlt1'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '1536 / 1024', classe: 'media--clair' })}<p>${c.t('finitions.accrocheToile')}</p></li>
      <li data-anime>${c.media({ nom: 'finitions/caisse-accroche', alt: c.s('finitions.accrocheAlt2'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '1536 / 1024', classe: 'media--clair' })}<p>${c.t('finitions.accrocheCaisse')}</p></li>
      <li data-anime>${c.media({ nom: 'finitions/cadre-bois-accroche', alt: c.s('finitions.accrocheAlt3'), sizes: '(max-width: 760px) 90vw, 30vw', ratio: '600 / 451' })}<p>${c.t('finitions.accrocheBois')}</p></li>
    </ul>
  </div>
</section>

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille">
    ${c.media({ nom: 'finitions/caisse-noire-demo-2', alt: c.s('finitions.caisseAlt1'), sizes: '(max-width: 760px) 100vw, 45vw', ratio: '760 / 533' })}
    <div>
      ${tete(c, { titre: c.t('finitions.finTitre'), texte: c.t('finitions.finTexte') })}
      <p class="fin-actions" data-anime>${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('finitions.finAction')}</span>${icone.fleche}` })}</p>
    </div>
  </div>
</section>
`;
};
