/* Accueil : ouverture au projecteur, sélection du moment (salle épinglée), univers (balayage de lumière),
   chez vous (formats et finitions au défilement), fabrication (vue éclatée), certificat (anneau d'édition),
   artistes, fondateurs, acheter sereinement. */
import { html, brut } from '../../outils/gabarit.mjs';
import { oeuvre, cadre, cartel, prix, tete, urlOeuvre, picto } from '../gabarits/elements.mjs';
import { icone } from '../gabarits/commun.mjs';

export const page = { cle: 'accueil', fichier: 'index', imagePartage: 'oeuvres/regard-de-minuit-800.webp', partageSous: 'Œuvres en éditions limitées, certificat d’authenticité signé par l’artiste' };

const SELECTION = ['eclosion-etheree', 'solitude-hivernale', 'rencontre-du-destin'];
const UNIVERS = [['paysage', 'harmonie-etheree'], ['portraits', 'eclat-captivant'], ['architecture', 'oasis-chromatique'], ['nature', 'arbre-de-coeur-florissant'], ['animaux', 'elan-sauvage']];
const DEMO = 'lumieres-d-ete-mediterraneen';
/* États de la démonstration « chez vous » : format (index) et finition, prix tirés du catalogue. */
const ETATS = [[0, 'toile'], [1, 'toile'], [2, 'toile'], [2, 'caisse-noire'], [1, 'fineart']];

export default (c) => {
  const hero = oeuvre(c, 'regard-de-minuit');
  const demo = oeuvre(c, DEMO);
  const fin = Object.fromEntries(c.donnees.finitions.map((f) => [f.id, f]));
  const artistes = c.donnees.artistes;
  const nb = (a) => c.donnees.oeuvres.filter((o) => o.artisteSlug === a).length;
  const etats = ETATS.map(([i, f]) => {
    const fm = demo.formats[i], fi = fin[f];
    return { f, i, l: fm.largeur, h: fm.hauteur, prix: fm.prix[f], nom: fi.court, lt: fm.largeur + 2 * fi.marge, ht: fm.hauteur + 2 * fi.marge, p: fi.epaisseur };
  });
  return html`
<section class="scene scene--accueil ecran" id="debut" data-scene style="--nuit:${hero.couleur.nuit};--scene-x:64%;--scene-y:46%">
  <div class="scene-fond">${c.media({ nom: 'grok/mur-nuit', alt: c.s('accueil.hero.alt'), priorite: true, sizes: '140vw', classe: 'scene-mur' })}</div>
  <div class="projecteur" data-projecteur aria-hidden="true" data-audit-ignorer><span class="projecteur-halo"></span></div>
  <div class="scene-zone" data-anime="gsap" data-scene-oeuvre>
    ${cadre(c, hero, { finition: 'caisse-noire', priorite: true, sizes: '(max-width: 760px) 70vw, 36vw' })}
  </div>
  <div class="scene-texte">
    <p class="surtitre" data-anime="gsap">${c.t('accueil.hero.surtitre')}</p>
    <h1 class="titre-hero" data-titre-hero data-superpose>
      <span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('accueil.hero.ligne1')}</span></span>
      <span class="ligne-masque"><span class="ligne" data-anime="gsap">${c.t('accueil.hero.ligne2')}</span></span>
      <span class="ligne-masque"><span class="ligne ligne--laiton" data-anime="gsap"><em>${c.t('accueil.hero.ligne3')}</em></span></span>
    </h1>
    <p class="hero-sous" data-anime="gsap">${c.t('accueil.hero.sous')}</p>
    <p class="hero-actions" data-anime="gsap">
      ${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('accueil.hero.action')}</span>${icone.fleche}`, attrs: 'data-action-principale data-magnetique' })}
      ${c.lien('chez-vous', { classe: 'bouton bouton--contour', texte: c.t('accueil.hero.chezVous') })}
    </p>
    <p class="hero-info" data-info-cle data-anime="gsap">${c.t('accueil.hero.info')}</p>
  </div>
  <div class="scene-cartel" data-anime="gsap">${cartel(c, hero, { prixVisible: false })}</div>
</section>

<section class="salle ecran epingle" id="selection" data-entete-cache data-plein-ecran data-salle style="--nuit:${oeuvre(c, SELECTION[0]).couleur.nuit}">
  <div class="salle-fond" aria-hidden="true">${c.media({ nom: 'grok/salle-nuit', alt: '', sizes: '100vw', classe: 'salle-mur' })}</div>
  <div class="conteneur salle-tete">
    <p class="surtitre" data-anime>${c.t('accueil.selection.surtitre')}</p>
    <h2 class="titre-section" data-titre-anime>${c.t('accueil.selection.titre')}</h2>
    <p class="salle-texte" data-anime>${c.t('accueil.selection.texte')}</p>
  </div>
  <div class="piste salle-piste" data-galerie tabindex="0" role="region" aria-label="${c.s('accueil.selection.region')}">
    ${SELECTION.map((s, i) => { const o = oeuvre(c, s); return html`<article class="salle-oeuvre" data-salle-oeuvre style="--nuit:${o.couleur.nuit}">
      <div class="zone-oeuvre"><a class="zone-lien" href="${urlOeuvre(c, o)}" data-libelle="${o.titre}" tabindex="-1" aria-hidden="true">${cadre(c, o, { finition: i === 1 ? 'caisse-blanche' : 'caisse-noire', sizes: '(max-width: 760px) 78vw, 40vw' })}</a></div>
      <div class="salle-cartel">
        <p class="salle-numero" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
        ${cartel(c, o, { niveau: 'h3' })}
        <p class="salle-accroche">${o.accroche}</p>
      </div>
    </article>`; })}
  </div>
  <div class="salle-progres" aria-hidden="true"><span class="salle-progres-barre"><span></span></span><span class="salle-compteur" data-salle-compteur>1 / ${SELECTION.length}</span></div>
</section>

<section class="univers" id="univers" data-univers style="--nuit:${oeuvre(c, UNIVERS[0][1]).couleur.nuit}">
  <div class="conteneur univers-grille">
    <div class="univers-texte">
      ${tete(c, { surtitre: c.t('accueil.univers.surtitre'), titre: c.t('accueil.univers.titre') })}
      <p class="univers-aide" data-anime><span class="si-souris">${c.t('accueil.univers.texte')}</span><span class="si-tactile">${c.t('accueil.univers.texteTactile')}</span></p>
      <ul class="univers-liste" role="list">
        ${UNIVERS.map(([u, s], i) => { const o = oeuvre(c, s); const n = c.donnees.univers.univers.find((x) => x.cle === u); return html`<li data-anime>
          <a class="univers-lien" href="${c.url('galerie', 'oeuvres', `univers=${u}`)}" data-libelle="${c.libelle('galerie')}" data-univers-choix="${i}" data-nuit="${o.couleur.nuit}"${i === 0 ? brut(' aria-current="true"') : ''}>
            <span class="univers-nom">${n.nom}</span><span class="univers-nombre">${n.nombre}</span>
            <span class="univers-desc">${c.t('accueil.univers.' + u)}</span>
          </a></li>`; })}
      </ul>
    </div>
    <div class="univers-scene" data-univers-scene aria-hidden="true">
      <canvas class="univers-canvas" data-univers-canvas width="10" height="10"></canvas>
      <div class="univers-images">
        ${UNIVERS.map(([, s], i) => { const o = oeuvre(c, s); return html`<figure class="univers-image${i === 0 ? ' est-active' : ''}" data-univers-image="${i}" data-src="/assets/images/${o.grand}" style="--r:${o.px.l / o.px.h}"><img src="/assets/images/${o.grand}" alt="" width="${o.px.l}" height="${o.px.h}" loading="lazy" decoding="async"><figcaption>${o.titre} · ${o.artiste}</figcaption></figure>`; })}
      </div>
    </div>
  </div>
</section>

<section class="demo ecran epingle" id="chez-vous" data-entete-cache data-plein-ecran data-demo style="--nuit:${demo.couleur.nuit}">
  <div class="demo-grille">
    <div class="demo-scene" data-demo-scene>
      ${c.media({ nom: 'grok/salon-soir', alt: c.s('accueil.chezVous.alt'), sizes: '(max-width: 760px) 100vw, 64vw', classe: 'demo-interieur', ratio: '500 / 281' })}
      <div class="demo-mur" data-demo-mur aria-hidden="true">
        <div class="demo-oeuvre" data-demo-oeuvre style="--l:${etats[0].lt};--h:${etats[0].ht}">
          ${cadre(c, demo, { finition: 'toile', sizes: '30vw', alt: '' })}
          <span class="demo-cote demo-cote--l" data-demo-cote-l>${etats[0].l} cm</span>
          <span class="demo-cote demo-cote--h" data-demo-cote-h>${etats[0].h} cm</span>
        </div>
      </div>
    </div>
    <div class="demo-texte">
      ${tete(c, { surtitre: c.t('accueil.chezVous.surtitre'), titre: c.t('accueil.chezVous.titre') })}
      <p class="demo-intro" data-anime>${c.t('accueil.chezVous.texte')}</p>
      <div class="demo-panneau" role="group" aria-label="${c.s('accueil.chezVous.region')}">
        <p class="demo-oeuvre-nom">${demo.titre} · ${demo.artiste}</p>
        <ol class="demo-etats">
          ${etats.map((e, k) => html`<li><button type="button" class="demo-etat" data-demo-etat="${k}" data-finition="${e.f}" data-l="${e.l}" data-h="${e.h}" data-lt="${e.lt}" data-ht="${e.ht}" aria-pressed="${k === 0 ? 'true' : 'false'}">
            <span class="demo-etat-format">${e.l} × ${e.h} cm</span><span class="demo-etat-finition">${e.nom}</span><strong class="demo-etat-prix" data-prix>${prix(e.prix)}</strong>
          </button></li>`)}
        </ol>
        <p class="mention-prix">${c.t('commun.prixMention')}</p>
      </div>
      <p class="demo-actions">${c.lien('chez-vous', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('accueil.chezVous.action')}</span>${icone.fleche}` })} <a class="lien-fleche" href="${urlOeuvre(c, demo)}" data-libelle="${demo.titre}">${c.t('commun.voirOeuvre')}</a></p>
    </div>
  </div>
</section>

<section class="fabrication" id="fabrication" data-fabrication>
  <div class="conteneur fabrication-grille">
    <div class="fabrication-texte">
      ${tete(c, { surtitre: c.t('accueil.fabrication.surtitre'), titre: c.t('accueil.fabrication.titre') })}
      <p data-anime>${c.t('accueil.fabrication.texte')}</p>
      <p data-anime>${c.lien('cadres-et-finitions', { classe: 'bouton bouton--contour', texte: c.t('accueil.fabrication.action') })}</p>
    </div>
    <div class="eclate" data-eclate aria-hidden="true">
      <div class="eclate-pile" data-eclate-pile>
        <div class="eclate-couche eclate-couche--dos"></div>
        <div class="eclate-couche eclate-couche--cadre"></div>
        <div class="eclate-couche eclate-couche--creux"></div>
        <div class="eclate-couche eclate-couche--oeuvre"><img src="/assets/images/${oeuvre(c, 'oasis-moderne').grand}" alt="" width="800" height="400" loading="lazy" decoding="async"></div>
      </div>
    </div>
    <ul class="eclate-legendes" data-eclate-legendes>
      ${['c1', 'c2', 'c3', 'c4'].map((k, i) => html`<li data-anime style="--i:${i}"><span class="eclate-puce" aria-hidden="true">${i + 1}</span>${c.t('accueil.fabrication.' + k)}</li>`)}
    </ul>
    <div class="fabrication-photo">${c.media({ nom: 'grok/atelier-impression', alt: c.s('accueil.fabrication.alt'), sizes: '(max-width: 760px) 100vw, 40vw', ratio: '16 / 10' })}</div>
  </div>
</section>

<section class="rarete" id="certificat" data-rarete>
  <div class="conteneur rarete-grille">
    <div class="anneau" data-anneau aria-hidden="true">
      <svg viewBox="0 0 400 400" class="anneau-svg">
        ${Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * Math.PI * 2 - Math.PI / 2; const x1 = 200 + Math.cos(a) * 150, y1 = 200 + Math.sin(a) * 150, x2 = 200 + Math.cos(a) * (i % 5 === 0 ? 182 : 170), y2 = 200 + Math.sin(a) * (i % 5 === 0 ? 182 : 170); return brut(`<line class="anneau-trait" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="--i:${i}"/>`); })}
        <circle class="anneau-onde" cx="200" cy="200" r="70"/><circle class="anneau-onde anneau-onde--2" cx="200" cy="200" r="70"/>
      </svg>
      <div class="anneau-centre"><span class="anneau-n">1–30</span><span class="anneau-nfc">NFC</span></div>
    </div>
    <div class="rarete-texte">
      ${tete(c, { surtitre: c.t('accueil.certificat.surtitre'), titre: c.t('accueil.certificat.titre') })}
      <p data-anime>${c.t('accueil.certificat.texte')}</p>
      <p class="rarete-note" data-anime>${c.t('accueil.certificat.anneau')}</p>
      <p data-anime>${c.lien('certificat', { classe: 'bouton bouton--contour', texte: c.t('accueil.certificat.action') })}</p>
    </div>
    <div class="rarete-photos">
      ${c.media({ nom: 'certificat/hologramme-nfc', alt: c.s('accueil.certificat.alt1'), sizes: '(max-width: 760px) 70vw, 24vw', ratio: '1 / 1', classe: 'rarete-photo rarete-photo--1', cadrage: '50% 60%' })}
      ${c.media({ nom: 'certificat/verification-smartphone', alt: c.s('accueil.certificat.alt2'), sizes: '(max-width: 760px) 60vw, 20vw', ratio: '1 / 1', classe: 'rarete-photo rarete-photo--2' })}
    </div>
  </div>
</section>

<section class="signatures" id="artistes">
  <div class="conteneur">
    ${tete(c, { surtitre: c.t('accueil.artistes.surtitre'), titre: c.t('accueil.artistes.titre'), centre: true })}
    <ul class="signatures-liste" role="list">
      ${artistes.map((a) => { const o = oeuvre(c, a.signature); return html`<li class="signature" data-anime style="--nuit:${o.couleur.nuit}">
        <a class="signature-lien" href="${c.url('artistes', a.slug)}" data-libelle="${c.libelle('artistes')}">
          <div class="zone-oeuvre zone-oeuvre--signature">${cadre(c, o, { finition: 'caisse-noire', sizes: '(max-width: 760px) 80vw, 28vw', alt: `${o.titre}, ${a.nom}` })}</div>
          <h3 class="signature-nom">${a.nom}</h3>
          <p class="signature-role">${a.role}</p>
          <p class="signature-nombre">${c.t('accueil.artistes.oeuvres', { n: nb(a.slug) })}</p>
        </a></li>`; })}
    </ul>
    <p class="centre" data-anime>${c.lien('artistes', { classe: 'bouton bouton--contour', texte: c.t('accueil.artistes.voir') })}</p>
  </div>
</section>

<section class="fondateurs" id="fondateurs">
  <div class="conteneur fondateurs-grille">
    ${c.media({ nom: 'equipe/freres-tost-showroom', alt: c.s('accueil.fondateurs.alt'), sizes: '(max-width: 760px) 100vw, 40vw', ratio: '1023 / 1537', classe: 'fondateurs-photo', cadrage: '50% 40%' })}
    <div class="fondateurs-texte">
      ${tete(c, { surtitre: c.t('accueil.fondateurs.surtitre'), titre: c.t('accueil.fondateurs.titre') })}
      <p data-anime>${c.t('accueil.fondateurs.texte')}</p>
      <blockquote class="citation" data-anime><p>${c.t('accueil.fondateurs.citation')}</p><footer>${c.t('accueil.fondateurs.auteur')}</footer></blockquote>
      <p data-anime>${c.lien('qui-sommes-nous', { classe: 'bouton bouton--contour', texte: c.t('accueil.fondateurs.action') })}</p>
    </div>
  </div>
</section>

<section class="serenite" id="acheter">
  <div class="conteneur serenite-grille">
    <div class="serenite-texte">
      ${tete(c, { surtitre: c.t('accueil.serenite.surtitre'), titre: c.t('accueil.serenite.titre') })}
      <ul class="engagements" role="list">
        <li data-anime>${picto.carte}<h3>${c.t('accueil.serenite.paiementT')}</h3><p>${c.t('accueil.serenite.paiement')}</p>
          <span class="logos logos--inline"><img src="/assets/images/logos/cb.svg" alt="CB" width="34" height="24" loading="lazy"><img src="/assets/images/logos/visa.svg" alt="Visa" width="34" height="24" loading="lazy"><img src="/assets/images/logos/mastercard.svg" alt="Mastercard" width="34" height="24" loading="lazy"></span></li>
        <li data-anime>${picto.camion}<h3>${c.t('accueil.serenite.livraisonT')}</h3><p>${c.t('accueil.serenite.livraison')}</p>
          <span class="logos logos--inline"><img src="/assets/images/logos/ups.svg" alt="UPS" width="21" height="25" loading="lazy"><img src="/assets/images/logos/dpd.svg" alt="DPD" width="50" height="21" loading="lazy"><img src="/assets/images/logos/colissimo.svg" alt="Colissimo" width="82" height="21" loading="lazy"></span></li>
        <li data-anime>${picto.retour}<h3>${c.t('accueil.serenite.retractationT')}</h3><p>${c.t('accueil.serenite.retractation')}</p></li>
        <li data-anime>${picto.bulle}<h3>${c.t('accueil.serenite.supportT')}</h3><p>${c.t('accueil.serenite.support')} <a href="mailto:${c.site.contact.email}">${c.site.contact.email}</a></p></li>
      </ul>
      <p class="serenite-actions" data-anime>${c.lien('galerie', { classe: 'bouton bouton--plein', texte: html`<span>${c.t('accueil.hero.action')}</span>${icone.fleche}` })} ${c.lien('cgv', { classe: 'lien-fleche', texte: c.t('accueil.serenite.action') })}</p>
    </div>
    ${c.media({ nom: 'grok/emballage', alt: c.s('accueil.serenite.alt'), sizes: '(max-width: 760px) 100vw, 44vw', ratio: '4 / 5', classe: 'serenite-photo' })}
  </div>
</section>
`;
};
