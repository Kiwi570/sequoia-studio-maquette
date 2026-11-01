/* Fiche œuvre : une page par œuvre du catalogue (42), générée depuis donnees/oeuvres.json.
   Premier écran : l'œuvre sur un mur de nuit, au projecteur, et le configurateur (format, finition, prix en direct).
   Puis : l'œuvre (texte, nuancier), chez vous, certificat spécimen, fabrication et livraison, même univers. */
import { html, brut } from '../../outils/gabarit.mjs';
import { cadre, cartel, carte, prix, tete, certificat, urlOeuvre } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

const tri = (liste) => [...liste].sort((a, b) => b.ajout.localeCompare(a.ajout) || a.titre.localeCompare(b.titre, 'fr'));

export const pages = ({ donnees }) => tri(donnees.oeuvres).map((o) => ({
  cle: `oeuvre-${o.slug}`, fichier: `oeuvres/${o.slug}`, gabarit: 'oeuvre', slug: o.slug, fond: o.couleur.nuit, barre: 'oeuvre', ogType: 'product',
  imagePartage: o.grand, partageTitre: o.titre, partageSous: `${o.artiste} · ${o.style}, ${o.annee}`, partagePied: `Édition limitée de ${o.edition} exemplaires`,
  textes: {
    titre: `${o.titre} par ${o.artiste} : œuvre encadrée en édition limitée`,
    description: `${o.titre}, œuvre contemporaine signée ${o.artiste}, proposée encadrée avec finitions premium, certificat d’authenticité et livraison sécurisée.`,
    nav: o.titre, partageAlt: `${o.titre}, œuvre de ${o.artiste}, encadrée sur fond nuit`, accroche: o.titre,
  },
  structure: {
    '@context': 'https://schema.org', '@type': ['Product', 'VisualArtwork'], name: o.titre, description: o.texte,
    creator: { '@type': 'Person', name: o.artiste }, artEdition: o.edition, dateCreated: String(o.annee), genre: o.style,
    brand: { '@type': 'Brand', name: 'Sequoia Studio' },
    offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: o.des, highPrice: Math.max(...o.formats.flatMap((f) => Object.values(f.prix))), offerCount: o.formats.reduce((n, f) => n + Object.keys(f.prix).length, 0) },
  },
}));

export default (c) => {
  const toutes = tri(c.donnees.oeuvres);
  const k = toutes.findIndex((x) => x.slug === c.page.slug);
  const o = toutes[k];
  const precedente = toutes[(k - 1 + toutes.length) % toutes.length], suivante = toutes[(k + 1) % toutes.length];
  const finitions = c.donnees.finitions;
  const defFormat = Math.min(1, o.formats.length - 1);
  const defFinition = o.formats[defFormat].prix['caisse-noire'] != null ? 'caisse-noire' : 'toile';
  const fmt = o.formats[defFormat], fin = finitions.find((f) => f.id === defFinition);
  const memes = toutes.filter((x) => x.slug !== o.slug && x.univers === o.univers);
  const autres = [...memes, ...toutes.filter((x) => x.slug !== o.slug && x.univers !== o.univers && x.artisteSlug === o.artisteSlug)].slice(0, 4);
  const config = {
    slug: o.slug, titre: o.titre, artiste: o.artiste, image: o.petit, r: o.px.l / o.px.h, nuit: o.couleur.nuit, url: urlOeuvre(c, o),
    formats: o.formats.map((f) => ({ id: f.id, l: f.largeur, h: f.hauteur, prix: f.prix })),
    finitions: finitions.map((f) => ({ id: f.id, court: f.court, nom: f.nom, marge: f.marge, epaisseur: f.epaisseur, maxLong: f.maxLong, maxCourt: f.maxCourt })),
    defaut: { format: fmt.id, finition: defFinition },
  };
  const dims = (f, fi) => `${+(f.largeur + 2 * fi.marge).toFixed(1)} × ${+(f.hauteur + 2 * fi.marge).toFixed(1)} × ${fi.epaisseur} cm`.replace(/\./g, ',');
  return html`
<section class="fiche" id="debut" data-scene data-fiche style="--nuit:${o.couleur.nuit};--scene-x:50%;--scene-y:46%">
  <div class="fiche-scene">
    <div class="scene-fond">${c.media({ nom: 'grok/mur-nuit', alt: '', priorite: true, sizes: '(max-width: 760px) 140vw, 80vw', classe: 'scene-mur' })}</div>
    <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
    <div class="fiche-zone zone-oeuvre" data-anime="gsap" data-scene-oeuvre>
      ${cadre(c, o, { finition: defFinition, priorite: true, sizes: '(max-width: 760px) 80vw, 46vw', loupe: true, classe: 'cadre--fiche' })}
    </div>
    <button type="button" class="fiche-agrandir bouton-rond bouton-rond--texte" data-visionneuse-ouvrir aria-haspopup="dialog">${icone.recherche}<span>${c.t('oeuvre.agrandir')}</span></button>
  </div>
  <div class="fiche-panneau">
    <nav class="fil" aria-label="${c.s('commun.filAriane')}"><a href="${c.url('galerie')}" data-libelle="${c.libelle('galerie')}">${c.t('oeuvre.retour')}</a> <span aria-hidden="true">/</span> <a href="${c.url('galerie', 'oeuvres', `univers=${o.univers}`)}" data-libelle="${c.libelle('galerie')}">${o.universLibelle}</a></nav>
    <h1 class="fiche-titre" data-anime="gsap">${o.titre}</h1>
    <p class="fiche-artiste" data-anime="gsap"><a href="${c.url('artistes', o.artisteSlug)}" data-libelle="${c.libelle('artistes')}">${o.artiste}</a></p>
    <p class="fiche-meta" data-anime="gsap">${o.style} · ${o.annee} · ${c.t('commun.editionLongue', { n: o.edition })}</p>
    <div class="fiche-achat" data-anime="gsap">
      <p class="fiche-prix" data-info-cle><strong data-prix data-config-prix>${prix(fmt.prix[defFinition])}</strong> <span class="fiche-des">${c.t('commun.des')} ${prix(o.des)}</span><span class="mention-prix">${c.t('commun.prixMention')}</span></p>
      <button type="button" class="bouton bouton--plein fiche-ajouter" data-action-principale data-config-ajouter data-magnetique>${icone.panier}<span data-config-ajouter-texte>${c.t('oeuvre.ajouter')}</span></button>
    </div>
    <form class="config" data-config-form aria-label="${c.s('oeuvre.selection')}" data-anime="gsap">
      <fieldset class="config-groupe"><legend>${c.t('oeuvre.format')} <small>${c.t('oeuvre.formatAide')}</small></legend><div class="config-choix">
        ${o.formats.map((f) => html`<label class="choix"><input type="radio" name="format" value="${f.id}"${f.id === fmt.id ? brut(' checked') : ''}><span>${f.largeur} × ${f.hauteur} cm</span></label>`)}
      </div></fieldset>
      <fieldset class="config-groupe"><legend>${c.t('oeuvre.finition')}</legend><div class="config-choix config-choix--finitions">
        ${finitions.map((fi) => html`<label class="choix choix--finition"><input type="radio" name="finition" value="${fi.id}"${fi.id === defFinition ? brut(' checked') : ''}${fmt.prix[fi.id] == null ? brut(' disabled') : ''}><span><img src="/assets/images/${fi.echantillon}-${fi.id === 'fineart' ? 640 : fi.id === 'toile' ? 512 : 359}.webp" alt="" width="48" height="36" loading="lazy">${fi.court}</span></label>`)}
      </div></fieldset>
      <p class="config-note" data-config-note aria-live="polite" data-indisponible="${c.s('oeuvre.finitionIndisponible')}" data-changee="${c.s('oeuvre.finitionChangee')}"></p>
      <p class="config-dims">${c.t('oeuvre.dimensions')} <small>(${c.t('oeuvre.dimensionsAide')})</small> <strong data-config-dims>${dims(fmt, fin)}</strong></p>
      <p class="config-detail" data-config-detail>${fin.support} · ${fin.cadre}</p>
    </form>
    <ul class="badges" role="list" data-anime="gsap">${['b1', 'b2', 'b3', 'b4'].map((b) => html`<li>${c.t('oeuvre.badges.' + b)}</li>`)}</ul>
    <p class="fiche-liens" data-anime="gsap">${c.lien('chez-vous', { params: `oeuvre=${o.slug}&format=${fmt.id}&finition=${defFinition}`, ancre: 'outil', classe: 'lien-fleche', texte: c.t('oeuvre.chezVousAction'), attrs: 'data-config-essayer' })}</p>
  </div>
  <script type="application/json" data-config-donnees>${brut(JSON.stringify(config).replace(/</g, '\\u003c'))}</script>
</section>

<section class="fiche-oeuvre" id="oeuvre">
  <div class="conteneur fiche-oeuvre-grille">
    <div>
      ${tete(c, { surtitre: o.ambiance, titre: c.t('oeuvre.oeuvreTitre') })}
      <p class="fiche-accroche" data-anime>${o.accroche}</p>
      <p data-anime>${o.texte}</p>
      <p data-anime>${o.projection}</p>
      <dl class="fiche-dl" data-anime>
        <div><dt>${c.t('oeuvre.artiste')}</dt><dd>${o.artiste}</dd></div>
        <div><dt>${c.t('oeuvre.style')}</dt><dd>${o.style}</dd></div>
        <div><dt>${c.t('oeuvre.annee')}</dt><dd>${o.annee}</dd></div>
        <div><dt>${c.t('oeuvre.edition')}</dt><dd>${c.t('commun.edition', { n: o.edition })}</dd></div>
        <div><dt>${c.t('oeuvre.motsCles')}</dt><dd>${o.motsCles.join(', ')}</dd></div>
      </dl>
    </div>
    <figure class="nuancier" data-anime>
      <svg viewBox="0 0 500 300" class="nuancier-svg" role="img" aria-label="${c.s('oeuvre.couleurs')}">
        ${o.couleur.palette.map((h, i) => brut(`<rect class="nuancier-bande" x="${i * 100}" y="0" width="100" height="300" fill="${h}" style="--i:${i}"/>`))}
      </svg>
      <figcaption>${c.t('oeuvre.couleurs')} · ${c.t('oeuvre.couleursCitees')} : ${o.couleursNommees.join(', ')}</figcaption>
    </figure>
  </div>
</section>

<section class="fiche-chez" id="chez-vous">
  <div class="conteneur fiche-chez-grille">
    ${c.media({ nom: o.miseEnSituation, alt: c.s('oeuvre.miseAlt', { titre: o.titre }), sizes: '(max-width: 760px) 100vw, 50vw', ratio: '1 / 1', classe: 'fiche-mise' })}
    <div>
      ${tete(c, { titre: c.t('oeuvre.chezVousTitre'), texte: c.t('oeuvre.chezVousTexte') })}
      <p data-anime>${c.lien('chez-vous', { params: `oeuvre=${o.slug}&format=${fmt.id}&finition=${defFinition}`, ancre: 'outil', classe: 'bouton bouton--plein', texte: html`<span>${c.t('oeuvre.chezVousAction')}</span>${icone.fleche}`, attrs: 'data-config-essayer' })}</p>
    </div>
  </div>
</section>

<section class="fiche-certificat" id="certificat">
  <div class="conteneur fiche-certificat-grille">
    <div>
      ${tete(c, { titre: c.t('oeuvre.certificatTitre'), texte: c.t('oeuvre.certificatTexte') })}
      <p data-anime>${c.lien('certificat', { classe: 'bouton bouton--contour', texte: c.t('oeuvre.certificatAction') })}</p>
    </div>
    <div class="certificat-zone" data-visuel data-anime>${certificat(c, o, { format: fmt })}</div>
  </div>
</section>

<section class="fiche-infos" id="fabrication">
  <div class="conteneur fiche-infos-grille">
    <div class="fiche-finition" data-config-finition-bloc>
      ${c.media({ nom: fin.echantillon, alt: fin.nom, sizes: '(max-width: 760px) 60vw, 22vw', ratio: '4 / 3', classe: 'fiche-echantillon' })}
      <h3>${c.t('oeuvre.detailFinition')}</h3>
      <p><strong data-config-finition-nom>${fin.nom}</strong></p>
      ${finitions.map((fi) => html`<div class="fiche-finition-texte" data-finition-texte="${fi.id}"${fi.id !== defFinition ? brut(' hidden') : ''}>${fi.texte.map((t) => html`<p>${t}</p>`)}</div>`)}
    </div>
    <div>
      ${tete(c, { titre: c.t('oeuvre.infosTitre') })}
      <h3 class="petit-titre" data-anime>${c.t('oeuvre.fabrication')}</h3><p data-anime>${c.t('oeuvre.fabricationTexte')}</p>
      <h3 class="petit-titre" data-anime>${c.t('oeuvre.durabilite')}</h3><p data-anime>${c.t('oeuvre.durabiliteTexte')}</p>
      <h3 class="petit-titre" data-anime>${c.t('oeuvre.livraison')}</h3><p data-anime>${c.t('oeuvre.livraisonTexte')}</p>
      <p class="note-a-completer" data-anime>${c.t('oeuvre.livraisonZone')}</p>
    </div>
  </div>
</section>

<section class="fiche-suite" id="meme-univers">
  <div class="conteneur">
    ${tete(c, { surtitre: o.universLibelle, titre: c.t('oeuvre.memeUnivers') })}
    <div class="mur-oeuvres mur-oeuvres--suite">${autres.map((x) => carte(c, x, { sizes: '(max-width: 520px) 88vw, (max-width: 1100px) 45vw, 22vw' }))}</div>
    <nav class="fiche-voisines" aria-label="${c.s('oeuvre.precedente')} / ${c.s('oeuvre.suivante')}">
      <a class="voisine" href="${urlOeuvre(c, precedente)}" data-libelle="${precedente.titre}"><span class="voisine-sens">${c.t('oeuvre.precedente')}</span><span class="voisine-titre">${precedente.titre}</span></a>
      <a class="voisine voisine--suivante" href="${urlOeuvre(c, suivante)}" data-libelle="${suivante.titre}"><span class="voisine-sens">${c.t('oeuvre.suivante')}</span><span class="voisine-titre">${suivante.titre}</span></a>
    </nav>
  </div>
</section>

<div class="visionneuse" data-visionneuse data-recouvrement role="dialog" aria-modal="true" aria-label="${c.s('oeuvre.visionneuse')} : ${o.titre}" hidden>
  <div class="visionneuse-barre">
    <p class="visionneuse-titre">${o.titre} · ${o.artiste}</p>
    <p class="visionneuse-aide"><span class="si-souris">${c.t('oeuvre.loupe')}</span><span class="si-tactile">${c.t('oeuvre.loupeTactile')}</span></p>
    <button type="button" class="bouton-rond" data-visionneuse-fermer aria-label="${c.s('oeuvre.fermer')}">${icone.fermer}</button>
  </div>
  <div class="visionneuse-scene" data-visionneuse-scene>
    <img src="/assets/images/${o.grand}" alt="${o.titre}, ${o.artiste}" width="${o.px.l}" height="${o.px.h}" data-visionneuse-image decoding="async">
    <span class="loupe" data-loupe-lentille aria-hidden="true"></span>
  </div>
</div>
`;
};
