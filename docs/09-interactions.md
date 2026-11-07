# Étape 9 — Interactions avancées

> Livrable du **Prompt 09**. Comportement précis des interactions qui donnent sa personnalité au site, et les conditions dans lesquelles elles se désactivent.
> Les durées et courbes viennent de [08-motion.md](08-motion.md). Les composants viennent du [design system](design-system/project/README.md).
> Règle générale : **tout fonctionne au clavier, au toucher et à la souris**. Une interaction « décorative » qui gêne la lecture ou la navigation est retirée.

---

## 0. Synthèse

| # | Interaction | Retenue ? | Où |
|---|---|---|---|
| I-01 | Curseur à étiquette contextuelle | ✅ | Ordinateur, zones désignées |
| I-02 | Boutons magnétiques | ✅ limité à 2 | Hero, footer |
| I-03 | Aperçu des projets au survol (vue tableau) | ✅ **nouveau** | Page Projets, ordinateur |
| I-04 | Fiches projet interactives | ✅ | Accueil, Projets |
| I-05 | Pile portrait | ✅ | Hero |
| I-06 | Barre de requête + raccourci `/` | ✅ **nouveau** | Projets, Insights |
| I-07 | Navigation et transitions de page | ✅ | Partout |
| I-08 | Navigation entre études de cas | ✅ | Études de cas |
| I-09 | Menu mobile | ✅ | < 900px |
| I-10 | Changement de langue | ✅ | Partout |
| I-11 | Mode clair / sombre | ✅ **à valider** | Partout |
| I-12 | Effets de profondeur | ⚠️ très limités | Pile portrait, cartes inclinées |
| I-13 | Galerie plein écran | ✅ | Études de cas, articles |
| I-14 | Formulaire de contact adaptatif | ✅ | Contact |
| I-15 | Interactions du footer | ✅ | Partout |
| — | Inclinaison 3D des cartes au survol | ❌ | Effet gadget, gêne la lecture |
| — | Son, vibration | ❌ | Intrusif |
| — | Défilement horizontal forcé | ❌ | Casse la navigation au clavier et au trackpad |

---

## I-01 · Curseur à étiquette contextuelle

- **Utile ?** Oui. Il annonce l'action (« voir », « glisser », « ouvrir ») et donne de la personnalité, comme chez aquidev.
- **Comportement :** le curseur système reste partout. Sur une zone qui porte `data-cursor`, il est masqué et un disque `marker` de 74px avec l'étiquette le remplace et suit le pointeur avec un léger retard.

| Zone | Étiquette FR / EN |
|---|---|
| Fiche projet, ligne du tableau | voir / view |
| Pile portrait | glisser / drag |
| Ligne d'accordéon | ouvrir / open |
| Carte d'article | lire / read |
| Bouton rond du footer, bandeau jaune « Continuer » | go |
| Image de galerie | agrandir / zoom |

- **Règles :** jamais sur un champ de saisie, un texte sélectionnable ou un lien inline dans un paragraphe. Le texte réel du lien reste l'étiquette accessible : le disque est `aria-hidden`.
- **Désactivé :** écran tactile ou pointeur grossier, animations réduites, fenêtre < 900px, et dès que le pointeur sort de la fenêtre.

## I-02 · Boutons magnétiques

- **Utile ?** Oui, mais seulement sur les **deux appels à l'action majeurs** : « Voir les projets » (Hero) et le bouton rond « Démarrer » (footer). Plus, ce serait du bruit.
- **Comportement :** dans un rayon de 1,5 × la taille du bouton, il se décale de 25 % de l'écart avec le pointeur (le libellé, 35 %, pour un effet de profondeur). Retour en douceur à la sortie, sans rebond.
- **Clavier :** aucun déplacement au focus, juste l'anneau de focus.
- **Désactivé :** tactile, animations réduites, < 900px.

## I-03 · Aperçu des projets au survol — vue tableau *(nouveau)*

- **Utile ?** Oui, sur la page Projets. Il renforce l'idée « Index » (les projets comme un tableau de données) et reprend l'aperçu d'image au survol de la page de Norman Dubois. Il permet aussi de parcourir vite la liste quand il y aura plus de projets.
- **Comportement :**
  - Un sélecteur **grille / tableau** à côté des filtres (choix mémorisé dans le navigateur).
  - **Vue tableau** : une ligne par projet, colonnes `id · projet · domaines · stack · période`.
  - Au survol d'une ligne, l'image de couverture du projet apparaît près du pointeur (240 × 150px, coins `radius-md`), suit le pointeur avec retard et change en fondu quand on passe d'une ligne à l'autre. La ligne survolée prend un fond `marker`.
  - **Au clavier**, l'aperçu s'affiche à droite de la ligne qui a le focus.
- **Sans image :** pas d'aperçu, la ligne reste surlignée.
- **Désactivé :** tactile et < 900px (la vue tableau est alors masquée, seule la grille reste). Animations réduites : l'aperçu s'affiche sans suivre le pointeur.

## I-04 · Fiches projet interactives

- **Comportement :** toute la fiche est **un seul lien** vers l'étude de cas, avec un titre accessible clair (pas de lien imbriqué). Au survol ou au focus : zoom de l'image, curseur « voir ».
- **Liens secondaires** (démo, code) : uniquement dans l'étude de cas, jamais dans la fiche, pour éviter les liens imbriqués.
- **Tactile :** un appui ouvre l'étude de cas. Aucun état « survol » nécessaire pour comprendre la fiche.

## I-05 · Pile portrait

- **Comportement :** voir [M-03](08-motion.md). Trois moyens de la faire défiler : clic, glisser, flèches.
- **Clavier :** la pile est un groupe focalisable (`role="group"`, description « carrousel »). Flèches ← → pour changer de carte, Entrée pour passer à la suivante. Les boutons ← → sont aussi dans l'ordre de tabulation.
- **Lecteur d'écran :** les cartes de derrière sont `aria-hidden`. L'étiquette sous la pile (« portrait », « vue données », « fiche profil ») est annoncée à chaque changement. La photo a un texte alternatif saisi dans l'admin.
- **Tactile :** glisser horizontal (seuil 40px). Le défilement vertical de la page n'est jamais bloqué : on ne capture que les gestes clairement horizontaux.
- **Désactivé :** rien. Seule l'animation devient instantanée avec animations réduites.

## I-06 · Barre de requête et raccourci `/` *(nouveau)*

- **Utile ?** Oui. La touche `/` qui place le curseur dans la recherche est une convention connue des développeurs (GitHub, de nombreux outils), ce qui colle à ton profil et au concept Index.
- **Comportement :**
  - `/` (hors champ de saisie) : focus sur la barre de requête de la page (Projets, Insights). Une pastille `/` est affichée dans la barre pour l'indiquer.
  - Saisie : filtrage immédiat (après 120ms sans frappe), résultat annoncé (« 2 / 5 enregistrements »).
  - `Échap` : vide la barre, puis retire le focus au second appui.
  - La recherche et les filtres sont reflétés dans l'URL (`?q=flutter&domaine=mobile`) pour pouvoir partager un lien filtré.
- **Désactivé :** le raccourci n'existe que sur les pages qui ont une barre de requête.

## I-07 · Navigation et transitions de page

- **Barre :** voir [M-06](08-motion.md). Le point jaune indique la page en cours (`aria-current="page"`).
- **Transitions :** rideau avec la route de destination ([M-07](08-motion.md)).
- **Règles :**
  - Le **focus clavier** est placé sur le titre principal de la nouvelle page à l'arrivée, et le titre est annoncé aux lecteurs d'écran.
  - La **position de scroll** est restaurée avec Précédent / Suivant, et remise en haut pour une nouvelle page.
  - Un lien ouvert dans un nouvel onglet (Ctrl / Cmd + clic, clic molette) **ne déclenche pas** le rideau.
  - Un **lien d'évitement** « Aller au contenu » est le premier élément tabulable de chaque page.
- **Désactivé :** rideau remplacé par un fondu avec animations réduites et pour les boutons Précédent / Suivant.

## I-08 · Navigation entre études de cas

- **Sommaire latéral** (ordinateur) : liste des sections présentes (celles qui sont vides sont absentes), section en cours marquée, clic = défilement doux vers la section. Sur mobile : sommaire repliable en haut de page.
- **Progression de lecture** ([M-14](08-motion.md)) : cliquable à 100 % pour revenir en haut.
- **Fin de page :** bloc « Projet suivant » (boucle : le dernier mène au premier) avec effet [M-07b](08-motion.md), et lien « Retour aux projets » qui restaure les filtres précédents.
- **Clavier :** les liens précédent / suivant sont de vrais liens, accessibles par Tab. Pas de raccourci clavier global, pour ne pas entrer en conflit avec les lecteurs d'écran.

## I-09 · Menu mobile

- **Déclencheur :** bouton rond `ink` ☰ (< 900px).
- **Ouverture :** panneau sous la barre ([M-06](08-motion.md)), avec les 5 liens, le statut de disponibilité et la langue.
- **Règles d'accessibilité :**
  - Le bouton porte `aria-expanded` et `aria-controls`. Son libellé passe de « Menu » à « Fermer le menu ».
  - À l'ouverture, le focus va sur le premier lien. Le focus **reste piégé** dans le menu tant qu'il est ouvert.
  - Fermeture : bouton ×, touche Échap, clic en dehors, ou choix d'un lien. Le focus revient sur le bouton.
  - Le défilement de la page est bloqué pendant que le menu est ouvert.
- **Au-delà de 900px :** si la fenêtre s'agrandit pendant que le menu est ouvert, il se ferme.

## I-10 · Changement de langue

- **Comportement :**
  - Ouvre **la même page** dans l'autre langue, avec la révélation circulaire ([M-15](08-motion.md)).
  - Conserve la **section en cours** : si tu es sur /SERVICES en français, tu arrives sur /SERVICES en anglais.
  - Conserve **la recherche et les filtres** de la page Projets ou Insights.
  - Mémorise le choix (cookie `lang`, 1 an).
  - Article sans traduction : arrivée sur la liste Insights de l'autre langue, avec le message prévu dans les contenus.
- **Accessibilité :** les boutons portent `lang="fr"` / `lang="en"` et `aria-pressed`. L'attribut `lang` de la page change.
- **Désactivé :** la révélation circulaire laisse place à un fondu (navigateur sans support, animations réduites).

## I-11 · Mode clair / sombre *(à valider)*

- **Utile ?** Oui, à condition de ne rien imposer. Le design system a déjà les deux thèmes (Papier et Encre), avec des contrastes vérifiés.
- **Proposition :**
  - **Par défaut :** le thème suit le réglage de l'appareil du visiteur.
  - Un petit **bouton rond** (icône soleil / lune) à droite de la langue dans la barre, et dans le menu mobile.
  - Basculer déclenche la même **révélation circulaire** depuis le bouton (comme aquidev).
  - Le choix est mémorisé dans le navigateur. Le thème est appliqué **avant l'affichage** de la page, pour éviter un flash de la mauvaise couleur.
- **Accessibilité :** `aria-pressed` + libellé « Activer le thème sombre » / « Activer le thème clair ».
- **Alternative :** pas de bouton, le thème suit uniquement l'appareil. Plus simple, mais moins de contrôle pour le visiteur.

## I-12 · Effets de profondeur

- **Retenus (discrets) :**
  - **Pile portrait :** ombres décalées, écartement des cartes au survol.
  - **Visuel incliné de l'accordéon :** ombre portée et légère parallaxe.
  - **Bouton magnétique :** le libellé bouge un peu plus que le bouton.
- **Écartés :** inclinaison 3D des cartes qui suit la souris, parallaxe sur plusieurs couches, effets de verre dépoli. Ils gênent la lecture et ressemblent à des modèles génériques.
- **Désactivés :** tactile et animations réduites (les ombres restent, les mouvements disparaissent).

## I-13 · Galerie plein écran

- **Déclencheur :** clic ou Entrée sur une image de galerie (étude de cas, article).
- **Comportement :** ouverture depuis la vignette ([M-11](08-motion.md)), légende et compteur `3 / 8`, flèches précédent / suivant, glisser sur mobile, pincer pour zoomer sur mobile.
- **Accessibilité :** fenêtre modale (`role="dialog"`, `aria-modal`), focus piégé, Échap pour fermer, focus rendu à la vignette d'origine. Chaque image a un texte alternatif saisi dans l'admin.
- **Défilement :** bloqué pendant l'ouverture (défilement doux mis en pause).

## I-14 · Formulaire de contact adaptatif

- **Profil :** trois boutons (Recruteur · Client · Autre) en contrôle segmenté, avec la même pastille glissante que les filtres. Le choix affiche ou masque les champs prévus dans les contenus, avec une transition de hauteur.
- **Pré-remplissage :** les tuiles choisies dans le bandeau jaune arrivent sélectionnées (paramètre d'URL `?types=web,mobile`) et le profil est réglé sur « Client ».
- **Validation :** à la sortie de chaque champ, puis à l'envoi. Message d'erreur sous le champ, relié par `aria-describedby`. À l'envoi, le focus va sur la première erreur. Le contenu saisi n'est jamais perdu en cas d'erreur.
- **Envoi :** le bouton passe à « Envoi… » et se désactive. En cas de succès, le formulaire est remplacé par le message de confirmation, qui reçoit le focus.
- **Brouillon :** le message en cours est gardé dans le navigateur si la page est quittée par erreur, et effacé après envoi.
- **Sécurité côté interface :** champ piège invisible pour les robots. La vraie protection (limitation des envois, validation) est faite par le serveur, voir le projet admin.

## I-15 · Interactions du footer

| Élément | Comportement |
|---|---|
| Bouton rond « Démarrer » | Magnétique (I-02), transition vers Contact |
| Email | Affiché en texte. Bouton « Copier l'email » : copie dans le presse-papiers, libellé « Copié » pendant 2 s, annoncé aux lecteurs d'écran. Si la copie est refusée, l'adresse est sélectionnée pour une copie manuelle. |
| Liens réseaux | Ouvrent dans un nouvel onglet, avec la mention « (nouvel onglet) » pour les lecteurs d'écran |
| CV | Télécharge le PDF dans la langue de la page |
| Signature géante | Au survol, le prénom passe en plein et le nom en contour (inversion, `duration-base`). Purement décoratif, `aria-hidden`. Désactivé au tactile et avec animations réduites. |
| Retour en haut | Lien « ↑ » en fin de footer, défilement doux vers le haut, focus sur le lien d'évitement |

---

## Matrice de désactivation

| Interaction | Tactile | < 900px | Animations réduites | Clavier |
|---|---|---|---|---|
| Curseur à étiquette | ❌ | ❌ | ❌ | non concerné |
| Magnétisme | ❌ | ❌ | ❌ | focus visible seulement |
| Aperçu au survol (tableau) | ❌ (vue masquée) | ❌ | sans suivi du pointeur | aperçu à côté de la ligne |
| Pile portrait | ✅ glisser | ✅ | instantanée | ✅ flèches |
| Raccourci `/` | non concerné | ✅ | ✅ | ✅ |
| Rideau de page | ✅ | ✅ (plus court) | fondu | ✅ + focus sur le titre |
| Révélation circulaire (langue, thème) | ✅ | ✅ | instantanée | ✅ |
| Écartement au survol, parallaxe | ❌ | ❌ | ❌ | non concerné |
| Galerie | ✅ glisser, pincer | ✅ | fondu | ✅ flèches, Échap |
| Inversion de la signature | ❌ | ❌ | ❌ | non concerné |

---

## À valider

| # | Question | Ma recommandation |
|---|---|---|
| 1 | Ajouter la **vue tableau** avec aperçu d'image au survol sur la page Projets ? | Oui |
| 2 | Ajouter le **raccourci `/`** pour la recherche ? | Oui |
| 3 | **Mode clair / sombre** avec bouton (par défaut : réglage de l'appareil) ? | Oui |
| 4 | Limiter le magnétisme à **deux boutons** ? | Oui |
| 5 | Inversion de la **signature du footer** au survol ? | Oui, c'est léger |
