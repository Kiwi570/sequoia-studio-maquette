/* Gabarit des pages légales : en-tête avec image, sommaire qui suit la lecture, barre de lecture,
   sections tirées de donnees/legal.json, notes « à compléter » pour le client. */
import { html } from '../../outils/gabarit.mjs';

export function legal(c, cle, { titre, image, alt }) {
  const d = c.donnees.legal[cle];
  return html`
<div data-barre-lecture aria-hidden="true"></div>
<section class="legal-tete" id="debut" data-scene style="--nuit:#0e0d0c">
  <div class="conteneur legal-tete-grille">
    <div>
      <h1 class="titre-hero titre-hero--moyen" data-anime="gsap">${titre}</h1>
      <p class="legal-maj" data-anime="gsap">${c.t('legal.maj', { date: d.maj })}</p>
      <nav class="legal-sommaire" data-sommaire aria-label="${c.s('commun.sommaire')}" data-anime="gsap"><ul>${d.sections.map((s) => html`<li><a href="#${s.id}" data-sans-transition>${s.titre}</a></li>`)}</ul></nav>
    </div>
    ${c.media({ nom: image, alt, priorite: true, sizes: '(max-width: 760px) 100vw, 40vw', ratio: '16 / 10', classe: 'legal-image' })}
  </div>
</section>
<div class="texte-long conteneur" data-sans-visuel>
  ${d.sections.map((s) => html`<section id="${s.id}" data-sans-visuel class="legal-section${s.fiche ? ' legal-fiche' : ''}">
    <h2>${s.titre}</h2>
    ${s.fiche ? html`<p>${c.t('legal.ficheIntro')}</p><ul class="fiche-a-completer">${s.fiche.map((l) => html`<li>${l} <span class="a-completer">${c.t('commun.aCompleter')}</span></li>`)}</ul>` : ''}
    ${(s.lignes || []).length ? html`<p class="legal-lignes">${s.lignes.map((l, i) => html`${i ? html`<br>` : ''}${l}`)}</p>` : ''}
    ${(s.texte || []).map((t) => html`<p>${t}</p>`)}
    ${s.note ? html`<p class="note-client"><strong>${c.t('legal.note')} :</strong> ${s.note}</p>` : ''}
  </section>`)}
</div>`;
}
