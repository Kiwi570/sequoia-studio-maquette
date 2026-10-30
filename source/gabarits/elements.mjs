/* Éléments partagés par les pages : prix, cadre d'une œuvre, cartel, carte de galerie, certificat spécimen.
   Une œuvre n'est jamais recadrée : son emplacement prend la proportion exacte de son image. */
import { html, brut } from '../../outils/gabarit.mjs';

export const oeuvre = (c, slug) => {
  const o = c.donnees.oeuvres.find((x) => x.slug === slug);
  if (!o) throw new Error(`Œuvre inconnue : ${slug}`);
  return o;
};

/* 1 234 € (la typographie insère les espaces insécables). */
export const prix = (n) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/[  ]/g, ' ')} €`;

export const urlOeuvre = (c, o) => c.url(`oeuvre-${o.slug}`);

/* Image de l'œuvre, sans recadrage (proportion de l'image d'origine), dans son cadre. */
export function cadre(c, o, { finition = 'caisse-noire', priorite = false, sizes = '(max-width: 760px) 80vw, 40vw', classe = '', loupe = false, alt } = {}) {
  const r = `${o.px.l} / ${o.px.h}`;
  return html`<div class="cadre cadre--${finition} ${classe}" style="--r:${o.px.l / o.px.h}" data-cadre="${finition}">
  <span class="cadre-ombre" aria-hidden="true"></span>
  <div class="cadre-bord"><div class="cadre-creux"><div class="cadre-oeuvre"${loupe ? brut(' data-loupe') : ''}>
    ${c.media({ nom: o.image, alt: alt ?? `${o.titre}, ${o.artiste}`, ratio: r, sizes, priorite, classe: 'oeuvre-image' })}
  </div></div></div>
</div>`;
}

export function cartel(c, o, { lien = true, prixVisible = true, niveau = 'p', classe = '' } = {}) {
  const titre = lien ? html`<a href="${urlOeuvre(c, o)}" data-libelle="${o.titre}">${o.titre}</a>` : o.titre;
  return html`<div class="cartel ${classe}">
  ${niveau === 'h3' ? html`<h3 class="cartel-titre">${titre}</h3>` : html`<p class="cartel-titre">${titre}</p>`}
  <p class="cartel-artiste">${o.artiste}</p>
  <p class="cartel-meta">${o.style} · ${o.annee} · ${c.t('commun.edition', { n: o.edition })}</p>
  ${prixVisible ? html`<p class="cartel-prix"><span>${c.t('commun.des')}</span> <strong data-prix>${prix(o.des)}</strong></p>` : ''}
</div>`;
}

/* Carte de la galerie : données de filtrage dans les attributs, rien n'est écrit par JavaScript. */
export function carte(c, o, { sizes = '(max-width: 520px) 88vw, (max-width: 1100px) 45vw, 30vw', mise = true } = {}) {
  const recherche = [o.titre, o.artiste, o.style, o.universLibelle, ...o.couleursNommees, ...o.motsCles, o.accroche]
    .join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').toLowerCase();
  return html`<article class="carte-oeuvre" data-oeuvre="${o.slug}" data-univers="${o.univers}" data-artiste="${o.artisteSlug}" data-orientation="${o.orientation}" data-familles="${o.familles.join(' ')}" data-des="${o.des}" data-ajout="${o.ajout}" data-titre="${o.titre}" data-recherche="${recherche}" style="--nuit:${o.couleur.nuit};--accent-oeuvre:${o.couleur.accent}">
  <a class="carte-lien" href="${urlOeuvre(c, o)}" data-libelle="${o.titre}">
    <div class="carte-scene">
      ${cadre(c, o, { sizes, alt: `${o.titre}, ${o.artiste}` })}
      ${mise ? html`<div class="carte-mise" aria-hidden="true"><img src="/assets/images/${o.miseEnSituation}-640.webp" alt="" width="640" height="640" loading="lazy" decoding="async"></div>` : ''}
    </div>
    ${cartel(c, o, { lien: false, niveau: 'h3' })}
  </a>
</article>`;
}

export function tete(c, { id, surtitre, titre, texte, niveau = 2, classe = '', centre = false }) {
  const h = niveau === 1 ? html`<h1 class="titre-section" data-titre-anime>${titre}</h1>` : html`<h2 class="titre-section" data-titre-anime>${titre}</h2>`;
  return html`<div class="tete-section ${centre ? 'tete-section--centre' : ''} ${classe}"${id ? brut(` id="${id}"`) : ''}>
  ${surtitre ? html`<p class="surtitre" data-anime>${surtitre}</p>` : ''}
  ${h}
  ${texte ? html`<p class="tete-texte" data-anime>${texte}</p>` : ''}
</div>`;
}

/* Certificat d'authenticité dessiné en code, avec les vraies données de l'œuvre, marqué « Spécimen ». */
export function certificat(c, o, { format, classe = '' } = {}) {
  const f = format || o.formats[o.formats.length - 1];
  return html`<div class="certificat ${classe}" data-certificat role="img" aria-label="${c.s('certificatCarte.alt', { titre: o.titre, artiste: o.artiste })}" data-audit-ignorer>
  <span class="certificat-reflet" aria-hidden="true"></span>
  <p class="certificat-titre">${c.t('certificatCarte.titre')}</p>
  <dl class="certificat-grille">
    <div class="certificat-oeuvre"><dt>${c.t('certificatCarte.oeuvre')}</dt><dd>${o.titre}</dd></div>
    <div><dt>${c.t('certificatCarte.artiste')}</dt><dd>${o.artiste}</dd></div>
    <div><dt>${c.t('certificatCarte.annee')}</dt><dd>${o.annee}</dd></div>
    <div><dt>${c.t('certificatCarte.technique')}</dt><dd>${c.t('certificatCarte.techniqueValeur')}</dd></div>
    <div><dt>${c.t('certificatCarte.format')}</dt><dd>${f.largeur} × ${f.hauteur} cm</dd></div>
    <div><dt>${c.t('certificatCarte.numero')}</dt><dd>${c.t('certificatCarte.numeroValeur', { n: o.edition })}</dd></div>
    <div class="certificat-signature"><dt>${c.t('certificatCarte.signature')}</dt><dd><span class="certificat-ligne"></span></dd></div>
  </dl>
  <div class="certificat-vignette"><img src="/assets/images/${o.petit}" alt="" width="${o.px.l}" height="${o.px.h}" loading="lazy" decoding="async"></div>
  <p class="certificat-texte">${c.t('certificatCarte.texte')}</p>
  <p class="certificat-pied"><span>${c.t('certificatCarte.certifie')} <strong>Sequoia Studio</strong></span><span class="certificat-holo" aria-hidden="true"><span>${c.t('certificatCarte.nfc')}</span></span></p>
  <p class="certificat-specimen" aria-hidden="true">${c.t('certificatCarte.specimen')}</p>
</div>`;
}

/* Petites icônes pour les engagements. */
export const picto = {
  carte: brut('<svg class="picto" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="12" width="36" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1"/><path d="M6 19h36" stroke="currentColor" stroke-width="1.5" pathLength="1"/><path d="M12 29h8" stroke="currentColor" stroke-width="1.5" pathLength="1"/></svg>'),
  camion: brut('<svg class="picto" viewBox="0 0 48 48" aria-hidden="true"><path d="M5 14h24v18H5zM29 20h8l6 6v6H29z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" pathLength="1"/><circle cx="13" cy="34" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1"/><circle cx="36" cy="34" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1"/></svg>'),
  retour: brut('<svg class="picto" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 18h17a9 9 0 0 1 0 18H18" fill="none" stroke="currentColor" stroke-width="1.5" pathLength="1"/><path d="M19 12l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" pathLength="1"/></svg>'),
  bulle: brut('<svg class="picto" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 12h32v20H22l-8 6v-6H8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" pathLength="1"/><path d="M15 21h18M15 26h11" stroke="currentColor" stroke-width="1.5" pathLength="1"/></svg>'),
};
