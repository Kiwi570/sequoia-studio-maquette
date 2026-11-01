# Ce qui a changé

Chaque version ajoute sa partie en tête de ce fichier, construite en comparant l'archive précédente et la nouvelle, jamais de mémoire.

## v2 — les images générées, l'échelle juste, les corrections de la relecture

**Images**
- Les 20 images générées (Grok) remplacent les dessins : murs de nuit de l'accueil, de la galerie, des artistes et de la 404, quatre intérieurs, ateliers, emballage, journal, textures, pages légales. Versions téléphone pour 11 d'entre elles.
- La mention « Illustration générée » reste toujours lisible : au-dessus de la pénombre du projecteur, dans un coin libre, jamais sur une œuvre vendue (sur téléphone, dans une bande sous l'en-tête).
- Photo du smartphone (page Certificat) montrée entière ; image de l'atelier d'impression chargée en pleine largeur (elle était floue).

**Chez vous à l'échelle**
- Les quatre intérieurs sont calibrés sur les vraies images (plafond à 2,50 m, mur de 4,70 à 5,10 m) ; la démonstration de l'accueil et l'ouverture de « Chez vous » aussi.
- Les œuvres ajoutées s'accrochent côte à côte (12 cm d'écart, bas alignés), la composition reste centrée, aucune œuvre ne sort du mur, et elles gardent leur place quand on change d'intérieur.
- « Essayer sur mon mur » emporte le format et la finition choisis sur la fiche.
- Mode « Votre photo » sans photo : une consigne au lieu d'un fond noir. Sur téléphone, la scène reste visible pendant les réglages.
- « Bureau, le soir » devient « Salle de réunion, le soir » (ce que montre l'image).

**Catalogue et fiches**
- Quatre formats sans aucune finition possible (côté court au-delà de 80 cm) sont retirés : ils affichaient « NaN € ». Liste à confirmer par Sequoia Studio.
- Une finition impossible dans un format est expliquée (« FineArt : jusqu'à 110 × 70 cm ») ; si elle était choisie, la bascule vers une autre finition est dite.
- Styles harmonisés (Surréalisme, Minimalisme, Réalisme, Lavis d'encre au lieu de « Ink-wash »), apostrophes et guillemets typographiques, « Rêverie Vénitienne ».
- Texte FineArt nettoyé (vocabulaire « photo » d'un site de tirage, espaces, « œuvre ») ; supplément des finitions précisé : « arrondi à la dizaine supérieure ».
- Titre du certificat spécimen plus jamais recouvert par la vignette ; nuancier légendé « relevé sur l'œuvre ».

**Panier, recherche, galerie**
- Sur téléphone, le panier est dans l'en-tête, avec le nombre d'œuvres.
- Une recherche validée par Entrée ouvre la galerie directement sur les œuvres trouvées.
- Filtres : les choix à 0 œuvre ne sont plus cliquables ; sur téléphone, « Voir les n œuvres » referme le panneau.
- Cartes de la galerie : œuvres plus grandes, mise en situation au survol voilée (plus d'éclat blanc), mur d'ouverture chargé d'emblée.
- Après la commande simulée, seule la confirmation reste, avec le retour à la galerie.

**Textes**
- Note des CGV reformulée (plus aucune mention « toutes taxes comprises ») ; « portraits » retiré des informations à fournir.
- « Finitions » : « 2 ou 3 formats par œuvre » ; article : « Commencer la lecture ».

**Audit**
- Parcours ajoutés : chaque format a un prix, « Essayer sur mon mur » garde le choix, recherche validée par Entrée.
- Plus aucun saut de mise en page au chargement (projecteur déplacé par transform seulement, hauteur d'en-tête juste dès la première image, panier vide affiché d'emblée).
- La démonstration de l'accueil tient entière dans les écrans bas ; petits téléphones (jusqu'à 700 px de haut) et téléphones à l'horizontale : titre, bouton et repère dans le premier écran.
- Sans JavaScript sur téléphone, l'en-tête ne recouvre plus le début des pages.
- Code 404 et noms des artistes lisibles sur les images générées ; ouverture un peu plus courte.

## v1 — la base

**Direction artistique « Nocturne »**
- Fond noir velours, texte ivoire, accents laiton ; titres en Instrument Serif, texte en Geist (polices allégées, servies par le site).
- Chaque œuvre est accrochée dans une scène de nuit : un projecteur suit la souris (dérive lente au toucher), l'ombre du cadre bouge avec la lumière, le fond de la page prend la teinte de l'œuvre à l'écran.
- Ouverture d'environ 2 s : le séquoia luit dans le noir, puis le projecteur s'allume sur l'œuvre. Changements de page par un voile, sans réouverture.

**Pages (59)**
- Accueil : œuvre éclairée, sélection du moment en salle horizontale, choix par univers (passage d'une œuvre à l'autre par un balayage de lumière), démonstration à l'échelle au-dessus d'un canapé de 220 cm (3 formats, puis les finitions), vue éclatée de la caisse américaine, anneau d'édition, artistes, fondateurs, achat serein.
- Galerie : mur d'ouverture, filtres par univers, artiste, format et couleur, tri, recherche (accents et pluriels ignorés), choix gardés dans l'adresse, deux œuvres par rangée sur téléphone.
- 42 fiches œuvre : œuvre dans son vrai cadre, choix du format et de la finition avec prix, dimensions totales et échantillon mis à jour, visionneuse avec loupe, nuancier, mise en situation du client, certificat spécimen, œuvres du même univers.
- Chez vous : jusqu'à 3 œuvres posées à l'échelle dans 4 intérieurs ou sur une photo du client (échelle donnée par une feuille A4), total et ajout au panier.
- Artistes (une salle par artiste, avec son œuvre signature), Cadres et finitions (comparatif, courbe d'absorption de la toile), Certificat (hologramme qui suit la lumière, démonstration NFC illustrative), Journal et 4 articles, Le studio, Mentions légales, CGV, Confidentialité, 404.
- Panier dans un tiroir, identique dans tous les onglets, et commande simulée (aucune donnée bancaire demandée).

**Contenu**
- Textes, biographies, articles et pages légales repris du site actuel ; prix recalculés avec la formule du site actuel et affichés « TVA non applicable, art. 293 B du CGI ».
- Paiement affiché : carte bancaire seule (CB, Visa, Mastercard), comme dans les CGV.
- Images du site actuel converties en WebP à plusieurs tailles ; 20 emplacements d'images générées dessinés en code en attendant les images Grok.

**Mise en ligne et confort**
- noindex, images de partage 1200×630 pour chaque page, en-têtes de sécurité, adresses sans « .html ».
- Mode « Réduire les animations », site lisible sans JavaScript, contrôles au clavier.
