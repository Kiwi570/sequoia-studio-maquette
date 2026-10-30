# Audit automatique des maquettes

À copier dans le dossier `_audit/` de chaque projet (sans `node_modules`, exclu de la mise en ligne par `.vercelignore`).
Il se relance à chaque version, même dans une nouvelle conversation. Il utilise Playwright et Chromium, déjà installés là où travaille Claude. Rien à installer avec npm : axe-core est fourni dans le dossier (`axe.min.js`).

```
node _audit/audit.mjs              audit complet, avant chaque livraison (toutes les tailles dans tous les modes)
node _audit/audit.mjs --rapide     pendant la construction seulement (jamais pour livrer)
node _audit/audit.mjs --pages=/,/contact --seulement=fichiers,mesures,films,bords,parcours,ecran,fluidite,vitesse,captures,safari
```

Résultat dans `_audit/rapport/` : `rapport.md` (échecs, à regarder, **non lancé**, repères), `rapport.json`, `captures/`, `films/` (planches contact), `comparaisons/`.
Code de sortie 1 tant qu'il reste un échec.

## Ce qui est vérifié

- **Fichiers** : vercel.json (cleanUrls, aucun Cache-Control, X-Robots-Tag, en-têtes de sécurité), `.vercelignore` présent avec `_audit`, `source`, `outils` et `donnees` (fichier caché qui peut manquer dans la copie de la skill : `node outils/generer.mjs` le recrée), robots.txt sans « Disallow: / », noindex et image de partage (absolue, JPG ou PNG, 1200×630) sur chaque page, titres et descriptions, `?v=N` identique partout (pages et imports, aucun module chargé deux fois, différent de la dernière livraison), aucun lien vers le site actuel, liens externes en nouvel onglet, textes de chaque langue complets, pages régénérées après la dernière modification des données, vidéos de 3 Mo au plus.
- **Mesures** (13 tailles dans chaque mode : normal, calme, sans WebGL, sans JavaScript ; `--rapide` réduit les tailles) : débordement, textes sous 12 px, zones tactiles sous 44 px, textes et prix coupés, chevauchements, éléments recouverts, contrastes (fond uni et photo), un seul h1, titres dans l'ordre, textes alternatifs, noms accessibles, en-tête entier et opaque, aucun trou de navigation, premier écran complet au-dessus des barres fixes, images chargées, un visuel par section, mention « Illustration générée », erreurs de console et ressources en 404, textes non traduits, typographie française (pages en français seulement). Plus un balayage de 320 à 1920 px par pas de 20 px.
- **Films** (ordinateur et téléphone) : ouverture de chaque page au premier chargement, transition vers une autre page, retour arrière et avant, liens vers une ancre, épinglage de chaque scène. Images blanches, images isolées différentes (flash), changements brusques, éléments qui clignotent ou disparaissent, élément d'ouverture visible et entier dès la première image, voile qui couvre l'écran dès l'arrivée, ouverture de moins de 3 s, CLS au premier chargement. Un film qui échoue (par exemple « Page.startScreencast: Not attached to an active page ») est relancé dans un nouvel onglet, jusqu'à 3 tentatives, avant d'être classé « Non lancé » ; la reprise est notée dans les repères.
- **Bords de l'écran** (Chromium avec une barre de défilement classique, comme Windows ou un Mac avec une souris) : pendant l'intro, le voile (départ et arrivée) et le menu de chaque page, aucune bande d'une autre couleur le long d'un bord, notamment la bande de la barre de défilement (`scrollbar-gutter: stable`) restée claire à côté d'un voile sombre. Seules les images où le panneau couvre tout l'écran, immobile, sont jugées ; leur nombre est donné dans les repères. Fenêtres propres au projet : attribut `data-recouvrement`.
- **Intro** : jouée à l'arrivée et à chaque rechargement (chaque page), jamais sur un changement de page interne ni au retour arrière ou avant, accélérée par un clic, une touche, la molette, un toucher ou un glissement, passée par une seconde action, défilement bloqué pendant.
- **Parcours** : menu (Échap, focus, libellé « Menu » après un choix, page en cours), chaque lien (aucun lien mort, ancres existantes), chaque bouton (un effet visible), liens profonds (section sous l'en-tête, choix prérempli), liens vers la page en cours sans rechargement, changements de hauteur (positions recalculées), rechargement au milieu d'une page, mode calme (aucune boucle, retour à la section).
- **Tient dans l'écran** : sections épinglées et `[data-plein-ecran]` aux 8 tailles d'ordinateur.
- **Fluidité et vitesse** : défilement à la molette et au doigt, processeur ralenti 4 fois ; défilement adouci jamais sur Mac, iPhone, iPad, tactile ; budget du téléphone ralenti (2 s de calcul, aucune image de plus de 300 Ko dans le premier écran).
- **Safari** : captures avec WebKit (les films n'existent que dans Chromium), ou liste de points à vérifier dans Safari si WebKit ne peut pas s'installer.

## Parcours propres au projet

Copier `parcours.exemple.mjs` en `parcours.mjs` et l'adapter : calculateurs (totaux vérifiés par le calcul), panier (deux onglets, donnée abîmée), filtres, réservation, comptes à rebours, statuts automatiques, fenêtres (visionneuse, panier : focus gardé, Échap, retour du focus).

## Réglages

`_audit/config.json` (facultatif) : `{ "siteActuel": "domaine-du-client.fr" }` (sinon lu dans `donnees/site.json`).
`_audit/version-livree.txt` : numéro `?v=N` de la dernière livraison, écrit à chaque livraison.
`axe.min.js` : axe-core 4.12.1 de Deque Systems (licence MPL 2.0, mention en tête du fichier), fichier officiel, empreinte vérifiée avec la liste publiée par Deque (`sri-history.json`). Il tourne en plus des contrôles d'accessibilité intégrés. Pour une version plus récente, remplacer ce fichier ; s'il manque, l'audit le dit dans « Non lancé ».
