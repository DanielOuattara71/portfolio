# Étape 8 — Motion design

> Livrable du **Prompt 08**. Langage d'animation du portfolio : bibliothèque d'animations, règles de déclenchement, paramètres, choix techniques et architecture.
> Base : l'analyse des références ([01](01-analyse-references.md)), la synthèse ([02](02-synthese-principes.md)), la maquette validée ([04b](04b-index-studio.html)) et le design system ([design-system](design-system/project/README.md)).
> **Aucun code de production ici.** L'implémentation vient après validation.

---

## 1. Principes

1. **Le mouvement raconte « le chargement d'un enregistrement ».** Les contenus *sortent d'un masque* comme une ligne qu'on affiche, les fiches *se réordonnent* comme un tableau qu'on trie, les cartes *se rangent* comme une pile qu'on parcourt. C'est le fil conducteur, cohérent avec la direction Index.
2. **Une seule courbe principale** : départ rapide, arrivée douce (`ease-out`), comme chez les trois références.
3. **Un seul « grand moment » par écran.** Le Hero a sa séquence, chaque section a une révélation, le reste est discret.
4. **Rien n'attend l'animation.** Les boutons sont cliquables pendant les entrées, l'intro se passe, aucune information n'est visible uniquement au survol.
5. **Une fois suffit.** Une apparition au scroll ne se rejoue pas quand on remonte.
6. **Mobile allégé, animations réduites respectées.** Chaque animation a une version mobile et une version « animations réduites ».

---

## 2. Paramètres de mouvement

À ajouter aux tokens du design system après validation (ils remplaceront les valeurs provisoires).

### Durées

| Token | Valeur | Usage |
|---|---|---|
| `duration-micro` | 150ms | Appui sur un bouton |
| `duration-fast` | 250ms | Couleurs, apparition d'une étiquette, sorties rapides |
| `duration-base` | 450ms | Texte qui roule, pastille de filtre, menu, icônes |
| `duration-slow` | 800ms | Cartes, révélations de texte, accordéon, zoom d'image |
| `duration-xslow` | 1100ms | Rideau de transition, sortie de l'intro, révélation d'image |
| `duration-marquee` | 42s | Un tour du ruban technologies |
| `duration-spin` | 22s | Un tour du badge rotatif |

### Courbes

| Token | Valeur | Usage |
|---|---|---|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Toutes les entrées et la plupart des transitions |
| `ease-in-out` | `cubic-bezier(0.76, 0, 0.24, 1)` | Rideaux : intro, transition de page, révélation circulaire |
| `ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Sorties : carte qui quitte la pile, éléments qui disparaissent au filtrage |
| `linear` | `linear` | Ruban, badge rotatif, animations liées au scroll |

### Décalages et distances

| Token | Valeur | Usage |
|---|---|---|
| `stagger-line` | 60ms | Entre deux lignes de texte |
| `stagger-word` | 80ms | Entre deux mots du nom |
| `stagger-item` | 80ms | Entre deux cartes ou éléments de liste |
| `reveal-mask` | 110% | Distance d'une ligne qui sort de son masque |
| `reveal-block` | 24px | Montée d'un bloc qui apparaît |
| `parallax-max` | 8% | Amplitude maximale d'une parallaxe |
| `trigger-start` | haut de l'élément à 85 % de l'écran | Seuil d'apparition au scroll |

---

## 3. Bibliothèque d'animations

Pour chaque animation : élément, déclencheur, mouvement, durée, courbe, délais, fin, mobile, animations réduites.

### M-01 · Introduction de session

| | |
|---|---|
| **Éléments** | Panneau `ink` plein écran, salut « Bonjour → Hello », compteur `000 → 100` géant en bas à droite, barre `marker` en bas |
| **Déclencheur** | Première page vue dans la session de navigation (mémorisé pour la session) |
| **Mouvement** | Le salut apparaît (fondu + 8px). Le compteur monte de 000 à 100. Au milieu, « Bonjour » roule vers « Hello ». La barre jaune avance avec le compteur. Puis le panneau se replie vers le haut (`clip-path`) et découvre la page. |
| **Durée** | Compteur : **réel**. Il suit le chargement des polices et de l'image du Hero, au minimum 900ms, au maximum 1 500ms. Sortie : `duration-xslow` |
| **Courbe** | Compteur `ease-out`, sortie `ease-in-out` |
| **Délais** | L'entrée du Hero (M-02) démarre à 60 % de la sortie du panneau : les deux se chevauchent |
| **Fin** | Panneau retiré du DOM. Bouton « Passer » et touche Échap disponibles à tout moment |
| **Mobile** | Identique, plafonné à 1 100ms |
| **Animations réduites** | Pas d'intro |

### M-02 · Entrée du Hero

| | |
|---|---|
| **Éléments** | Ligne d'enregistrement, nom (prénom contour + nom plein), titre, accroche, phrase de valeur, boutons, pastilles, pile portrait, badge rotatif |
| **Déclencheur** | Fin de l'intro, ou chargement de la page s'il n'y a pas d'intro |
| **Séquence** | 0ms : ligne d'enregistrement (fondu). 0ms : chaque mot du nom sort de son masque par le bas (`reveal-mask`), `stagger-word`, prénom puis nom. 200ms : les 3 cartes portrait s'ouvrent en éventail depuis une pile droite, de l'arrière vers l'avant (120ms d'écart). 250ms : titre, accroche et phrase de valeur, ligne par ligne (`stagger-line`). 450ms : boutons puis pastilles (montée de 16px, `stagger-line`). 700ms : le badge rotatif apparaît (échelle 0 → 1, rotation -90° → 0°), puis tourne en continu. |
| **Durée** | Mots : `duration-slow` + 100ms (900ms). Cartes : 1 000ms. Reste : `duration-slow`. **Total ≈ 1,6 s** |
| **Courbe** | `ease-out` |
| **Fin** | Tout en place, aucune animation résiduelle sauf le badge |
| **Mobile** | Le nom sort ligne par ligne au lieu de mot par mot. La pile apparaît d'un bloc (fondu + 24px) sans éventail. |
| **Animations réduites** | Tout visible immédiatement, badge immobile |

### M-03 · Pile portrait

| | |
|---|---|
| **Éléments** | Les 3 cartes de la pile |
| **Déclencheurs** | Clic sur la pile, flèches, glissement horizontal, touches ← → quand la pile a le focus |
| **Mouvement** | La carte du dessus part vers la gauche (`x: -120%`, rotation -14°, fondu) puis se range derrière. Les deux autres avancent d'un cran. Au glisser, la carte suit le doigt (rotation proportionnelle au déplacement) et part si on dépasse 40px ou si le geste est rapide ; sinon elle revient. |
| **Durée** | Sortie : 380ms `ease-in`. Rangement : `duration-slow` `ease-out` |
| **Survol (ordinateur)** | Les cartes de derrière s'écartent légèrement (+6px, +2°) en `duration-base`, ce qui invite à cliquer |
| **Fin** | L'étiquette sous la pile roule vers le nom de la nouvelle carte |
| **Mobile** | Glisser au doigt, pas d'écartement au survol |
| **Animations réduites** | Changement instantané |

### M-04 · Titres de section

| | |
|---|---|
| **Éléments** | `/TITRE`, compteur, mot fantôme, chapeau |
| **Déclencheur** | `trigger-start`, une seule fois |
| **Mouvement** | Le titre sort de son masque par le bas. Le compteur roule de `[0]` à sa valeur réelle. Le chapeau apparaît ligne par ligne. Le mot fantôme glisse horizontalement de -4 % à +4 % pendant toute la traversée de la section (lié au scroll). |
| **Durée** | Titre `duration-slow`, chapeau +150ms, `stagger-line` |
| **Mobile** | Pas de glissement du mot fantôme (fixe) |
| **Animations réduites** | Tout visible, mot fantôme fixe |

### M-05 · Textes et blocs

| | |
|---|---|
| **Éléments** | Paragraphes, listes, lignes de parcours, étapes de méthode |
| **Déclencheur** | Haut de l'élément à 88 % de l'écran, une seule fois |
| **Mouvement** | Fondu + montée de `reveal-block`. Listes en cascade (`stagger-item`). Les étapes de la méthode : le numéro roule puis le texte suit. |
| **Durée** | 600ms `ease-out` |
| **Mobile** | Identique |
| **Animations réduites** | Tout visible |

### M-06 · Navigation

| | |
|---|---|
| **Barre** | Se cache en descendant (au-delà de 140px) : montée de 150 % + fondu, `duration-base`. Revient au moindre défilement vers le haut. Reste visible si un de ses éléments a le focus clavier. |
| **Point actif** | Apparaît par mise à l'échelle 0 → 1 (`duration-fast`) sur la page en cours |
| **Survol des liens** | Fond `surface-sunken`, `duration-fast` |
| **Menu mobile** | Le bouton ☰ pivote en ×. Le panneau descend de 8px avec un fondu et une légère mise à l'échelle (0,96 → 1), `duration-base` ; les liens suivent en cascade (40ms). Fermeture plus rapide (`duration-fast`). Le défilement de la page est bloqué tant que le menu est ouvert. |
| **Animations réduites** | Barre toujours visible, menu sans mouvement |

### M-07 · Transitions de page

| | |
|---|---|
| **Déclencheur** | Clic sur un lien interne (hors changement de langue) |
| **Mouvement** | Un rideau `ink` monte du bas et couvre l'écran (`clip-path`). Au centre s'affiche la route de destination en police `data` (ex. `/projets/retrouve-moi`). La nouvelle page se charge, puis le rideau continue vers le haut et la découvre. L'entrée de la nouvelle page (version courte de M-02 : titre + fiche) démarre pendant la sortie. |
| **Durée** | Entrée du rideau 550ms, sortie 650ms, `ease-in-out`. **Total ≈ 1,2 s** |
| **Boutons Précédent / Suivant du navigateur** | Pas de rideau : fondu croisé `duration-fast`, pour rester réactif |
| **Mobile** | Rideau plus court : 400ms + 500ms |
| **Animations réduites** | Fondu de 150ms |

### M-07b · Projet suivant

| | |
|---|---|
| **Déclencheur** | Clic sur le bloc « Projet suivant » en bas d'une étude de cas (ordinateur) |
| **Mouvement** | Le bloc s'agrandit jusqu'à couvrir l'écran (`clip-path` depuis son rectangle), puis devient l'en-tête de l'étude de cas suivante. Donne l'impression de feuilleter les projets. |
| **Durée** | `duration-slow`, `ease-in-out` |
| **Mobile / animations réduites** | Comportement de M-07 |

### M-08 · Défilement doux

| | |
|---|---|
| **Comportement** | Défilement à la molette lissé (interpolation 0,1, proche d'aquidev à 0,085). Les liens d'ancre défilent en douceur en tenant compte de la barre. Le défilement est mis en pause quand le menu ou une galerie plein écran est ouvert. |
| **Clavier** | Inchangé (Espace, Page suivante, flèches) |
| **Mobile (tactile)** | **Défilement natif**, aucun lissage |
| **Animations réduites** | Désactivé |

### M-09 · Parallaxe

Volontairement limitée à 4 éléments :

| Élément | Mouvement |
|---|---|
| Mots fantômes | Glissement horizontal ±4 % (voir M-04) |
| Image principale d'une étude de cas | L'image se déplace de 0 à -8 % dans son masque |
| Visuel incliné de l'accordéon Services | ±10px vertical |
| Signature géante du footer | Monte de 30 % à 0 pendant que le footer entre à l'écran |

Toutes liées au scroll, ordinateur uniquement (≥ 900px). Désactivées sur mobile et avec animations réduites.

### M-10 · Fiches projet et filtres

| | |
|---|---|
| **Apparition** | Fondu + montée de 32px, `stagger-item`, une fois, `duration-slow` |
| **Survol / focus** | L'image zoome à 104 % (`duration-slow`), le curseur affiche « voir » |
| **Filtrage** | Les fiches qui disparaissent rétrécissent légèrement et s'effacent (`duration-fast`, `ease-in`). Les fiches restantes glissent vers leur nouvelle place (`duration-slow`, `ease-out`). Les nouvelles apparaissent en cascade (40ms). La pastille noire glisse vers le filtre choisi (`duration-base`). Le compteur `{n} / {total}` roule. |
| **Mobile** | Identique, sans curseur |
| **Animations réduites** | Changement instantané |

### M-11 · Images et galeries

| | |
|---|---|
| **Révélation d'image** | Le cadre s'ouvre de bas en haut (`clip-path`) pendant que l'image dézoome de 112 % à 100 %. `duration-xslow`, `ease-out`, une fois. |
| **Chargement** | Une image chargée tardivement apparaît en fondu (400ms) sur les hachures de son emplacement, sans saut de mise en page |
| **Ouverture plein écran** | L'image grandit depuis sa vignette jusqu'au centre (`duration-slow`), le fond `ink` passe à 92 % d'opacité (`duration-base`) |
| **Navigation dans la galerie** | Fondu croisé + décalage de 20px (350ms). Flèches, touches ← →, glisser sur mobile, Échap pour fermer |
| **Fermeture** | Inverse de l'ouverture, 450ms |
| **Animations réduites** | Images visibles directement, ouverture et fermeture en fondu de 150ms |

### M-12 · Curseur personnalisé

| | |
|---|---|
| **Condition** | Pointeur fin uniquement (souris, trackpad) |
| **Comportement** | Le curseur système reste visible partout, **sauf** sur les zones désignées (fiches projet, pile portrait, accordéon, boutons d'appel) où il est remplacé par un disque `marker` de 74px avec une étiquette (« voir », « glisser », « ouvrir », « lire »). |
| **Mouvement** | Le disque apparaît par mise à l'échelle 0 → 1 (350ms `ease-out`) et suit le pointeur avec un léger retard (interpolation 0,2). Quand l'étiquette change, le texte roule. Il disparaît en `duration-fast`. |
| **Jamais** | Sur un champ de saisie, ni sur du texte à sélectionner |
| **Tactile / animations réduites** | Désactivé, curseur système partout |

### M-13 · Boutons

| | |
|---|---|
| **Texte qui roule** | Au survol ou au focus, le libellé sort par le haut, sa copie entre par le bas, `duration-base` |
| **Flèche** | La flèche ↗ du disque jaune sort en diagonale et une nouvelle entre, `duration-base` |
| **Appui** | Mise à l'échelle 0,97, `duration-micro` |
| **Magnétique** | **Deux boutons seulement** : « Voir les projets » dans le Hero et le bouton rond du footer. Ils suivent 25 % de l'écart avec le pointeur, et reviennent en `duration-slow` `ease-out`, sans rebond. |
| **Mobile** | Appui uniquement, pas de magnétisme |
| **Animations réduites** | Pas de roulement ni de magnétisme ; seul l'appui reste |

### M-14 · Indicateurs de progression et accordéon

| | |
|---|---|
| **Progression de lecture** | Études de cas et articles : cercle en bas à droite dont le trait se remplit avec le scroll, pourcentage en `data`. Apparaît après 10 % de lecture (`duration-fast`). À 100 %, il devient « ↑ » (retour en haut). |
| **Sommaire** | Le point de l'intertitre en cours glisse d'une entrée à l'autre (`duration-base`) |
| **Accordéon** | Hauteur 0 → contenu (`duration-slow`), icône + tourne de 45° et passe en `marker` (`duration-base`), visuel incliné de -4° à -3° avec une légère montée |
| **Animations réduites** | Progression mise à jour sans transition, accordéon instantané |

### M-15 · Changement de langue

| | |
|---|---|
| **Déclencheur** | Bouton FR / EN |
| **Mouvement** | La page dans la nouvelle langue est révélée par **un cercle qui s'agrandit depuis le bouton** (`clip-path: circle(0 → 150%)`), comme la révélation circulaire d'aquidev |
| **Durée** | 700ms `ease-in-out` |
| **Navigateurs sans support** | Fondu croisé `duration-fast` |
| **Animations réduites** | Instantané |

### M-16 · Insights

| | |
|---|---|
| **Liste** | Comme M-10 : apparition des cartes, filtrage par catégorie avec réorganisation, barre de requête |
| **Article** | En-tête comme M-04, image principale comme M-11, progression et sommaire comme M-14. **Aucune animation dans le corps du texte** : la lecture prime. |

### M-17 · Footer

| | |
|---|---|
| **Déclencheur** | Haut du footer à 80 % de l'écran |
| **Mouvement** | La phrase d'appel sort ligne par ligne de son masque. Le bouton rond arrive par mise à l'échelle (0,6 → 1) et rotation (-20° → 0°), 200ms après. Les liens apparaissent en cascade (50ms). La signature géante monte avec le scroll (M-09). |
| **Copie de l'email** | Le libellé roule vers « Copié », puis revient après 2 s |
| **Mobile** | Sans montée liée au scroll |
| **Animations réduites** | Tout visible |

### M-18 · Animations en boucle

| Élément | Mouvement | Règles |
|---|---|---|
| Ruban technologies | Défilement continu, `duration-marquee`, `linear` | Pause au survol et au focus. Arrêté avec animations réduites |
| Badge rotatif | Rotation continue, `duration-spin` | Arrêté avec animations réduites |
| Point « Disponible » | Onde qui pulse toutes les 2,4 s | Arrêté avec animations réduites |

Les boucles sont en CSS pur (aucun coût JavaScript) et se mettent en pause quand l'onglet est caché.

### M-19 · Bandeau « Et votre projet ? »

| | |
|---|---|
| **Tuiles** | Survol : montée de 2px (`duration-base`). Sélection : le fond passe à `on-marker` et le texte à `marker` (`duration-fast`) |
| **Compteur de sélection** | Le texte roule à chaque changement |
| **Continuer** | Lance la transition M-07 vers Contact, formulaire pré-rempli |

---

## 4. Tableau des interactions

| Zone | Survol (ordinateur) | Clic / toucher | Clavier | Scroll |
|---|---|---|---|---|
| Barre de navigation | Fond des liens | Transition M-07 | Tab, Entrée | Se cache / revient (M-06) |
| Langue | — | Révélation circulaire (M-15) | Entrée | — |
| Hero | Cartes qui s'écartent, bouton magnétique | Pile qui défile (M-03) | ← → sur la pile | — |
| Ruban | Pause, nom de la techno | — | Focus = pause | — |
| Titres de section | — | — | — | Révélation + mot fantôme (M-04) |
| Fiches projet | Zoom image, curseur « voir » | Transition M-07 | Focus = survol | Apparition (M-10) |
| Filtres et requête | — | Réorganisation (M-10) | Tab, Entrée, saisie | — |
| Accordéon | Curseur « ouvrir » | Ouverture (M-14) | Entrée, Espace | Parallaxe du visuel |
| Bandeau jaune | Montée des tuiles | Sélection (M-19) | Entrée, Espace | — |
| Étude de cas | — | Galerie (M-11), projet suivant (M-07b) | ← → Échap dans la galerie | Progression, sommaire, parallaxe image |
| Footer | Bouton magnétique | Contact, copie email | Tab, Entrée | Signature qui monte |

---

## 5. Règles de déclenchement

1. **Visible sans JavaScript.** Le contenu est rendu visible par défaut. Les états de départ des animations (masqué, décalé) ne sont appliqués qu'une fois le script chargé. Si le script échoue, tout s'affiche au bout de 3 s au plus.
2. **Ce qui est visible au chargement ne dépend jamais du scroll.** Le Hero a sa propre séquence (M-02).
3. **Une apparition au scroll se joue une seule fois.**
4. **Pas plus de deux mouvements par élément** (ex. : apparition + survol).
5. **Les boucles s'arrêtent** hors écran, onglet caché ou animations réduites.
6. **Temps avant interaction** : 1,6 s maximum à la première visite (intro comprise), 0,6 s sur les pages suivantes. L'intro se passe à tout moment.
7. **Seules les propriétés `transform`, `opacity` et `clip-path` sont animées**, pour garder 60 images par seconde. Jamais `width`, `height`, `top` ou `left`.
8. **Animations réduites** (`prefers-reduced-motion: reduce`) : pas d'intro, pas de défilement doux, pas de parallaxe, pas de curseur, pas de boucles, pas de magnétisme. Les changements d'état restent visibles, en fondu de 150ms au plus.
9. **Tactile** : pas de curseur, pas de magnétisme, pas de parallaxe, défilement natif. Les interactions de glisser (pile, galerie) sont conservées.

---

## 6. Choix techniques

| Outil | Décision | Raison |
|---|---|---|
| **GSAP** (cœur) | ✅ Retenu | Séquences précises (intro, Hero, rideau) et contrôle fin des timings. C'est l'outil utilisé par aquidev, la référence la plus proche du rendu voulu. Gratuit, y compris ses extensions, depuis la version 3.13 (2025). |
| **ScrollTrigger** | ✅ Retenu | Apparitions au scroll, parallaxe, progression de lecture, mot fantôme. |
| **SplitText** | ✅ Retenu | Découpe des titres et paragraphes en lignes et en mots pour les sortir de leur masque, en gardant le texte accessible. |
| **Flip** (GSAP) | ✅ Retenu | Réorganisation des fiches au filtrage, ouverture de la galerie depuis la vignette. |
| **Lenis** | ✅ Retenu, ordinateur uniquement | Défilement doux à la molette, utilisé par aquidev et nameksociety. Natif au toucher. Léger. |
| **CSS** (transitions, keyframes) | ✅ Retenu | Micro-interactions (boutons, survols, accordéon) et boucles (ruban, badge, point). Pas de JavaScript nécessaire. |
| **API View Transitions** du navigateur | ✅ Retenu avec repli | Changement de langue (révélation circulaire) et transitions de page. Repli en fondu là où elle n'existe pas. L'intégration exacte dépend du framework choisi à l'étape « architecture technique ». |
| **Motion** (ex-Framer Motion) | ❌ Écarté | Ferait doublon avec GSAP : deux bibliothèques d'animation pour le même travail, c'est plus de poids et deux façons de faire. |
| **Three.js / WebGL** | ❌ Écarté | Aucun besoin de 3D. La trame 1 bit du portrait se génère en Canvas 2D ou côté serveur à l'import de la photo. |

**Poids** : GSAP, ScrollTrigger, SplitText, Flip et Lenis représentent environ 50 à 60 Ko compressés. Le cœur et SplitText sont chargés avec la page (le Hero en a besoin tout de suite) ; Flip et la galerie sont chargés seulement sur les pages qui les utilisent. Chiffres à mesurer à l'étape optimisation.

---

## 7. Architecture du motion design

```
motion/
├── tokens            Durées, courbes, décalages (lus depuis tokens.json du design system)
├── setup             Enregistrement des extensions GSAP, instance Lenis synchronisée avec ScrollTrigger
├── context           Fournit à toute l'app : animations réduites ? pointeur fin ? mobile ?
│                     (gsap.matchMedia, mis à jour en direct si l'utilisateur change de réglage)
├── presets           Une fonction par animation de la bibliothèque : reveal-mask, reveal-block,
│                     stagger-cards, image-reveal, parallax, magnetic, text-roll…
├── hooks             Accroches pour les composants : useReveal, useSplitReveal, useParallax,
│                     useMagnetic, useFlipFilter
├── intro             Contrôleur de l'intro (une fois par session, mesure du chargement réel)
├── transitions       Rideau de page, projet suivant, révélation circulaire de la langue
├── cursor            Composant curseur (monté uniquement avec un pointeur fin)
└── portrait-stack    Logique de la pile (clic, glisser, clavier)
```

Règles d'implémentation :
- Chaque composant déclare ses animations dans un **contexte GSAP**, nettoyé automatiquement au changement de page (aucune animation fantôme).
- Les composants **appellent un preset par son nom** et ne fixent jamais de durée ou de courbe en dur : tout vient des tokens.
- Les états « animations réduites », « tactile » et « ordinateur » sont gérés **à un seul endroit** (`context`), pas dans chaque composant.
- Les boucles et micro-interactions restent **en CSS** dans les composants du design system.

---

## 8. Ce qui change par rapport à la maquette 04b

| Élément | Maquette | Spécification |
|---|---|---|
| Intro | Bouton de démonstration, compteur simulé | Automatique une fois par session, compteur lié au chargement réel |
| Hero | Statique | Séquence d'entrée M-02 |
| Pile portrait | Clic et flèches | + glisser, clavier, écartement au survol, éventail à l'entrée |
| Titres | Statiques | Révélation masquée + compteur + mot fantôme mobile |
| Filtres | Les fiches disparaissent | Réorganisation animée (Flip) |
| Navigation entre pages | — | Rideau avec route de destination |
| Langue | — | Révélation circulaire |
| Bouton magnétique | Footer seulement | Footer + bouton principal du Hero |
