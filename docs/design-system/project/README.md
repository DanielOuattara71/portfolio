Index Studio est l'identité du portfolio d'un Software & Data Engineer. Idée directrice : **le contenu est présenté comme un jeu de données** (fiches, identifiants, champs, barre de requête), habillé d'une mise en page de studio chaleureuse inspirée de nameksociety et d'aquidev : papier crème, typographie géante, panneaux arrondis, une seule couleur signature, l'orange marqueur (`#ff7a1a`).

## Ton et contenu

- Écrire à la première personne (« je conçois »), au présent, avec des verbes concrets : concevoir, construire, livrer, intégrer.
- Bilingue FR / EN. Chaque langue est écrite naturellement, jamais traduite mot à mot. Les deux versions sont saisies séparément dans l'admin.
- **Ne jamais inventer** une donnée : chiffre, résultat, rôle, date, capture, client. Une valeur manquante s'affiche « à compléter » en `ink-muted` dans les maquettes et est masquée en production.
- Distinguer ce qui est pratiqué, appris en formation et en exploration. Pas de « expert », « passionné », « ninja ».
- Libellés d'interface en minuscules dans la police `data` (`stack`, `rôle`, `query >`), titres de section en capitales et en route (`/PROJETS`).
- Pas d'emoji. Les flèches ↗ → ← sont des glyphes, posés dans un disque `marker` ou un bouton rond.
- Mettre en valeur un ou deux mots clés par phrase avec `accent-italic`, jamais plus.

Exemples réels :
> Je conçois des applications web et mobiles *de bout en bout*, j'y intègre l'IA et l'automatisation quand elles sont utiles, et je me spécialise dans *la donnée et le cloud*.

> Construisons quelque chose de *fiable*.

## Couleur

- Fond de page : `surface`. Le Hero est posé directement dessus, **jamais dans une carte**.
- Sections : panneaux `surface-raised` avec un filet `line`, en alternance avec des panneaux `surface-inverse`. Jamais deux panneaux sombres d'affilée.
- Fiches, champs de requête et groupes de filtres : `surface-sunken`.
- Texte : `ink` sur `surface`, `surface-raised` et `surface-sunken` ; `ink-muted` pour le secondaire. Sur `surface-inverse` : `ink-inverse` et `ink-inverse-muted`.
- `marker` est **toujours un fond**, jamais une couleur de texte : badges d'identifiant, point de navigation actif, bouton rond, bandeau « Et votre projet ? », vue données du portrait. Ce qui est posé dessus prend `on-marker`. Un seul grand aplat `marker` par page.
- Sur un fond `ink` (bouton principal, filtre actif, bouton menu), le texte prend `on-ink`.
- `success` ne sert qu'au point « Disponible », toujours suivi du mot.
- `placeholder` ne sert qu'aux hachures « capture à fournir ».
- Le thème sombre (`dark`) inverse papier et encre ; `marker` et `on-marker` ne changent pas. Toutes les paires texte/fond ci-dessus dépassent 4,5:1 dans les deux thèmes (`ink-muted` sur `surface-sunken` en clair : 4,58:1, le plus juste).

## Typographie

- Une seule famille partout : **Poppins**. Les quatre rôles (`display`, `body`, `data`, `accent`) pointent tous sur Poppins ; ils restent séparés pour pouvoir changer une police plus tard sans toucher aux composants. `data` sert aux étiquettes, champs, identifiants et compteurs ; `accent` aux mots mis en valeur, en **Poppins italique** (vraie italique chargée, jamais d'inclinaison synthétique).
- Nom du Hero et signature du footer : `display-hero`, capitales, prénom en contour (`ink`, 1.5px), nom en plein.
- Titres de section : `display-section` en route (`/PROJETS`) + compteur `[5 enregistrements]` en `label-sm` + mot fantôme `ink` à 4,5 % d'opacité.
- Grandes phrases : `display-statement`. Services : `title-service`. Accroche du Hero : `title-lead`. Noms de projets : `title-card`.
- Texte courant : `body` (65 caractères de large), chapeaux : `body-lg` (52 caractères), cartes et listes : `body-sm`, boutons : `button`.
- Données : `label` pour les champs, `label-sm` pour la ligne d'enregistrement et les badges, `micro` pour les légendes.
- Les grandes tailles sont fluides avec `clamp()` ; les valeurs des tokens sont les maximums (voir chaque style).
- Polices : Poppins 300–800 en romain, 400–600 en italique. Sur le site, elles sont auto-hébergées au build (`@nuxt/fonts`) ; les aperçus du design system les chargent depuis Google Fonts.

## Espacement et mise en page

- Pas de 4px : `space-1` à `space-24`. Gouttière minimale `gutter` + marges de sécurité du téléphone. Contenu limité à `container` (1560px).
- 24px (`space-6`) entre deux panneaux, padding de panneau fluide jusqu'à `space-12`.
- Ruptures : sous `bp-lg` (900px), la pilule de navigation devient un bouton menu et la pile portrait passe sous le nom (alignée à droite, jamais centrée). Sous `bp-md` (760px), grilles et boîte d'accordéon passent sur une colonne.
- La page ne défile jamais horizontalement : les éléments inclinés (pile portrait) sont rognés par leur section (`overflow-x: clip`).

## Formes, rayons, ombres

- Rayons : `radius-full` pour tout ce qui est cliquable et pilule ; `radius-md` pour les médias internes et les tuiles du ruban ; `radius-lg` pour les fiches ; `radius-xl` pour les cartes portrait ; `radius-2xl` pour les panneaux et le bandeau.
- Formes récurrentes : disque (badge rotatif, bouton rond, point de statut), rectangle arrondi (fiches, tuiles), carré `marker` du logo.
- Ombres : `shadow-button` uniquement sur le bouton principal, `shadow-pill` sur les pastilles de faits, `shadow-lift` sur les cartes inclinées, `shadow-menu` sur le menu mobile. Le reste est plat, séparé par des filets `line`.
- Texture : un grain fixe à 7 % d'opacité sur toute la page, jamais animé.

## Images

- Portrait : photo professionnelle importée dans l'admin, présentée en **PortraitStack** (3 cartes : photo, vue données en trame 1 bit `marker`/`ink` générée automatiquement, fiche profil). Jamais centrée, jamais détourée.
- Projets : vraies captures importées dans l'admin, 16:10, recadrées. Aucune capture fabriquée ; sans image, hachures `placeholder` + « capture à fournir ».
- Pas d'illustration, de 3D, d'image de stock ni de code qui défile.

## Iconographie

- Technologies : logos **Simple Icons** (CC0) intégrés en SVG dans des tuiles `radius-md` aux couleurs officielles (TechRibbon). Uniquement les technologies réellement utilisées.
- Interface : glyphes ↗ → ← × + dans des disques ou des boutons ronds. Pour les icônes supplémentaires du site et de l'admin, utiliser **Lucide** (trait 1.5–2px, `currentColor`).
- Le logo est le carré `marker` avec les initiales en `data` : il n'existe pas d'autre logo.

## Mouvement (provisoire, fixé à l'étape motion design)

- Une seule courbe : `ease-out`. Durées : `duration-fast` (couleurs), `duration-base` (texte qui roule, filtre qui glisse), `duration-slow` (cartes, zoom, accordéon), `duration-marquee` (ruban).
- Mouvements signature : texte de bouton qui roule, pastille de filtre qui glisse, carte portrait qui passe derrière, barre de navigation qui se cache au scroll, ruban qui défile, badge qui tourne, bouton rond magnétique.
- `prefers-reduced-motion: reduce` : tout devient instantané, ruban et badge immobiles. Curseur à étiquette et effet magnétique uniquement avec un pointeur fin.

## Accessibilité

- Focus clavier : 2px plein décalé de 3px, `focus-ring` sur les surfaces claires, `focus-ring-inverse` dans `surface-inverse`, `focus-ring-on-marker` dans un fond `marker`.
- Les éléments décoratifs (mot fantôme, signature géante, copie du ruban, badge rotatif) sont `aria-hidden`.
- Filtres, langue et tuiles utilisent `aria-pressed` ; l'accordéon `aria-expanded` ; la section active de la navigation `aria-current`.
- Les résultats de filtrage sont annoncés dans une zone `aria-live`.
