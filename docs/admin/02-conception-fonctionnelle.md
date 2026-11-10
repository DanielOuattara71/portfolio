# Admin · Étape 02 — Cahier des charges fonctionnel

> Livrable du **Prompt 02** de [admin_portfolio.md](../../admin_portfolio.md), à partir de l'audit validé ([01-audit-existant.md](01-audit-existant.md)) le 2026-11-07.
> Ce document décrit **ce que fait** l'admin : modules, actions, champs, règles métier. Il ne fixe pas encore :
> - le détail du workflow (étape 03) ;
> - la sécurité (04) ;
> - la surveillance (05) ;
> - les sauvegardes (06) ;
> - l'interface (07) ;
> - la technique (08).

## Décisions déjà prises (rappel)

| # | Décision | Source |
|---|---|---|
| D1 | Pas de module Articles (Insights) pour l'instant. Le modèle de données le prévoit pour plus tard | Audit, point 1 |
| D2 | Les libellés d'interface restent dans le code. Tous les textes éditoriaux passent dans l'admin | Audit, point 2 |
| D3 | Ajout d'un module **Boîte de réception** (messages de contact) | Audit, point 3 |
| D4 | Textes du site et projets : **les deux langues sont obligatoires pour publier** | Étape 06 du site, R-publication |
| D5 | Une section du site n'apparaît que si elle a du contenu publié | Étape 06 du site, D5 |
| D6 | Chaque projet publié a **au moins un lien** (site, code, store ou documentation) | Ta demande, étape 17 |
| D7 | Rien n'est inventé : un champ vide est masqué sur le site, jamais rempli par défaut | Règle générale |
| D8 | Un CV par langue | Étape 06 du site |

## Vue d'ensemble des modules

| Module | Rôle | Priorité |
|---|---|---|
| A. Tableau de bord | Vue d'ensemble, raccourcis, alertes | 2 |
| B. Projets | Projets et études de cas | **1** |
| C. Textes du site | Hero, profil, sections, pied de page, pages légales | 1 |
| E. Compétences et domaines | Compétences, niveaux, ruban des technologies | 2 |
| F. Parcours | Expériences, formations, certifications | 2 |
| — Services et méthode | Services proposés, étapes de travail | 2 |
| G. Médiathèque | Images et PDF | **1** |
| H. Langues | Traductions manquantes, contenus incomplets | 2 |
| I. SEO | Titres, descriptions, partage, indexation | 2 |
| J. Paramètres | Nom, photo, email, réseaux, CV, disponibilité | **1** |
| K. Boîte de réception | Messages du formulaire de contact | 2 |
| D. Articles | Reporté (D1) | — |

Priorité 1 = ce qui débloque le site public (ton nom, ta photo, ton CV, tes projets avec leurs liens et captures).

---

## Règles communes à tous les contenus

| Règle | Détail |
|---|---|
| **Bilingue séparé** | Chaque texte a une version FR et une version EN, saisies et enregistrées séparément. Modifier le français ne touche jamais l'anglais. |
| **Statut** | Brouillon, en révision, publié, archivé (détaillé à l'étape 03). |
| **Aucune modification non publiée en ligne** | Le site public ne lit que la dernière version publiée. Un brouillon en cours n'a aucun effet sur le site. |
| **Publication complète** | Pour D4, la publication est refusée si un champ obligatoire manque dans l'une des deux langues. L'admin indique précisément lequel. |
| **Traçabilité** | Chaque enregistrement conserve la date, l'auteur et une version précédente restaurable. |
| **Confirmation** | Suppression, dépublication, archivage et remplacement d'un fichier demandent une confirmation. |
| **Prévisualisation** | Tout contenu se prévisualise **avec le vrai design du site**, dans chaque langue, avant publication. |
| **Ordre** | Les listes affichées sur le site (projets, compétences, services, étapes, parcours, réseaux) se réordonnent par glisser-déposer ou flèches (accessible au clavier). |
| **Champs vides** | Un champ facultatif vide est masqué sur le site (D7). L'admin le signale « à compléter » sans bloquer. |
| **Validation serveur** | Toutes les règles ci-dessous sont vérifiées par l'API, pas seulement dans le formulaire. |

---

## A. Tableau de bord

Chiffres réels, calculés depuis la base :

| Bloc | Contenu |
|---|---|
| Contenus | Projets publiés / brouillons / archivés ; textes du site publiés / en brouillon |
| À compléter | Traductions manquantes, projets sans lien ou sans image, champs « à valider » importés, paramètres vides (nom, photo, CV) |
| Activité récente | 10 dernières actions du journal (qui, quoi, quand) |
| Dernières modifications | 5 derniers contenus modifiés, avec lien direct |
| Messages | Nombre de messages de contact non lus |
| Sécurité | Alertes ouvertes, dernière connexion, sessions actives (étapes 04–05) |
| Services | État mesuré du site, de l'API, de la base, du stockage (étape 05) |
| Sauvegardes | Date et résultat de la dernière sauvegarde (étape 06) |
| Raccourcis | Nouveau projet, modifier le Hero, importer un média, voir le site |

Règle : un indicateur qui n'est pas encore mesuré affiche « non disponible », jamais une valeur inventée.

---

## B. Projets

### Actions

| Action | Règle |
|---|---|
| Créer | Démarre en brouillon. Un identifiant `PRJ-NN` est attribué automatiquement et ne change jamais. |
| Modifier | Crée une nouvelle version ; la version publiée reste en ligne tant que la nouvelle n'est pas publiée. |
| Enregistrer le brouillon | Manuel, plus un enregistrement automatique (règles à l'étape 03). |
| Prévisualiser | Page « étude de cas » réelle, FR et EN, avec le contenu non publié. |
| Publier | Refusé tant que les **champs obligatoires** (ci-dessous) ne sont pas remplis dans les deux langues. |
| Dépublier | Le projet disparaît du site, de la navigation et du sitemap ; il reste dans l'admin. |
| Archiver | Comme dépublier, et il quitte la liste courante de l'admin (filtre « archivés »). |
| Supprimer | Seulement un projet **jamais publié** ou **archivé**, après confirmation. Un projet publié doit d'abord être archivé. |
| Réordonner | Ordre de la page Projets et de l'accueil. |
| Mettre en avant | Case « affiché sur l'accueil ». L'accueil affiche les projets mis en avant, dans l'ordre choisi. |
| Dupliquer | Copie en brouillon (pratique pour démarrer une nouvelle étude de cas). |

### Champs

Le cahier des charges cite « Nom, Titre, Sous-titre » : ils correspondent au **nom** affiché et à l'**accroche** du site actuel. Il n'y a pas de troisième titre distinct sur le site.

| Groupe | Champ | Langues | Obligatoire pour publier | Sur le site |
|---|---|---|---|---|
| Identité | Nom | FR + EN | ✅ | Titre de la carte et de l'étude de cas |
| | Slug (adresse) | FR + EN | ✅, proposé depuis le nom, modifiable | `/fr/projets/…`, `/en/projects/…` |
| | Type (« projet client », « application mobile »…) | FR + EN | ✅ | Badge |
| | Contexte : client, stage, académique, personnel, ce site | commun | ✅ | Badge |
| | Réalisé seul | commun | — | Badge « seul » |
| | Domaines : web, mobile, data, cloud, IA | commun | ✅ au moins un | Filtres |
| | Période (texte libre : « 2025 », « mars–juin 2025 ») | commun | — | Fiche |
| Résumé | Accroche (une phrase) | FR + EN | ✅ | Sous le titre |
| | Description courte | FR + EN | ✅ | Carte, description SEO par défaut |
| | Mon rôle | FR + EN | — | Fiche |
| | Responsabilités (liste) | FR + EN | — | Étude de cas |
| Technique | Technologies (choisies dans les **compétences**) | commun | — | Fiche, filtre de recherche, compteur des compétences |
| Liens | Liste de liens : type (site, code, store, documentation) + URL `https` | URL commune | ✅ **au moins un** (D6) | Boutons de l'étude de cas |
| Étude de cas | Contexte | FR + EN | — | Section masquée si vide |
| | Problématique | FR + EN | — | idem |
| | Objectifs (liste) | FR + EN | — | idem |
| | Solution développée (texte riche) | FR + EN | — | idem |
| | Architecture technique (texte riche + schéma facultatif) | FR + EN | — | idem |
| | Technologies et rôle de chacune (tableau) | rôle FR + EN | — | idem |
| | Difficultés rencontrées (liste) | FR + EN | — | idem |
| | Résultats (liste, **faits vérifiables uniquement**) | FR + EN | — | idem |
| Médias | Image de couverture (16:10) | texte alternatif FR + EN | — (recommandée) | Carte et en-tête |
| | Galerie de captures (ordonnée, légende facultative) | texte alternatif FR + EN | — | Galerie |
| SEO | Titre, description, image de partage, indexation | FR + EN | — (valeurs par défaut calculées) | Balises de la page |

### Règles métier

- **Slug unique par langue.** Le changer sur un projet publié crée une redirection 301 depuis l'ancienne adresse, pour ne pas casser les liens partagés.
- **Le texte riche ne contient jamais de HTML brut** : l'éditeur enregistre une structure (titres, paragraphes, listes, liens, code, images de la médiathèque), nettoyée côté serveur.
- **Les technologies viennent des compétences** : impossible de citer une technologie inconnue sans la créer d'abord (cohérence avec la page Expertise et le compteur « utilisée dans N projets »).
- **Projet suivant** : calculé automatiquement selon l'ordre des projets publiés.
- **Champs « à valider »** importés depuis le site actuel : ils arrivent avec une marque « à valider », visible dans l'admin. Le projet ne peut pas être publié tant que la marque n'est pas levée (ou le champ vidé).

---

## C. Textes du site

Chaque bloc ci-dessous se modifie, se prévisualise et se publie **indépendamment** (publier le Hero ne publie pas le pied de page).

| Bloc | Champs (FR + EN) |
|---|---|
| **Hero** | Ligne de titre (« Software & Data Engineer »), accroche, phrase de valeur avec mots mis en valeur, pastilles de faits (ordonnées), texte du badge rotatif, fiche profil de la pile (champ + valeur) |
| **Profil court** (accueil) | Paragraphes, mots mis en valeur |
| **Profil complet** (`/profil`) | Présentation longue, vision, faits pratiques (langues, mode de travail, fuseau, disponibilité) |
| **Introductions de section** | Projets, Profil, Services, Parcours, Méthode, Expertise, Contact : titre et texte d'introduction |
| **Bandeau « Vous avez un projet ? »** | Titre, mot mis en valeur, texte, libellés des types de projet |
| **Contact** | Introduction, texte à côté du formulaire, message de confirmation |
| **Pied de page** | Phrase d'appel, mot mis en valeur, rôle, modes de travail |
| **Mentions légales** | Texte riche |
| **Confidentialité** | Texte riche |

Règles :
- Le **mot mis en valeur** (italique) se choisit dans le texte, au plus deux par phrase (règle du design system).
- **Historique** : chaque publication garde la version précédente ; restauration en un clic (redevient un brouillon à republier).
- Les **libellés d'interface** (boutons, erreurs, accessibilité) restent dans le code (D2).

---

## E. Compétences et domaines

### Compétences

| Champ | Détail |
|---|---|
| Nom | FR + EN (identiques pour les noms propres) |
| Niveau | **Pratiqué** (en projet réel), **Étudié** (formation), **En exploration**. Distinction exigée par le cahier des charges |
| Domaine | Web, mobile, data, cloud, IA, software |
| Visible | Afficher ou masquer sur le site |
| Dans le ruban | Afficher dans le ruban des technologies de l'accueil |
| Logo du ruban | Logo SVG (importé ou choisi dans une bibliothèque libre de droits), couleur de fond, couleur du logo ; ou texte court (« API REST ») |

Actions : ajouter, modifier, supprimer, réordonner, masquer.

Règles :
- Le nombre de projets qui utilisent une compétence est **calculé** depuis les projets publiés, jamais saisi.
- Supprimer une compétence utilisée par un projet est refusé ; l'admin liste les projets concernés.
- Contraste vérifié entre la couleur du logo et son fond (au moins 3:1), avec un avertissement sinon.

### Domaines d'expertise

5 domaines aujourd'hui. Champs : nom, niveau, description (FR + EN), ordre, visible.

---

## F. Parcours

| Type | Champs |
|---|---|
| **Expérience** | Organisation, type (stage, emploi, freelance…) FR + EN, poste FR + EN, période (début, fin ou « en cours »), lieu ou télétravail, description FR + EN, missions (liste FR + EN), projet lié (facultatif), justificatif (facultatif, **privé par défaut**) |
| **Formation** | Établissement (nom court + nom complet), diplôme FR + EN, spécialité FR + EN, période, statut (en cours, obtenu), description, justificatif |
| **Certification** | Nom, organisme, date d'obtention, date d'expiration (facultative), identifiant et lien de vérification, justificatif |

Actions : ajouter, modifier, supprimer, réordonner (par défaut : du plus récent au plus ancien), publier.

Règles :
- Un justificatif (diplôme, attestation) n'est **jamais public** sauf si tu coches « afficher ».
- Une certification expirée affiche « expirée » ou est masquée, au choix.
- Le bloc « Certifications » reste masqué sur le site tant qu'aucune n'est publiée (D5).

---

## Services et méthode

| Contenu | Champs |
|---|---|
| **Service** | Titre, description, cas d'usage (liste), livrables FR + EN, projets liés (choisis parmi les projets publiés) |
| **Étape de méthode** | Numéro (automatique), titre, texte FR + EN |

Actions : ajouter, modifier, supprimer, réordonner, publier.

---

## G. Médiathèque

| Action | Règle |
|---|---|
| Importer | Images JPEG, PNG, WebP, AVIF, SVG (logos uniquement, nettoyé) ; PDF. Taille maximale à fixer à l'étape 04 (proposition : 10 Mo image, 15 Mo PDF). Type réel vérifié côté serveur, pas seulement l'extension |
| Optimiser | Automatique à l'import : versions redimensionnées (largeurs adaptées aux cartes, à l'en-tête, aux galeries) en WebP/AVIF, métadonnées EXIF retirées (dont la position GPS) |
| Prévisualiser | Vignette, dimensions, poids, type, date, auteur de l'import |
| Décrire | Texte alternatif FR + EN (**obligatoire** pour une image utilisée dans un contenu publié), légende FR + EN, crédit |
| Remplacer | Garde la même référence : tous les contenus qui l'utilisent affichent la nouvelle version |
| Organiser | Dossiers (Projets, Profil, CV, Logos…) et étiquettes |
| Rechercher | Par nom, texte alternatif, type, dossier |
| Voir les usages | Liste des contenus qui utilisent le média (projet, Hero, paramètres…) |
| Supprimer | **Refusé si le média est utilisé par un contenu publié** ; possible s'il est inutilisé, après confirmation |

Règles :
- Les originaux restent privés ; seuls les fichiers utilisés par un contenu publié sont accessibles publiquement.
- Un média importé mais pas encore publié n'est pas visible sur le site.

---

## H. Langues

| Fonction | Détail |
|---|---|
| Tableau des traductions | Pour chaque contenu : FR ✅/❌, EN ✅/❌, et les champs manquants |
| Contenus incomplets | Filtre « à compléter » dans chaque module |
| Langue par défaut | Anglais pour les visiteurs ni francophones ni anglophones (décision de l'étape 06). Réglable dans les Paramètres |
| Contrôle de publication | Une langue incomplète bloque la publication des textes et des projets (D4) |
| Édition côte à côte | FR et EN visibles ensemble dans les formulaires (détail à l'étape 07) |

Règle : aucune traduction automatique silencieuse. Une aide à la traduction pourra être ajoutée plus tard, mais elle produira toujours un **brouillon à relire**.

---

## I. SEO

| Champ | Par défaut (si vide) | Règle |
|---|---|---|
| Titre de la page | Titre du contenu + « · » + nom affiché | 60 caractères conseillés, avertissement au-delà |
| Description | Description courte du projet ou texte d'introduction de la page | 50 à 160 caractères conseillés |
| Slug | Calculé depuis le nom | Unique par langue, redirection si modifié après publication |
| Image de partage | Image générée (identité du site) ou couverture du projet | 1200×630, choisie dans la médiathèque |
| Indexation | Indexé | « Ne pas indexer » possible par page |

Disponible pour : chaque projet, chaque page (accueil, projets, profil, expertise, contact, pages légales). Aperçu du résultat Google et du partage LinkedIn dans l'admin.

---

## J. Paramètres

| Champ | Détail | Effet sur le site |
|---|---|---|
| Nom affiché | Prénom et nom | Logo, grand titre du Hero, signature du pied de page, titres des pages, données structurées `Person` (aujourd'hui remplacés par « Software & Data Engineer ») |
| Initiales | 2–3 lettres | Carré du logo (aujourd'hui « / ») |
| Photo de profil | Choisie dans la médiathèque, texte alternatif FR + EN | Pile du Hero, page Profil |
| Email professionnel | Validé | Pied de page (copie en un clic), page Contact, destinataire des notifications |
| Réseaux sociaux | Liste ordonnée : LinkedIn, GitHub, autre (libellé + URL `https`) | Pied de page, Contact |
| CV | Un PDF par langue, choisi dans la médiathèque | Boutons CV, `/fr/cv` et `/en/cv` |
| Disponibilité | Disponible / non disponible + texte court FR + EN | Indicateur « Disponible » |
| Fuseau horaire, ville | Facultatifs | Profil, Contact |
| Contact | Activer ou fermer le formulaire, message affiché s'il est fermé | Page Contact |
| Langue par défaut | Anglais (actuel) | Redirection de `/` |

Règles :
- Les paramètres sont **réservés au rôle Administrateur**.
- Modifier le nom, l'email ou le CV passe aussi par la prévisualisation et la publication, comme un contenu (pas d'effet immédiat par erreur).

---

## K. Boîte de réception (messages de contact)

| Action | Détail |
|---|---|
| Lister | Du plus récent au plus ancien ; filtres : statut, profil (recruteur, client, autre), type de projet, langue |
| Lire | Message complet, coordonnées, types de projet, délai ; passe en « lu » |
| Changer le statut | Nouveau → lu → répondu → archivé |
| Répondre | Lien `mailto:` pré-rempli (l'admin n'envoie pas d'email lui-même dans un premier temps) |
| Supprimer | Après confirmation ; suppression définitive |
| Notification | Email à chaque nouveau message, vers l'email professionnel des Paramètres |

Règles :
- **Conservation limitée** : les messages archivés sont supprimés automatiquement après une durée à fixer (proposition : 12 mois). À indiquer dans la page Confidentialité.
- Le contenu d'un message est affiché **comme du texte**, jamais interprété (protection contre l'injection).
- Le rôle Lecteur ne voit pas les coordonnées des messages.

---

## Dépendances entre modules

| Module | Dépend de | Bloque |
|---|---|---|
| Paramètres (J) | Médiathèque (photo, CV) | Nom affiché partout, CV, notifications |
| Projets (B) | Compétences (technologies), Médiathèque (images) | Accueil, page Projets, Expertise (compteurs), Services (projets liés), Parcours (projet lié), sitemap |
| Textes du site (C) | Médiathèque (images des textes riches) | Toutes les pages |
| Compétences (E) | Médiathèque (logos) | Projets, Expertise, ruban |
| Parcours (F) | Projets (lien facultatif), Médiathèque (justificatifs) | Profil, accueil |
| Services | Projets (projets liés) | Accueil, Expertise |
| SEO (I) | Tous les contenus, Médiathèque | Balises, sitemap |
| Langues (H) | Tous les contenus | Publication (D4) |
| Boîte de réception (K) | Paramètres (email de notification) | — |
| Tableau de bord (A) | Tous les modules | — |
| Tous | Authentification et rôles (04), Journal (05) | — |

Ordre de construction proposé (à confirmer à l'étape 09) :
1. Socle : authentification, rôles, journal.
2. Médiathèque.
3. Paramètres.
4. Compétences.
5. Projets.
6. Textes du site.
7. Parcours, services, méthode.
8. Boîte de réception.
9. SEO et langues.
10. Tableau de bord.
11. Surveillance et sauvegardes.

---

## Points à valider

1. **Suppression d'un projet** : seulement s'il n'a jamais été publié ou s'il est archivé. Un projet publié doit d'abord être archivé.
2. **Technologies d'un projet** choisies uniquement parmi les compétences, pour garder la page Expertise cohérente.
3. **Justificatifs** (diplômes, attestations) privés par défaut.
4. **Messages de contact archivés** supprimés automatiquement après **12 mois**.
5. **Paramètres** (nom, email, CV) soumis à prévisualisation et publication, comme les contenus, plutôt qu'appliqués immédiatement.
6. **Ordre de construction** ci-dessus : socle, puis médiathèque, paramètres et projets en premier.
