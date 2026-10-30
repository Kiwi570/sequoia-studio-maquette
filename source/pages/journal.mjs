/* Technique & Culture : ouverture, article à la Une et fil des articles filtrable par thème (gardé dans l'adresse). */
import { html, brut } from '../../outils/gabarit.mjs';
import { tete } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'journal', fichier: 'journal', imagePartage: 'journal/supports-impression-1448.webp', partageSous: 'Procédés, outils contemporains et grandes questions du monde de l’art' };

export const minutes = (a) => Math.max(1, Math.round(a.blocs.map((b) => b.p || b.citation || '').join(' ').split(/\s+/).length / 220));

export default (c) => {
  const articles = [...c.donnees.articles].sort((a, b) => b.date.localeCompare(a.date));
  const [une, ...autres] = articles;
  const themes = [...new Map(articles.map((a) => [a.theme, a.themeNom])).entries()];
  const carteArticle = (a, grande = false) => html`<article class="article-carte${grande ? ' article-carte--une' : ''}" data-article data-theme="${a.theme}">
  <a class="article-lien" href="${c.url('article-' + a.slug)}" data-libelle="${c.libelle('journal')}">
    ${c.media({ nom: a.couverture, alt: a.couvertureAlt, cadrage: a.couvertureCadrage, sizes: grande ? '(max-width: 760px) 100vw, 60vw' : '(max-width: 760px) 100vw, 30vw', ratio: grande ? '16 / 9' : '4 / 3', classe: 'article-image' })}
    <p class="article-meta"><span class="article-theme">${a.themeNom}</span> · <time datetime="${a.date}">${a.dateTexte}</time> · ${c.t('journal.minutes', { n: minutes(a) })}</p>
    ${grande ? html`<h3 class="article-titre article-titre--une">${a.titre}</h3>` : html`<h3 class="article-titre">${a.titre}</h3>`}
    <p class="article-chapo">${a.chapo}</p>
    <span class="lien-fleche">${c.t('journal.lire')}${icone.fleche}</span>
  </a>
</article>`;
  return html`
<section class="scene scene--journal ecran" id="debut" data-scene style="--nuit:#120d09">
  <div class="scene-fond scene-fond--plein">${c.media({ nom: 'grok/journal-table', alt: c.s('journal.alt'), priorite: true, sizes: '100vw' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="scene-texte scene-texte--bas">
    <p class="surtitre" data-anime="gsap">${c.t('journal.surtitre')}</p>
    <h1 class="titre-hero titre-hero--moyen"><span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('journal.titre')}</span></span></h1>
    <p class="hero-sous hero-sous--texte hero-sous--long" data-anime="gsap">${c.t('journal.texte')}</p>
    <p class="hero-actions" data-anime="gsap">${c.lien('article-' + une.slug, { classe: 'bouton bouton--plein', texte: html`<span>${c.t('journal.action')}</span>${icone.fleche}`, attrs: 'data-action-principale data-magnetique' })}</p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('journal.info')}</p>
  </div>
</section>

<section class="journal" id="articles" data-journal>
  <div class="conteneur">
    <div class="journal-tete">
      ${tete(c, { titre: c.t('journal.articles') })}
      <form class="themes" data-themes aria-label="${c.s('journal.themes')}">
        <div class="puces">
          <label class="puce"><input type="radio" name="theme" value="" checked><span>${c.t('journal.tous')}</span></label>
          ${themes.map(([t, nom]) => html`<label class="puce"><input type="radio" name="theme" value="${t}"><span>${nom}</span></label>`)}
        </div>
      </form>
    </div>
    <p class="surtitre journal-une-titre">${c.t('journal.une')}</p>
    <div class="journal-grille" data-journal-grille>
      ${carteArticle(une, true)}
      ${autres.map((a) => carteArticle(a))}
    </div>
    <p class="journal-vide" data-journal-vide hidden>${c.t('journal.aucun')}</p>
  </div>
</section>

<section class="fin-page" id="fin">
  <div class="conteneur fin-grille">
    ${c.media({ nom: 'journal/supports-alu', alt: c.s('journal.finAlt'), sizes: '(max-width: 760px) 100vw, 45vw', ratio: '4 / 3' })}
    <div>
      ${tete(c, { titre: c.t('journal.finTitre'), texte: c.t('journal.finTexte') })}
      <p class="fin-actions" data-anime>${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('journal.finAction')}</span>${icone.fleche}` })}</p>
    </div>
  </div>
</section>
`;
};
