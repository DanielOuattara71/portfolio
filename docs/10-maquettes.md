# Étape 10 — Maquettes de toutes les pages

> Livrable du **Prompt 10**. Maquettes interactives : [10-maquettes.html](10-maquettes.html) (9 pages, navigables, avec un sélecteur ordinateur / tablette / mobile et le thème clair / sombre).
> Ce document décrit chaque page : structure, proportions, hiérarchie, composants, images, interactions, transitions et responsive.
> Références : architecture [06](06-architecture.md), contenus [07](07-contenus.md), motion [08](08-motion.md), interactions [09](09-interactions.md), [design system](design-system/project/README.md).

## Repères communs

| Élément | Ordinateur (≥ 900px) | Tablette (760–899px) | Mobile (< 760px) |
|---|---|---|---|
| Largeur utile | 1320px max, marges 3 % | pleine largeur, marges 3 % (min 16px) | marges 16px |
| Navigation | Logo · pilule à 5 liens · statut · FR/EN · thème | Logo · FR/EN · thème · bouton menu | idem tablette |
| Panneaux de section | Arrondis 28px, padding jusqu'à 48px | padding fluide | padding 22px |
| Grilles | 2 ou 3 colonnes | 2 colonnes | 1 colonne |
| Footer | Phrase + bouton rond à droite, signature géante | idem | bouton rond sous la phrase |

Transitions entre pages : rideau avec la route de destination (M-07). Changement de thème et de langue : révélation circulaire (M-15). Animations réduites : tout en fondu court ou instantané.

---

## 1. Accueil — `/fr`

| Bloc | Proportion (ordinateur) | Contenu et composants | Images |
|---|---|---|---|
| Hero | ≈ 1 écran (640px min.) | Ligne d'enregistrement, nom contour/plein (jusqu'à 136px), pile portrait à droite (≈ 30 % de la largeur), accroche, phrase de valeur, 2 boutons, 3 pastilles | Portrait 4:5 (≥ 1200px de haut) |
| Ruban | ≈ 100px | 13 tuiles de technologies | Logos Simple Icons (intégrés) |
| /PROJETS | ≈ 1,7 écran | Barre de requête, filtres, 5 fiches en 2 colonnes, compteur, lien « Tous les projets » | 5 couvertures 16:10 |
| /PROFIL | ≈ 0,6 écran | Texte à gauche, 5 domaines avec niveau à droite | — |
| /SERVICES | ≈ 0,9 écran | Accordéon de 4 services (le 1ᵉʳ ouvert) | Visuel incliné par service (optionnel) |
| Bandeau jaune | ≈ 0,5 écran | Titre + 6 tuiles + Continuer | — |
| /PARCOURS | ≈ 0,4 écran | 2 lignes (stage, formation) | — |
| /MÉTHODE | ≈ 0,4 écran | 5 étapes en ligne | — |
| /INSIGHTS | masqué | Affiché dès le 1ᵉʳ article : 3 cartes | Couvertures 16:9 |
| Footer | ≈ 0,8 écran | Voir repères communs | — |

**Hiérarchie** : nom → accroche → projets → services → contact.
**Interactions** : pile portrait (clic, glisser, flèches), bouton magnétique « Voir les projets », filtres et requête, accordéon, tuiles du bandeau qui pré-remplissent Contact.
**Responsive** : la pile passe sous le nom (alignée à droite) ; les 5 étapes passent sur 2 colonnes puis 1 ; les tuiles du bandeau sur 2 colonnes.

## 2. Projets — `/fr/projets`

| Bloc | Contenu |
|---|---|
| En-tête | /PROJETS + compteur + chapeau, mot fantôme |
| Outils | Barre de requête (raccourci `/`), filtres par domaine, bascule **grille / tableau** |
| Vue tableau (ordinateur, par défaut) | Colonnes id · projet · domaines · stack · période. Survol d'une ligne : fond jaune + aperçu de la couverture près du pointeur |
| Vue grille | Fiches en 2 colonnes |

**Responsive** : sous 900px, la bascule et le tableau disparaissent, seule la grille reste (1 colonne sous 760px).
**Images** : couvertures 16:10 (réutilisées pour l'aperçu au survol).

## 3. Étude de cas — `/fr/projets/{slug}` (exemple : Retrouve Moi)

| Bloc | Proportion | Contenu |
|---|---|---|
| En-tête | ≈ 0,5 écran | Badges (identifiant, type, contexte), nom en très grand (jusqu'à 150px), accroche |
| Fiche | 1 ligne | rôle · période · stack · liens (4 colonnes, 2 sur mobile) |
| Image principale | 16:8, pleine largeur | Capture réelle |
| Corps | 2 colonnes : sommaire collant (220px) + sections (68 caractères max.) | Contexte, Problématique, Objectifs, Approche, Architecture (schéma), Technologies (tableau techno → rôle), Difficultés, Résultats (masqué si vide), Galerie (3 colonnes) |
| Progression | Cercle en bas à droite | Pourcentage de lecture |
| Projet suivant | Grand bloc sombre | Nom du projet suivant en très grand |

**Interactions** : sommaire qui suit la lecture, galerie plein écran, projet suivant (M-07b), retour aux projets avec filtres conservés.
**Responsive** : sous 900px, le sommaire devient un menu repliable en haut ; galerie sur 2 colonnes.
**Images** : 1 principale 16:8, 3 à 9 captures de galerie, 1 schéma d'architecture (ou schéma généré).

## 4. Profil — `/fr/profil`

| Bloc | Contenu |
|---|---|
| En-tête + présentation | Texte en 4 paragraphes à gauche (≈ 60 %), portrait 4:5 à droite, boutons CV et Contact |
| Faits | 4 cases : langues, mode de travail, fuseau, disponibilité |
| /VISION | Une phrase en grand |
| /MÉTHODE | 5 étapes |
| /PARCOURS | Panneau sombre, chronologie : dates à gauche (200px), détail à droite, lien vers l'étude de cas liée. Bloc Certifications masqué si vide |

**Responsive** : portrait sous le texte ; faits sur 2 colonnes ; chronologie sur 1 colonne.
**Images** : portrait (le même que la pile, version photo).

## 5. Expertise — `/fr/expertise`

| Bloc | Contenu |
|---|---|
| En-tête | /EXPERTISE + chapeau sur l'honnêteté des niveaux |
| 5 domaines | Cartes en 3 colonnes : identifiant, nom, description, niveau |
| /COMPÉTENCES | 3 colonnes (pratiqué · formation · exploration). Chaque compétence pratiquée affiche le nombre de projets liés et mène aux projets filtrés |
| /SERVICES | 4 cartes sombres : description, cas, livrables, projets liés |
| Bandeau jaune | Identique à l'accueil |

**Responsive** : domaines sur 2 puis 1 colonne ; matrice et services sur 1 colonne.

## 6. Insights — `/fr/insights`

| Bloc | Contenu |
|---|---|
| En-tête | /INSIGHTS + nombre d'articles publiés |
| Outils | Barre de requête, filtres par catégorie |
| Liste | Cartes en 3 colonnes : couverture 16:9, catégorie, date, temps de lecture, langue, titre |

**État vide** (au lancement) : « Premiers articles en préparation », page retirée de la navigation.
**Responsive** : 2 puis 1 colonne.
**Note** : la maquette montre des **exemples** marqués comme tels, tirés des sujets proposés.

## 7. Article — `/fr/insights/{slug}`

| Bloc | Contenu |
|---|---|
| En-tête | Catégorie, titre (jusqu'à 64px, 860px de large max.), chapeau, métadonnées |
| Image principale | 16:8 |
| Corps | Sommaire collant à gauche (si ≥ 3 intertitres) + texte de 68 caractères max. : intertitres, citations, blocs de code, images |
| Fin | Partage (copier le lien, LinkedIn, X), « À lire aussi » (3 cartes) |
| Progression | Cercle de lecture |

**Responsive** : sommaire repliable en haut sous 900px.

## 8. Contact — `/fr/contact`

| Bloc | Contenu |
|---|---|
| En-tête | /CONTACT + phrase d'accueil avec délai de réponse |
| Formulaire (≈ 60 %) | Choix du profil (Recruteur · Client · Autre) qui adapte les champs ; types de projet pré-remplis depuis le bandeau ; validation sous chaque champ ; consentement ; message de confirmation |
| Colonne (≈ 40 %) | Email copiable, réseaux et CV, disponibilité et fuseau |

**Particularité** : le footer de cette page n'a pas de bouton rond (on est déjà sur Contact).
**Responsive** : la colonne passe sous le formulaire ; champs sur 1 colonne sous 560px.

## 9. 404

« Record introuvable. » en très grand (« introuvable » en contour), ligne de requête technique, deux boutons. Aucune image.

---

## Ce que la maquette ne montre pas (volontairement)

- **L'intro et la séquence d'entrée du Hero** : déjà démontrées dans la maquette 04b, décrites en M-01 et M-02.
- **Le texte anglais** : le bouton EN montre la transition circulaire ; les textes anglais sont dans [07-contenus.md](07-contenus.md).
- **Les mentions légales et la confidentialité** : pages de texte simples, structure dans les contenus.
- **Les vraies images** : remplacées par des emplacements hachurés « à fournir ».
