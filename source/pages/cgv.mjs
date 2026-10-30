/* Conditions générales de vente : texte du site actuel (23 février 2026), note de mise en cohérence (TVA). */
import { legal } from '../gabarits/legal.mjs';

export const page = { cle: 'cgv', fichier: 'cgv', imagePartage: 'ambiances/salon-deux-oeuvres-889.webp', sansAction: true };

export default (c) => legal(c, 'cgv', { titre: c.t('legal.cgvTitre'), image: 'grok/cgv-cartels', alt: c.s('legal.altCgv') });
