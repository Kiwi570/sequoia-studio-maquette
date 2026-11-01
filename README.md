# Sequoia Studio — maquette

Maquette d'une nouvelle version de sequoiastudio.fr, en direction « Nocturne » : galerie de nuit, chaque œuvre éclairée par un projecteur qui suit la souris. Site statique (HTML, CSS, JavaScript) prêt pour Vercel, sans étape de construction. Les pages sont déjà générées dans le dossier.

Adresse prévue : https://sequoia-studio-maquette.vercel.app

## Pages

- Accueil, Galerie (42 œuvres, filtres, tri, recherche), 42 fiches œuvre (configurateur format et finition), Artistes, Chez vous (essai à l'échelle), Cadres et finitions, Certificat, Journal et 4 articles, Le studio, Panier / commande (simulés), Mentions légales, CGV, Confidentialité, 404.
- Textes et prix repris du site actuel. Les prix sont calculés avec la formule du site actuel et affichés avec « TVA non applicable, art. 293 B du CGI ».

## Modifier le contenu

1. Textes : `donnees/textes/fr.json`. Œuvres, finitions, artistes, articles et pages légales : les autres fichiers de `donnees/`.
2. Régénérer les pages : `node outils/generer.mjs`, puis les images de partage : `node outils/images-partage.mjs`.
3. Auditer : `node _audit/audit.mjs` (Playwright et Chromium nécessaires). Les parcours propres au site (prix, panier, filtres, recherche, outil Chez vous, commande, visionneuse) sont dans `_audit/parcours.mjs`.

Ne jamais modifier à la main les pages `.html` : elles sont réécrites par `generer.mjs`.

## Images générées

Les 20 images générées (Grok) sont en place dans `assets/images/grok/` (versions téléphone en `-mobile-`), toutes avec la mention « Illustration générée ». Les trois textures (papier, aluminium, toile) sont converties mais pas encore utilisées.

Pour remplacer une image : la convertir avec `outils/images.py` (lot JSON, modèle `outils/lot.exemple.json`, option `mobileSource` pour la version téléphone) sous le même nom dans `assets/images/grok/`, puis `node outils/generer.mjs`. Les fichiers reçus (`recu/`) restent hors du zip. Si on enlève une image, un dessin fait en code reprend sa place (`source/gabarits/provisoires.mjs`).

Les quatre intérieurs de « Chez vous » sont calibrés dans `donnees/interieurs.json` (plafond à 2,50 m mesuré sur chaque image : largeur et hauteur du mur visibles en cm, ligne du bas des œuvres, centre). Une nouvelle image d'intérieur demande une nouvelle mesure.

## À retirer à la mise en ligne définitive

- La consigne noindex : la balise `robots` de chaque page (gabarit `source/gabarits/commun.mjs`) et l'en-tête `X-Robots-Tag` de `vercel.json`.
- Le panier et la commande simulés : enregistrés dans le navigateur seulement, aucun paiement ni envoi. À brancher sur la vraie boutique (paiement par carte bancaire).
- La démonstration NFC de la page Certificat (illustrative, aucune puce n'est lue).
- Les mentions « à compléter » (fiche légale, frais de livraison, politique de confidentialité) et la phrase « Maquette : panier et commande simulés… » du pied de page.
- Les images de partage pointent vers l'adresse de la maquette : les régénérer avec l'adresse définitive (`donnees/site.json`, champ `adresse`).

## À garder

- La mention « Illustration générée » sur chaque image générée, et sa ligne dans les crédits des mentions légales.

## Informations à fournir par Sequoia Studio

Fichiers des œuvres en haute définition (le site actuel ne publie que des images de 500 à 800 px), fiche légale complète, frais de livraison, confirmation des textes et des biographies des artistes, et les points relevés dans le récapitulatif de livraison (paiement, matériaux, livraison, attributions d'œuvres).
