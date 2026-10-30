/* Mentions légales : fiche récapitulative à compléter, éditeur, direction, hébergement (Vercel vérifié),
   propriété intellectuelle, crédits (illustrations générées), données, responsabilités. */
import { legal } from '../gabarits/legal.mjs';

export const page = { cle: 'mentions-legales', fichier: 'mentions-legales', imagePartage: 'ambiances/salon-deux-oeuvres-889.webp', sansAction: true };

export default (c) => legal(c, 'mentions', { titre: c.t('legal.mentionsTitre'), image: 'grok/mentions-archives', alt: c.s('legal.altMentions') });
