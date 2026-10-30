/* Politique de confidentialité : texte du site actuel, ce que fait la maquette, points à compléter. */
import { legal } from '../gabarits/legal.mjs';

export const page = { cle: 'confidentialite', fichier: 'confidentialite', imagePartage: 'ambiances/salon-deux-oeuvres-889.webp', sansAction: true };

export default (c) => legal(c, 'confidentialite', { titre: c.t('legal.confidentialiteTitre'), image: 'grok/confidentialite-porte', alt: c.s('legal.altConfidentialite') });
