/* Article du journal (un gabarit pour les quatre) : texte repris du site actuel, barre de lecture,
   couverture, intertitres, citation, images, articles suivants. */
import { html } from '../../outils/gabarit.mjs';
import { tete } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';
import { minutes } from './journal.mjs';

export const pages = ({ donnees }) => donnees.articles.map((a) => ({
  cle: `article-${a.slug}`, fichier: `journal/${a.slug}`, gabarit: 'article', slug: a.slug, ogType: 'article',
  imagePartage: a.couverture.startsWith('grok/') ? 'journal/supports-papiers-1448.webp' : `${a.couverture}-${a.couverture === 'certificat/hologramme-gros-plan' ? 1920 : a.couverture === 'journal/ia-regard' ? 1672 : 1448}.webp`,
  partageTitre: a.titre, partageSous: `${a.themeNom} · ${a.dateTexte}`, partagePied: 'Technique & Culture',
  textes: { titre: `${a.titrePage} : Sequoia Studio`, description: a.description, nav: a.titre, partageAlt: a.couvertureAlt, accroche: a.titre },
  structure: { '@context': 'https://schema.org', '@type': 'Article', headline: a.titre, datePublished: a.date, inLanguage: 'fr', publisher: { '@type': 'Organization', name: 'Sequoia Studio' } },
}));

export default (c) => {
  const a = c.donnees.articles.find((x) => x.slug === c.page.slug);
  const autres = c.donnees.articles.filter((x) => x.slug !== a.slug).sort((x, y) => y.date.localeCompare(x.date));
  let ids = 0;
  const bloc = (b) => {
    if (b.p) return html`<p>${b.p}</p>`;
    if (b.h2) { ids++; return html`<h2 id="partie-${ids}">${b.h2}</h2>`; }
    if (b.h3) return html`<h3>${b.h3}</h3>`;
    if (b.citation) return html`<blockquote class="citation citation--article"><p>${b.citation}</p></blockquote>`;
    if (b.img) return c.media({ nom: b.img, alt: b.alt, sizes: '(max-width: 760px) 100vw, 720px', ratio: b.ratio, classe: 'article-figure' });
    return '';
  };
  return html`
<div data-barre-lecture aria-hidden="true"></div>
<section class="article-tete" id="debut" data-scene style="--nuit:#100c0a">
  <div class="conteneur article-tete-grille">
    <div class="article-tete-texte">
      <nav class="fil" aria-label="${c.s('commun.filAriane')}">${c.lien('journal', { texte: c.t('journal.retour') })} <span aria-hidden="true">/</span> <span>${a.themeNom}</span></nav>
      <h1 class="article-h1" data-anime="gsap">${a.titre}</h1>
      <p class="article-meta" data-anime="gsap" data-info-cle><time datetime="${a.date}">${a.dateTexte}</time> · ${c.t('journal.minutes', { n: minutes(a) })}</p>
      <p class="article-chapo article-chapo--tete" data-anime="gsap">${a.chapo}</p>
      <p data-anime="gsap"><a class="bouton bouton--plein" href="#lecture" data-action-principale>${c.t('journal.lire')}${icone.fleche}</a></p>
    </div>
    ${c.media({ nom: a.couverture, alt: a.couvertureAlt, cadrage: a.couvertureCadrage, priorite: true, sizes: '(max-width: 760px) 100vw, 50vw', ratio: '4 / 3', classe: 'article-couverture' })}
  </div>
</section>
<article class="article-corps conteneur" id="lecture" data-sans-visuel>
  ${a.blocs.map(bloc)}
  ${a.suite ? html`<p class="article-suite">${c.lien(a.suite.page, { classe: 'bouton bouton--contour', texte: a.suite.texte })}</p>` : ''}
</article>
<section class="article-autres" id="a-lire">
  <div class="conteneur">
    ${tete(c, { titre: c.t('journal.autres') })}
    <div class="journal-grille journal-grille--autres">
      ${autres.map((x) => html`<article class="article-carte"><a class="article-lien" href="${c.url('article-' + x.slug)}" data-libelle="${c.libelle('journal')}">
        ${c.media({ nom: x.couverture, alt: x.couvertureAlt, cadrage: x.couvertureCadrage, sizes: '(max-width: 760px) 100vw, 30vw', ratio: '4 / 3', classe: 'article-image' })}
        <p class="article-meta"><span class="article-theme">${x.themeNom}</span> · <time datetime="${x.date}">${x.dateTexte}</time></p>
        <h3 class="article-titre">${x.titre}</h3>
        <span class="lien-fleche">${c.t('journal.lire')}${icone.fleche}</span>
      </a></article>`)}
    </div>
  </div>
</section>
`;
};
