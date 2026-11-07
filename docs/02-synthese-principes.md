# Étape 2 — Synthèse et principes de conception

> Livrable du **Prompt 02**. Ce document sert de base de décision pour créer une identité originale (étape 3).
> Aucun template, aucune couleur ni police choisie ici, aucun code.
> Se base sur [01-analyse-references.md](01-analyse-references.md). Abréviations : **AQ** = aquidev, **NK** = nameksociety, **ND** = Norman Dubois / Perozzi.

---

## 1. Principes communs aux trois sites

Ce sont les règles que les trois respectent. Elles expliquent en grande partie la sensation de qualité.

| # | Principe | Ce qu'on observe | Pourquoi ça marche |
|---|---|---|---|
| P1 | **La typographie est l'image principale** | Nom ou titre géant dans le Hero chez les trois. Peu d'illustrations. | Une identité forte sans dépendre de visuels, et chargement rapide. |
| P2 | **Palette réduite + un seul accent** | Orange (AQ), terracotta (NK), rouge (ND), sur des neutres. | L'accent devient un signal : il guide l'œil vers ce qui compte. |
| P3 | **Mouvement qui démarre vite et finit doucement** | `expo.out` (AQ), `cubic-bezier(.16,1,.3,1)` (NK), interpolation amortie (ND). | Sensation de réactivité *et* de calme. C'est la signature « haut de gamme ». |
| P4 | **Défilement doux** | Lenis (AQ, NK), défilement maison (ND). | Donne du liant aux animations liées au scroll. |
| P5 | **Apparitions masquées, une seule fois** | Titres qui sortent d'un masque (`clip-path` / `yPercent`), `once: true`. | Le contenu arrive au bon moment sans re-clignoter quand on remonte. |
| P6 | **Micro-labels techniques** | Police mono pour les métadonnées (AQ, NK), petites capitales (ND). | Crée un deuxième niveau de lecture : « fiche technique ». |
| P7 | **Intro qui met en scène l'identité** | Logo (AQ), salutations multilingues (NK), pourcentage réel (ND). | Premier souvenir du visiteur, et masque le chargement. |
| P8 | **Curseur personnalisé sur desktop uniquement** | Présent chez les trois, absent sur tactile. | Personnalité + information contextuelle (« voir », « glisser »). |
| P9 | **Fin de page forte** | Signature géante + CTA (AQ), « Un projet en tête ? » (NK), « projet suivant » (ND). | Le visiteur qui arrive en bas est le plus intéressé : on lui donne une action claire. |
| P10 | **Rythme clair / sombre** | Alternance de sections claires et de blocs sombres (AQ, NK) ou cartes noires (ND). | Découpe la page en chapitres sans titres supplémentaires. |

---

## 2. Ce qui rend chaque site reconnaissable

| Site | Signature | Ce qu'on en retient |
|---|---|---|
| **AQ** | Mots clés en **serif italique de couleur** dans une phrase en sans-serif. | Un contraste de *voix* dans une même phrase, pas seulement de taille. |
| **NK** | Nom en **contour + plein**, portrait détouré devant, titres **/SLASH** avec titre fantôme derrière. | Un système de titres reconnaissable sur toute la page. |
| **ND** | Typo **ultra-condensée qui déborde**, disques rouges organiques, **motif tiré du métier** (le rectangle = curseur de terminal). | Un seul motif abstrait, issu du métier, répété partout : c'est ça qui fait une identité. |

**Leçon principale :** chaque site a **une** idée forte appliquée de façon cohérente, pas dix effets. Ton portfolio a besoin de *sa* propre idée forte, tirée de ton métier : systèmes, données, flux, cloud. Ce sera le travail de l'étape 3.

---

## 3. Meilleures idées de navigation

| Idée | Source | Intérêt pour toi |
|---|---|---|
| **Header qui se cache en descendant, revient en remontant** | AQ | Plus d'espace de lecture dans les études de cas et les articles. |
| **Navigation qui devient une pilule flottante compacte** | NK | Accès permanent aux sections sur une page longue, très bien sur mobile. |
| **Compteurs dans les liens** (« Projets [4] ») | NK | Information réelle et vérifiable. Le chiffre vient de la base de données, donc toujours juste. |
| **Pourcentage de lecture** dans un cercle fixe | ND | Idéal pour les études de cas et les Insights (articles longs). |
| **« Projet suivant »** en bas de chaque étude de cas | ND | Fait passer d'un projet à l'autre au lieu de revenir à la liste. |
| **Slogan d'en-tête qui change** | ND | Peut faire défiler tes 5 domaines. À utiliser avec retenue. |

---

## 4. Animations les plus intéressantes

1. **Révélation de titre masquée** (AQ, NK) : le texte monte depuis l'intérieur d'un masque. Simple, efficace, et c'est la base de tout le système.
2. **Préloader qui charge vraiment quelque chose** (ND) : le pourcentage reflète un préchargement réel au lieu d'un faux décompte. C'est honnête et cohérent avec un profil d'ingénieur.
3. **Salutations multilingues** (NK) : pertinent pour un site bilingue, à réinterpréter (voir §6).
4. **Révélation circulaire depuis le point de clic** (AQ) : transition idéale pour un changement de thème ou de langue.
5. **Pastille partagée qui glisse entre les filtres** (NK) : retour visuel immédiat pour les catégories de projets et d'Insights.
6. **Élément génératif qui réagit à la vitesse** (ND, WebGL) : un seul élément vivant, très mémorable, à condition de le relier à ton métier.
7. **Texte de bouton qui « roule »** (AQ) : micro-interaction légère qui rend chaque bouton réactif.

---

## 5. Interactions les plus pertinentes

| Interaction | Source | Pertinence |
|---|---|---|
| Curseur à **étiquette contextuelle** (« VOIR », « LIRE », « GLISSER ») | AQ | Haute : informe au lieu de décorer. |
| **Filtres** de projets et de catégories | NK | Haute : utile dès qu'il y a plusieurs projets et articles. |
| **Accordéon de services** avec visuel au survol | NK | Moyenne : bonne densité d'information. Le visuel flottant est à vérifier sur mobile. |
| **Aperçu d'image au survol** d'une liste de projets | ND (`data-hover-image`) | Haute sur desktop. Doit avoir un équivalent tactile. |
| **Interaction qui prouve une compétence** | NK (le défi) | Haute en idée, coûteuse en réalisation (voir §6). |
| **Badge de disponibilité** | NK | Haute : utile aux recruteurs et aux clients. Pilotable depuis l'admin. |

---

## 6. Classement des inspirations

### A. À réinterpréter fortement
*L'idée est gardée, la forme change complètement.*

| Inspiration | Source | Réinterprétation à explorer | Pourquoi ça t'aide |
|---|---|---|---|
| **Motif graphique tiré du métier** | ND (rectangle = curseur) | Un motif issu de la donnée ou des systèmes : flux, nœud, grille, pipeline. **Sans** code défilant ni matrice. | C'est ce qui donnera une identité *à toi* et pas une copie. |
| **Élément génératif vivant** | ND (taches WebGL) | Un seul élément qui réagit au curseur et au scroll et qui évoque un flux de données. Le choix WebGL ou plus léger se fera à l'étape 5. | Mémorable. Démontre un savoir-faire technique sans le dire. |
| **Interaction-preuve** | NK (défi de bugs) | Plutôt qu'un jeu : une **démonstration** liée à ton métier, alimentée par de vraies données du site (nombre de projets, d'articles, technologies utilisées). **Aucune donnée inventée.** | Montre ta double compétence logiciel + data de façon concrète. |
| **Intro qui raconte** | NK (salutations), ND (%) | Une intro courte qui reflète le bilinguisme ou le « chargement du système ». Jouée **une fois par session** seulement. | Premier souvenir fort sans faire attendre à chaque page. |
| **Typographie-affiche** | ND (condensé qui déborde), NK (contour/plein) | Un traitement du nom ou du titre qui t'appartient. Le style précis se décide à l'étape 3. | Le Hero devient reconnaissable au premier coup d'œil. |

### B. À adapter à ton identité
*Assez proche de l'original, ajusté à ton profil et à l'accessibilité.*

| Inspiration | Source | Adaptation | Pourquoi ça t'aide |
|---|---|---|---|
| Révélation masquée des titres, une seule fois | AQ, NK | Base de tout le système d'animation. | Cohérence et lisibilité. |
| Courbe « départ rapide, fin douce » | Les trois | Une seule famille de courbes pour tout le site. | Sensation de finition homogène. |
| Défilement doux | AQ, NK | Lenis réglé léger, coupé avec reduced motion, clavier respecté. | Fluidité sans gêner la navigation. |
| Titres de section indexés + titre fantôme | NK | Indexation à ta façon (numéro, code, chemin…). | Structure la page longue et sert ton côté « ingénieur ». |
| Accent de voix dans une phrase | AQ | Mettre en valeur 1 ou 2 mots clés de l'accroche. Le procédé exact est à choisir à l'étape 3. | Accroche plus mémorable. |
| Header masqué au scroll + pilule flottante | AQ, NK | Pilule compacte sur mobile, avec le sélecteur FR/EN. | Navigation toujours accessible. |
| Compteurs dans la navigation | NK | Calculés depuis la base de données. | Informatif et toujours exact. |
| Pourcentage de lecture | ND | Uniquement sur les études de cas et les articles. | Repère utile dans les contenus longs. |
| « Projet suivant » | ND | En bas de chaque étude de cas, avec transition. | Prolonge la visite des recruteurs. |
| Filtres à pastille partagée | NK | Projets (par domaine) et Insights (par catégorie). | Navigation rapide dans le contenu. |
| Curseur à étiquette | AQ | Desktop uniquement. Le curseur système reste visible ou est remplacé proprement. Désactivé avec reduced motion. | Personnalité + information. |
| Aperçu image au survol | ND | Desktop : image qui suit. Tactile : vignette intégrée à la ligne. | Liste de projets élégante et compacte. |
| Révélation circulaire au clic | AQ | Changement de thème et/ou de langue. | Transforme une action utilitaire en moment de marque. |
| Footer signature + CTA | AQ, NK | Signature typographique + deux portes d'entrée : **Recruteurs** (CV) et **Clients** (contact). | Répond directement à tes deux publics. |
| Badge « Disponible » | NK | Statut piloté depuis l'admin. | Information utile et toujours à jour. |
| Rythme clair / sombre | AQ, NK | Alternance de chapitres. | Lisibilité d'une page longue. |
| Micro-labels mono | AQ, NK | Métadonnées des projets : stack, période, rôle, statut. | Fiche technique lisible pour les recruteurs. |

### C. À écarter

| Élément | Source | Raison |
|---|---|---|
| Effet **glitch** | NK | Cliché « tech », fatigant à lire, problème avec les animations réduites. |
| **Bandeau défilant de logos de technologies** | AQ, NK | Présent partout, n'apporte aucune preuve de niveau. Les technologies seront montrées *dans* les projets. |
| **Fond nuageux / cartes encadrées** comme des maquettes | NK | Donne une impression de présentation Dribbble plutôt que de produit. |
| **Grain animé en permanence** | AQ | Coût de performance continu pour un gain faible. Une texture fixe reste envisageable. |
| **Pile de cartes 3D à glisser** dans le Hero | AQ | Lourd, peu accessible, et cache les projets derrière une interaction. |
| **Préloader long à chaque visite** | AQ (≈ 3,6 s), NK (≈ 3,5 s) | Pénalise les recruteurs pressés et le SEO perçu. Une fois par session, moins de 2 s. |
| **Curseur qui masque complètement la souris** sans repli | ND | Risque de désorientation, problème d'accessibilité. |
| **Texte fin gris clair sur gris** | ND | Contraste insuffisant (WCAG). |
| **Polices payantes** spécifiques | ND | Coût de licence. À reconsidérer seulement si tu acceptes un budget typographique. |
| **Rendu uniquement côté client** (page vide sans JS) | AQ | Mauvais pour le SEO et le premier affichage. Le site public devra avoir un rendu serveur. |
| **Chiffres d'audience, WhatsApp flottant, formations** | AQ | Hors de ton positionnement d'ingénieur. Les chiffres seraient de toute façon à ne pas inventer. |
| **Mini-jeu complet + classement** | NK | Coût de développement et de maintenance élevé. L'*idée* est conservée en A. |
| **Calendrier de rendez-vous intégré** | NK | Pas nécessaire au lancement. Un lien externe pourra être ajouté plus tard depuis l'admin. |

---

## 7. Bibliothèque d'inspirations fonctionnelles

Ce sont les **comportements** à concevoir, décrits indépendamment de tout style visuel. Les durées et courbes définitives seront fixées à l'étape 5 (motion design).

### Transitions

| ID | Comportement | Déclencheur | Origine | Règles |
|---|---|---|---|---|
| T-01 | **Intro de session** : courte séquence d'identité, puis ouverture vers le Hero. | Première visite de la session. | NK, ND | Jouée une fois par session, moins de 2 s, peut être passée. Reduced motion : apparition simple en fondu. |
| T-02 | **Transition entre pages** : un rideau ou un masque recouvre la page puis révèle la suivante. Le titre de destination peut apparaître. | Clic sur un lien interne. | ND | Ne bloque pas le bouton retour du navigateur. Reduced motion : fondu court. |
| T-03 | **Révélation circulaire** depuis le point de clic. | Changement de thème et/ou de langue. | AQ | Au clavier, part du centre du bouton. Reduced motion : changement instantané. |
| T-04 | **Projet suivant** : le bloc de fin s'agrandit et devient l'en-tête du projet suivant. | Clic sur « projet suivant ». | ND | Équivalent simple sur mobile. |

### Défilement

| ID | Comportement | Déclencheur | Origine | Règles |
|---|---|---|---|---|
| S-01 | **Titre masqué** : les lignes montent depuis un masque, légèrement décalées. | Entrée du titre dans l'écran. | AQ, NK | Une seule fois. Le texte reste lisible par les lecteurs d'écran. |
| S-02 | **Apparition de blocs** : fondu et léger décalage vertical, en cascade. | Entrée dans l'écran. | AQ, NK | Une seule fois. Décalages courts. |
| S-03 | **Parallaxe légère** sur images et éléments décoratifs. | Position de scroll. | AQ, ND | Amplitude faible, désactivée sur mobile et avec reduced motion. |
| S-04 | **Progression de lecture** en pourcentage. | Scroll dans une étude de cas ou un article. | ND | Annoncée sans bruit pour les lecteurs d'écran. |
| S-05 | **Header masqué / révélé** selon le sens du scroll. | Sens du scroll. | AQ | Toujours visible quand il a le focus clavier. |
| S-06 | **Élément génératif** réagissant à la vitesse de scroll. | Vitesse du scroll et du curseur. | ND | Mis en pause hors écran et quand l'onglet est caché. Version figée avec reduced motion. |

### Projets

| ID | Comportement | Déclencheur | Origine | Règles |
|---|---|---|---|---|
| P-01 | **Liste + aperçu au survol** : l'image du projet apparaît près du curseur. | Survol d'une ligne de projet. | ND | Tactile : vignette dans la ligne. Clavier : l'aperçu suit le focus. |
| P-02 | **Filtre à pastille partagée** : la pastille glisse, les cartes se réorganisent. | Clic sur une catégorie. | NK | Le résultat est annoncé (« 3 projets »). Reduced motion : pas de réorganisation animée. |
| P-03 | **Carte de projet réactive** : léger zoom de l'image, révélation des métadonnées. | Survol ou focus. | AQ, NK | Aucune information importante visible *uniquement* au survol. |
| P-04 | **Galerie d'étude de cas** : images qui se révèlent par masque, ouverture en plein écran. | Scroll, puis clic. | ND | Plein écran navigable au clavier, fermeture avec Échap. |

### Curseur

| ID | Comportement | Déclencheur | Origine | Règles |
|---|---|---|---|---|
| C-01 | **Curseur suiveur** avec un léger retard (ressort). | Mouvement de la souris. | NK, ND | Uniquement avec un pointeur fin (`pointer: fine`). |
| C-02 | **États contextuels avec étiquette** : « Voir », « Lire », « Ouvrir ». | Survol de zones désignées. | AQ, ND | Le texte du lien reste le vrai libellé accessible. |
| C-03 | **Agrandissement sur les liens et boutons.** | Survol d'un élément interactif. | ND | Ne recouvre jamais le texte. |
| C-04 | **Désactivation** : retour au curseur système. | Tactile, reduced motion, ou champs de formulaire. | — | Obligatoire. |

### Boutons et navigation

| ID | Comportement | Déclencheur | Origine | Règles |
|---|---|---|---|---|
| B-01 | **Texte qui roule** : le libellé sort par le haut et revient par le bas. | Survol ou focus. | AQ | Coupé avec reduced motion. |
| B-02 | **Effet magnétique** sur les CTA principaux. | Curseur à proximité. | AQ (bouton rond) | Desktop uniquement, amplitude faible, seulement 2 ou 3 boutons. |
| B-03 | **Pilule de navigation flottante** compacte. | Après le Hero. | NK | Contient la langue. Pleinement utilisable au clavier. |
| B-04 | **Indicateur de disponibilité** pulsant. | Permanent. | NK | Statut piloté par l'admin. Pulsation coupée avec reduced motion. |

---

## 8. Combinaisons intelligentes à explorer à l'étape 3

1. **La rigueur typographique de ND + la chaleur lisible d'AQ.** Une identité affirmée qui reste confortable à lire pour un recruteur.
2. **Le système de titres indexés de NK + un motif tiré de ton métier.** L'index devient un élément d'identité, pas seulement de navigation.
3. **L'élément génératif de ND + l'interaction-preuve de NK.** Un seul élément vivant qui *représente* tes domaines et réagit au visiteur.
4. **La structure orientée conversion d'AQ + la sobriété de ND.** Des CTA clairs pour les deux publics, sans surcharge.

---

## 9. Points à trancher plus tard

| Question | Étape |
|---|---|
| Faut-il un vrai WebGL pour l'élément génératif, ou une version Canvas/SVG plus légère ? | 5 (motion) |
| Mode clair, sombre, ou les deux avec bascule ? | 3 (direction artistique) |
| Quelle intro : salutation bilingue, chargement « système », ou autre ? | 3 et 5 |
| Polices gratuites uniquement, ou budget pour une police payante ? | 3 |
| GSAP ou Motion comme bibliothèque principale ? | 5 et 7 (dépend aussi du framework) |
