# Étape 1 — Analyse des trois sites de référence

> Livrable du **Prompt 01**. Aucune proposition de design pour le portfolio ici : uniquement l'analyse.
> Date de l'analyse : 6 novembre 2026.

## Méthode et niveau de preuve

Chaque affirmation est marquée selon sa source :

| Marque | Signification |
|---|---|
| **[Code]** | Vérifié dans le code public du site (HTML, CSS, JavaScript téléchargés). |
| **[Capture]** | Observé sur des captures d'écran prises avec Chrome (desktop 1440×900, mobile 390×844), à intervalles pendant l'intro puis au fil du défilement. |
| **[Hypothèse]** | Déduction probable, non vérifiée. |

**Limites :**
- Je n'ai pas vu les animations *en mouvement*. Les captures montrent des états figés. Les durées et courbes viennent du code, pas de l'observation.
- Les survols, les états du curseur et les transitions de page n'ont pas pu être déclenchés.
- Aquidev n'a pas pu être capturé en mobile (échec du navigateur automatisé). Sa partie responsive repose seulement sur le CSS.
- Le contenu d'aquidev est chargé depuis son API. Je ne l'ai pas interrogée : seul le rendu visible a été analysé.

**Point important sur la 3ᵉ référence :** l'URL `norman.perozzi.studio/projects/davideperozzi/` n'est pas le portfolio de Davide Perozzi (hors ligne, d'après la page elle-même). C'est **l'étude de cas publiée par Norman Dubois** (directeur artistique) sur ce projet. L'analyse porte donc sur deux choses : la page de Norman Dubois elle-même, qui est très travaillée, et les principes du site original qu'elle décrit.

---

## 1. aquidev.com — Aquilas Dev

### Fiche technique [Code]

- **Stack :** application React montée côté client (Vite, `<div id="root">` vide), routage `react-router`.
- **Contenu dynamique :** les textes arrivent par une API (`ContentContext`, commentaire dans le HTML). Les images passent par un service de redimensionnement `/api/img/{id}?w=960`. Temps réel via Socket.IO.
- **Admin intégré :** route `/admin/*` chargée à la demande (`AdminApp-*.js`, ~500 Ko). Sections annexes `/academy`, `/formations`, `/proposer-projet`.
- **Animation :** **GSAP** (avec ScrollTrigger, Flip et Observer présents dans le bundle) + **Lenis** pour le défilement doux (`lerp: 0.085`).
- **Polices :** Plus Jakarta Sans (texte), Instrument Serif italique (mots d'accent), Bricolage Grotesque (titres), JetBrains Mono (micro-labels).
- **Statistiques :** Umami auto-hébergé.

### Identité visuelle [Capture + Code]

- **Ambiance :** papier chaud et encre, très « produit/agence ». Fond crème `#fbfbf9` / `#ece8de`, encre `#1c1917`, orange vif comme accent, sections sombres `#1c1917` en contrepoint.
- **Grain :** un calque de bruit (`.grain`) anime légèrement la texture. Il est coupé avec reduced motion et sur écran tactile **[Code]**.
- **Hero :** composition en deux colonnes. À gauche, une phrase d'accroche (« Je développe *l'architecture tech* qui propulse votre *croissance* ») où les mots clés passent en **serif italique orange**. Dessous, des pastilles de chiffres et le CTA. À droite, une **pile de cartes de projets en 3D** (maquettes navigateur + mobile), parcourue au glisser avec des flèches et un label « GLISSER ».
- **Sections observées :** Hero/projets → bandeau d'icônes technos → témoignages (carte « glissable ») → grand bloc orange « Et le vôtre ? » avec une grille de types de projets (SaaS, Vitrine, Mobile, E-commerce, IA, Design) → bloc sombre réseaux sociaux (60k+, 13M+) avec carrousel photo → formations → footer.
- **Footer :** très fort. Énorme mot-signature « Aquilas Dev » avec logo, rangée d'icônes de contact, et un **gros bouton rond orange « Démarrer »**.
- **Éléments flottants :** bouton WhatsApp fixe en bas à droite. Barre de navigation centrée en pilule (Projets / Créateur / Formations).

### Animations et interactions

| Animation | Déclencheur | Comportement | Source |
|---|---|---|---|
| Intro / chargement | Arrivée sur la page | Écran crème vide, puis un petit trait orange (logo) apparaît vers 3,6 s avant l'affichage du site. Le détail du mouvement n'est pas visible. | [Capture] |
| Apparitions au scroll | Le haut de l'élément atteint 85-88 % de l'écran | Une seule fois (`once: true`). Courbe dominante `expo.out` (42 usages), puis `power2/3.out`. | [Code] |
| Textes et titres | Scroll | Classe `tp-reveal`. Montée depuis le bas sous masque (`yPercent`) avec `clip-path: inset(100% 0 0 0) → inset(0)`. | [Code] |
| Parallaxe | Scroll | Animations liées au scroll (`scrub: true`) sur 3 éléments, une section épinglée (`pin`). | [Code] |
| Révélation circulaire | Clic (thème ou transition) | `clip-path: circle(0% at x y) → circle(150%)` à partir du point cliqué. | [Code] — déclencheur exact = [Hypothèse] |
| Curseur | Mouvement de souris | Point blanc 12 px en `mix-blend-mode: difference`, plus une étiquette contextuelle (« GLISSER », « VOIR ») dans une bulle orange. | [Code + Capture] |
| Boutons | Survol | Remplissage animé (`.btn-fill:before`) et texte qui « roule » (`.roll-inner`), coupés avec reduced motion. | [Code] |
| Navigation | Scroll | Les éléments du header glissent vers le haut (`yPercent: -100`, 0,5 s, `power3.out`) quand on descend et reviennent quand on remonte. | [Code] |
| CTA alternés | Changement de contexte | Les boutons de CTA se remplacent par un glissement vertical (sortie `power3.in`, entrée `expo.out` 0,7 s, décalage 0,18 s). | [Code] |

### Responsive [Code uniquement]
- Le grain est désactivé sur écran tactile (`pointer: coarse`).
- Un espace est réservé pour un dock en bas d'écran (`--dock-space`). [Hypothèse] : la navigation passe en bas sur mobile.

### Points forts
- **Hiérarchie typographique expressive :** le mélange sans-serif + serif italique sur les mots clés est mémorable sans être difficile à lire.
- **Orienté conversion :** CTA visibles partout, grille de types de projets, WhatsApp.
- **Système d'animation cohérent :** presque tout en `expo.out`, déclenché une seule fois. Rien ne clignote.
- **Architecture proche de ton besoin :** contenu servi par API et admin intégré. C'est exactement ton cas d'usage.

### Limites
- **Pas de rendu serveur :** sans JavaScript, la page est vide, ce qui pénalise le référencement (SEO) et le premier affichage. L'intro dure environ 3-4 s avant que le contenu apparaisse.
- **Identité de « créateur de contenu / agence » :** chiffres d'audience, formations, WhatsApp. Ça ne colle pas à un profil ingénieur logiciel / data.
- **Bundle lourd :** environ 670 Ko de JS pour la page d'accueil.

### À réinterpréter
- L'accent serif italique sur les mots clés d'une phrase.
- Le footer comme moment fort : signature géante et CTA rond.
- Le curseur à étiquette contextuelle.
- La révélation circulaire au point de clic.
- La navigation qui se cache au scroll vers le bas.

---

## 2. jk.nameksociety.com — Julien Kolou, « le CodeurAuChapeau »

### Fiche technique [Code]
- **Stack :** Next.js (signature de version `16.3.4`, build Turbopack), avec rendu serveur : le HTML arrive déjà rempli de texte.
- **Animation :** **Motion** (anciennement Framer Motion : `AnimatePresence`, `layoutId`, `whileInView`, `whileHover`, `useSpring`) + **Lenis**. Pas de GSAP.
- **Courbe dominante :** `cubic-bezier(.16, 1, .3, 1)` (type expo-out). Ressorts nombreux (raideur 100-260, amortissement 10-20).
- **Polices :** Poppins (titres), Manrope (texte), JetBrains Mono (micro-labels).
- **Couleurs :** encre `#151515`, papier `#fff`, brume `#f5f5f4`, accent terracotta `#d9653b`, vert « OK » `#3fb56b`.
- **Reduced motion :** pris en compte (4 occurrences).

### Identité visuelle [Capture]
- **Ambiance :** studio éditorial monochrome sur un **fond gris nuageux** (photo floutée). Les sections sont des **cartes blanches ou noires aux coins arrondis**, avec un liseré intérieur, comme des écrans posés sur une table.
- **Hero :** nom géant « JULIEN » en **contour** et « KOLOU » en **plein**, sur toute la largeur. **Portrait détouré noir et blanc** qui passe devant le nom. **Badge circulaire avec texte rotatif** (« le codeur au chapeau »). En bas à gauche : surnom en mono, titre et CTA « Collaborons ». À droite : pilules réseaux sociaux. En haut : pastille verte « Disponible pour de nouveaux projets ».
- **Titres de section :** préfixe slash (« /PROJETS CHOISIS », « /SERVICES ») en majuscules serrées, avec un **titre fantôme** géant et très pâle derrière (« PORTFOLIO », « EXPÉRIENCE »).
- **Navigation :** en haut, des liens avec compteurs (« Projets [7] », « Services [4] »). Au scroll, elle devient une **pilule flottante sombre** centrée avec le logo chapeau et un bouton « RDV ».
- **Bandeau défilant :** technologies en majuscules séparées par le logo chapeau, sur une bande noire inclinée.
- **Projets :** grille 2 colonnes de cartes (capture, badge « Projet réel », titre, description, tags), avec un **filtre à pastilles** (Tous / Projets réels / Explorations). La pastille active glisse grâce à `layoutId` **[Code]**.
- **Services :** liste en accordéon. L'élément ouvert devient une carte sombre avec description, bouton ×, et une **capture inclinée qui flotte** au-dessus.
- **Expérience :** liste en lignes (entreprise / poste / dates) sur une carte sombre.
- **Section ludique « Le défi » :** mini-jeu « Are you better than the developer? » (réparer 6 bugs), avec **classement** et texte « glitch ». Différenciant fort.
- **Rendez-vous :** calendrier de réservation intégré.
- **Footer :** « UN PROJET EN TÊTE ? », deux CTA et une rangée de pilules réseaux.

### Animations et interactions

| Animation | Déclencheur | Comportement | Source |
|---|---|---|---|
| Préloader | Chargement | Fond noir. Logo chapeau orange au centre. Le mot de salut **change en boucle** (Bonjour → Hello → Hola → Ciao → Salut). Compteur géant 0 → 100 en bas à droite (18vw, gris très sombre) et fine barre orange en bas. Durée totale ≈ 3,5 s. | [Capture + Code] |
| Sortie du préloader | Compteur à 100 | Le panneau noir **remonte** et découvre le Hero (capture à 3,6 s : bande noire en haut, Hero en dessous). | [Capture] |
| Révélation des titres | Entrée dans l'écran | `clip-path: inset(0 0 100% 0) → inset(0 0 0% 0)` (masque qui s'ouvre de bas en haut). | [Code] |
| Filtre de projets | Clic sur une pastille | Fond de pastille partagé qui glisse (`layoutId`). Cartes entrantes et sortantes via `AnimatePresence`. | [Code] |
| Curseur | Souris (desktop) | Curseur natif masqué sur les cartes de projet (`md:cursor-none`), remplacé par un suiveur à ressort (`useSpring`). Son apparence exacte n'est pas observée. | [Code] / [Hypothèse] |
| Accordéon services | Clic / survol | Ouverture de la ligne en carte sombre et apparition d'une capture inclinée. | [Capture] |
| Bandeau technos | Permanent | `@keyframes marquee` en boucle. | [Code] |
| Glitch | Permanent sur le titre du défi | `@keyframes glitch-a/b`. | [Code] |
| Disponibilité | Permanent | Point vert pulsant (`pulse-dot`). | [Code] |

### Responsive [Capture mobile]
- Le nom reste sur une ligne en réduisant (contour + plein conservés). Le portrait passe au centre en grand. Le titre et le CTA descendent sous le portrait.
- Bouton menu rond (☰) en haut à droite. Au scroll, la **pilule de navigation flottante** reste visible avec les liens défilables horizontalement.
- Projets en 1 colonne. Les cartes conservent les tags.
- Les cartes de section gardent leurs coins arrondis avec une marge réduite.

### Points forts
- **Rendu serveur :** contenu immédiatement lisible et bien référencé.
- **Hero très identitaire :** jeu contour/plein, portrait détouré, badge rotatif.
- **Système de titres** (slash + fantôme) reconnaissable et réutilisable.
- **Interactions utiles :** filtres, accordéon, prise de rendez-vous.
- **Le défi :** une interaction qui *démontre* la compétence au lieu de l'affirmer.

### Limites
- **Accumulation :** préloader + bandeau + glitch + défi + calendrier. La page est longue (≈ 8 400 px).
- **Le fond nuageux** et les cartes encadrées donnent une sensation de « maquette » plus que d'interface.
- Un élément d'expérience affiche « - » comme nom d'entreprise : un contenu vide mal géré.

### À réinterpréter
- Le jeu typographique contour/plein du nom.
- Le portrait détouré qui interagit avec la typographie.
- Les titres numérotés ou préfixés avec un titre fantôme.
- Le filtre avec pastille partagée.
- La navigation qui devient une pilule flottante.
- **L'idée d'une interaction qui prouve une compétence** (pour toi : données plutôt que bugs).

---

## 3. norman.perozzi.studio — Étude de cas « Davide Perozzi » par Norman Dubois

### Fiche technique [Code]
- **Stack :** site statique sur mesure, sans framework. Un seul `dist/index.js` d'environ 97 Ko.
- **Défilement doux maison :** interpolation (lerp) avec un amortissement plus fort sur mobile (`mobileDamping: 0.18`) et un seuil de précision. Pas de Lenis.
- **WebGL :** `<canvas class="wglctx">` plein écran au-dessus de la page (`pointer-events: none`). Le shader utilise du **bruit simplex** avec les paramètres `center`, `velocity`, `radius`, `noiseScale`, `lethargy` et une texture d'image optionnelle (`useImage`). [Hypothèse forte] : ce sont les **taches rouges organiques** qui suivent la vitesse du curseur ou du scroll et qui servent aussi à révéler des images au survol (`data-hover-image`).
- **Transitions de page :** navigation sans rechargement (`fetch` + `history.pushState` + `popstate`), lien « projet suivant » (`data-nextproject`).
- **Préloader :** précharge réellement une liste d'images (`data-images`) et affiche le pourcentage.
- **Polices (licences payantes) :** Kommissar Condensed Ultra, Le Murmure, Prophet Thin, Scto Grotesk A.
- **Couleurs :** gris clair `#e1e1e1`, noir, blanc, rouge `#db3b3b`.
- **Reduced motion :** aucune prise en compte trouvée.

### Identité visuelle [Capture]
- **Ambiance :** affiche typographique suisse et brutaliste. Fond gris clair légèrement bruité, **titres ultra-condensés énormes** qui débordent du cadre, une seule couleur d'accent (rouge) en **disques pleins** derrière les titres.
- **Hero :** « DAVIDE PEROZZI 2019 » sur deux lignes qui débordent de l'écran. Une image (carte de visite en lévitation) **chevauche** le titre. Légende et description en petit, à droite.
- **Header :** filet fin, nom à gauche, au centre un **slogan qui change** (« Type addict », « Creative Director at Dorfjungs », « Awwwards Judge », « Gym lover »…), « Info » à droite.
- **Mise en page :** grille de 36 colonnes avec ligne de base de 18 px (d'après le texte de la page). Beaucoup de vide. Textes courts en colonnes étroites.
- **Système typographique présenté comme contenu :** des cartes noires « Typography System 01 / 02 » montrent les alphabets.
- **Fin de page :** « technical. modern. bold. » sur fond noir texturé, puis lien vers le projet suivant avec un nom espacé (« k i k o v i »).
- **Footer :** minimal (Behance, Dribbble, mentions légales).

### Animations et interactions

| Animation | Déclencheur | Comportement | Source |
|---|---|---|---|
| Préloader | Chargement | Compteur de pourcentage au centre en police condensée (0 % → 17 % → 100 %) lié au préchargement réel des images. À 100 %, un **carré noir** apparaît au centre (le motif « curseur de ligne de commande ») avant d'ouvrir la page. | [Capture + Code] |
| Curseur | Souris | Composé de deux cercles (intérieur + extérieur) et d'une flèche SVG : **anneau rouge avec point central** dans les captures. Il change d'état sur les liens (flèche) et sur certains éléments (« CLICK & HOLD » visible sur une vidéo intégrée). Il est masqué par défaut et révélé par JS (donc absent sur tactile). | [Code + Capture] |
| Progression du scroll | Scroll | Cercle fixe en bas à droite avec le **pourcentage lu** (0 % → 47 %…) en `mix-blend-mode: difference`. Il devient « x » pour fermer et revenir. | [Code + Capture] |
| Taches WebGL | Souris ou scroll | Disques rouges déformés par du bruit, qui réagissent à la vitesse. | [Code] / comportement = [Hypothèse] |
| Parallaxe | Scroll | Attributs `data-parallax`, `data-direction`, `data-offset`, `data-delay`. | [Code] |
| Transition de page | Clic sur un lien interne | Chargement en arrière-plan + changement d'URL sans rechargement complet. L'animation visuelle n'est pas observée. | [Code] |
| Slogan du header | Scroll (probable) | Le texte central change selon la position de lecture. | [Capture] (valeurs différentes selon les captures) / déclencheur = [Hypothèse] |

### Responsive [Capture mobile]
- Les titres condensés **débordent volontairement** et restent énormes.
- Le texte passe en une colonne pleine largeur. Les disques rouges sont conservés derrière les titres.
- Header réduit à « NORMAN DUBOIS / INFO ».
- Le défilement doux est conservé avec un amortissement plus fort sur mobile **[Code]**.

### Points forts
- **Identité la plus forte et la plus « auteur » des trois :** une couleur, deux familles typographiques, un motif (rectangle/curseur).
- **Le motif tiré du métier** (curseur de terminal) est utilisé de façon abstraite, sans cliché.
- **Très léger** (97 Ko de JS) malgré le WebGL.
- **Progression de lecture** en pourcentage, élégante et utile.
- **Navigation « projet suivant »** qui pousse à continuer la visite.

### Limites
- **Aucune gestion de reduced motion.**
- **Textes de corps très fins et gris clair** sur gris : contraste insuffisant (accessibilité).
- **Polices payantes.**
- **Le curseur personnalisé masque la souris système** : risque de confusion.
- Le défilement doux maison peut entrer en conflit avec la navigation au clavier.

### À réinterpréter
- La typographie-affiche qui déborde et le chevauchement texte/image.
- Une seule couleur d'accent utilisée en formes pleines.
- **Un motif graphique tiré du métier** (pour toi : la donnée, le pipeline, le cloud, plutôt que le terminal).
- La progression de lecture en pourcentage.
- Le préloader qui charge réellement quelque chose.
- Le lien « projet suivant ».

---

## Tableau comparatif

| Critère | aquidev | nameksociety | Norman Dubois / Perozzi |
|---|---|---|---|
| **Personnalité** | Agence / créateur, chaleureux, commercial | Studio éditorial, ludique, « preuve par l'action » | Affiche typographique, radicale, auteur |
| **Fond / couleurs** | Crème + encre + orange, sections sombres | Blanc/noir sur gris nuageux, accent terracotta | Gris clair + noir, accent rouge unique |
| **Typographie** | Sans + **serif italique d'accent** + mono | Sans géométrique, contour/plein, mono | **Ultra-condensée** + grotesque fine |
| **Hero** | Phrase + pile de projets 3D | Nom géant + portrait détouré + badge rotatif | Titre qui déborde + image en chevauchement |
| **Préloader** | Écran vide + logo (≈ 3,6 s) | Salutations multilingues + compteur 0-100 | % réel de préchargement + carré noir |
| **Curseur** | Point « difference » + étiquette contextuelle | Suiveur à ressort sur les cartes | Anneau + point, états flèche / « click & hold » |
| **Scroll** | Lenis + GSAP ScrollTrigger | Lenis + Motion `whileInView` | Lerp maison + parallaxe par attributs |
| **WebGL** | Non | Non (une trace marginale) | **Oui** : taches à bruit simplex |
| **Transitions de page** | SPA (React Router) | Next.js | Navigation sans rechargement (fetch + pushState) |
| **Navigation** | Pilule centrée, se cache au scroll | Liens avec compteurs → pilule flottante | Header filaire + slogan changeant |
| **Footer** | **Signature géante + CTA rond** | Grand CTA + pilules | Minimal + « projet suivant » |
| **Rendu serveur / SEO** | ✗ (page vide sans JS) | ✓ | ✓ (HTML statique) |
| **Reduced motion** | ✓ | ✓ | ✗ |
| **Poids JS (accueil)** | ≈ 670 Ko | ≈ 790 Ko (tous fichiers) | ≈ 97 Ko |
| **Contenu géré par API / admin** | ✓ (`/admin`) | Non vérifié | ✗ |
| **Point le plus réutilisable** | Accent serif italique, footer signature | Titres slash/fantôme, interaction-preuve | Motif métier, typo-affiche, % de lecture |

---

## Ce que je ne peux pas confirmer sans vidéo

Pour décrire ces animations précisément (durée réelle, ordre, sensation), une courte capture vidéo de ta part serait utile. Une captation d'écran de 10-20 s par élément suffit :

1. **aquidev** : l'intro complète et le glisser de la pile de projets du Hero.
2. **aquidev** : un clic qui déclenche la révélation circulaire (probablement le changement de thème).
3. **nameksociety** : le survol d'une carte de projet (forme du curseur) et l'ouverture d'un service.
4. **Norman Dubois** : le curseur sur un lien et sur une image, les taches rouges en bougeant la souris, et le clic sur « projet suivant » (transition de page).

Sans ces vidéos, l'étape 2 (synthèse) peut quand même avancer. Les points concernés resteront marqués comme hypothèses.
