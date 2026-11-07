\# PROJET : ESPACE D'ADMINISTRATION DE MON PORTFOLIO

\## CONTEXTE GÉNÉRAL

Je souhaite concevoir un espace d'administration complet pour mon portfolio personnel.

Mon portfolio est celui d'un Software Engineer & Data Engineer, étudiant en Master 2 SIGL à l'ESATIC, avec une orientation Cloud Computing et Data Engineering.

Le site public est bilingue français/anglais et comporte notamment :

- Home / Hero
- About
- Expertise
- Services
- Selected Work
- Experience
- Education & Certifications
- My Approach
- Insights
- Contact

Les projets principaux sont :

- Prince Edja
- Retrouve Moi
- Gestion de livraison
- Data Engineering

\### OBJECTIF DE L'ESPACE ADMIN

Je veux pouvoir gérer l'ensemble des contenus du site depuis une interface d'administration privée, sans avoir besoin de modifier directement le code source pour chaque changement éditorial.

L'espace admin doit être :

- Professionnel.
- Moderne.
- Facile à utiliser.
- Sécurisé.
- Responsive.
- Maintenable.
- Évolutif.
- Connecté au site public par une architecture cohérente.

Il doit permettre de contrôler les contenus, les médias, les publications et la sécurité du site.

\### RÈGLES DE COLLABORATION

Tu dois travailler par étapes.

- Analyse toujours l'existant avant de proposer une nouvelle architecture.
- Ne suppose pas que le backend existe ou fonctionne.
- Ne crée pas de routes API fictives.
- Ne commence pas le développement avant validation des spécifications.
- Ne supprime pas de fonctionnalités existantes sans justification.
- Ne modifie pas le design du site public pour simplifier l'administration.
- Chaque modification publiée doit être réellement répercutée sur le site public.
- Ne considère jamais une donnée stockée uniquement dans le navigateur comme une donnée persistante et sécurisée.
- Documente les décisions techniques et fonctionnelles.

\---

\# PROMPT 01 — AUDIT DU SITE PUBLIC ET DE L'EXISTANT

Avant de concevoir l'espace admin, réalise un audit complet du portfolio.

Si le projet possède déjà un dépôt de code, analyse sa structure et ses fichiers. Sinon, analyse les maquettes, les spécifications et les contenus disponibles.

\### Analyse du site public

Identifie :

- Toutes les pages.
- Toutes les sections.
- Tous les textes.
- Toutes les images.
- Les fichiers téléchargeables.
- Les projets.
- Les articles.
- Les informations personnelles.
- Les liens externes.
- Les éléments multilingues.
- Les contenus statiques.
- Les contenus susceptibles de devenir dynamiques.

\### Pour chaque élément

Détermine :

- S'il doit être modifiable depuis l'admin.
- S'il doit être supprimable.
- S'il doit pouvoir être réorganisé.
- S'il nécessite une image ou un fichier.
- S'il possède une version française et anglaise.
- S'il nécessite un statut de publication.

\### Analyse technique

Si un projet existe déjà, examine :

- Frontend.
- Backend.
- Base de données.
- Routage.
- Gestion des contenus.
- Gestion des médias.
- Authentification.
- Déploiement.
- Dépendances.

Distingue clairement ce qui existe réellement, ce qui fonctionne, ce qui est incomplet et ce qui reste à construire.

\### Livrables

Produis :

1. Un inventaire du site public.
1. Un inventaire des contenus administrables.
1. Un audit technique.
1. Une liste des fonctionnalités manquantes.
1. Les éventuelles dépendances entre les modules.

Ne propose pas encore une architecture définitive. Attends ma validation.

\---

\# PROMPT 02 — CONCEPTION FONCTIONNELLE DE L'ESPACE ADMIN

À partir de l'audit validé, définis précisément toutes les fonctionnalités de l'espace d'administration.

Je veux un véritable système de gestion de contenu personnalisé.

Étudie les modules suivants.

\### A. Dashboard

Il doit afficher :

- Nombre de projets.
- Nombre d'articles.
- Nombre de contenus publiés.
- Nombre de brouillons.
- Activité récente.
- Dernières modifications.
- Alertes de sécurité.
- État des services.
- État des sauvegardes.
- Raccourcis vers les actions fréquentes.

Les statistiques doivent provenir de données réelles.

\### B. Gestion des projets

Créer un module complet permettant :

- Ajouter un projet.
- Modifier un projet.
- Supprimer un projet.
- Archiver un projet.
- Publier et dépublier un projet.
- Enregistrer un brouillon.
- Prévisualiser un projet.
- Réorganiser les projets.
- Définir un projet mis en avant.

Chaque projet doit pouvoir contenir :

- Nom.
- Slug.
- Titre.
- Sous-titre.
- Description courte.
- Présentation détaillée.
- Contexte.
- Problématique.
- Objectifs.
- Solution développée.
- Mon rôle.
- Responsabilités.
- Technologies.
- Architecture technique.
- Difficultés rencontrées.
- Résultats.
- Image de couverture.
- Galerie de captures.
- Liens GitHub.
- Lien de démonstration.
- Date ou période.
- Catégories.
- Version française.
- Version anglaise.
- Statut de publication.
- Métadonnées SEO.

Prévoir un éditeur adapté à la rédaction de longues études de cas.

\### C. Gestion des textes du site

Je veux pouvoir modifier les contenus de toutes les sections publiques.

Prévoir notamment :

- Hero : titre, accroche, présentation et boutons.
- About : présentation, parcours et vision.
- Expertise : domaines et descriptions.
- Services : prestations et descriptions.
- Experience : expériences professionnelles.
- Education : formations et certifications.
- My Approach : étapes de travail.
- Contact : textes et coordonnées.
- Footer : informations et liens.

Les textes doivent pouvoir être modifiés indépendamment en français et en anglais.

Prévoir également :

- Historique des modifications.
- Prévisualisation.
- Brouillons.
- Publication.
- Restauration d'une version précédente si elle est disponible.

\### D. Gestion des Insights

Créer un système éditorial permettant :

- Créer un article.
- Modifier un article.
- Supprimer un article.
- Enregistrer un brouillon.
- Publier.
- Programmer une publication si cela est techniquement justifié.
- Dépublier.
- Archiver.
- Organiser les catégories.
- Ajouter des tags.
- Gérer les images.
- Ajouter une table des matières.
- Gérer le temps de lecture.
- Gérer les traductions.
- Configurer les métadonnées SEO.

Prévoir un éditeur de contenu confortable pour rédiger des articles techniques.

\### E. Gestion des compétences

Permettre :

- Ajouter une compétence.
- Modifier une compétence.
- Supprimer une compétence.
- Classer les compétences.
- Les associer à une catégorie.
- Les afficher ou les masquer.
- Les associer à des projets.

Prévoir une distinction entre compétences maîtrisées, technologies utilisées en projet et compétences en cours d'apprentissage.

\### F. Gestion des expériences et formations

Permettre de gérer :

- Expériences professionnelles.
- Entreprises.
- Postes.
- Périodes.
- Descriptions.
- Responsabilités.
- Formations.
- Établissements.
- Diplômes.
- Certifications.
- Documents justificatifs si nécessaires.

\### G. Gestion des médias

Créer une médiathèque permettant :

- Importer des images.
- Importer des PDF.
- Prévisualiser les fichiers.
- Modifier les informations descriptives.
- Remplacer un fichier.
- Supprimer un fichier inutilisé.
- Organiser les médias.
- Rechercher un média.
- Voir où un média est utilisé.
- Optimiser les images.

Ne supprime jamais automatiquement un média utilisé par un contenu publié.

\### H. Gestion du multilingue

Le système doit gérer les contenus français et anglais.

Permettre :

- De modifier chaque langue.
- De détecter les traductions manquantes.
- De visualiser les contenus incomplets.
- De définir une langue par défaut.
- De contrôler la publication des versions traduites.

Une modification française ne doit pas écraser automatiquement la version anglaise.

\### I. Gestion SEO

Permettre de modifier :

- Meta title.
- Meta description.
- Slug.
- Image Open Graph.
- Indexation.
- Informations de partage.
- Métadonnées pertinentes.

\### J. Paramètres généraux

Permettre de gérer :

- Nom affiché.
- Photo de profil.
- Adresse email professionnelle.
- Réseaux sociaux.
- CV téléchargeable.
- Disponibilité professionnelle.
- Informations du footer.
- Paramètres de contact.

\### Livrable

Construis un cahier des charges fonctionnel détaillé, avec les actions disponibles, les règles métier et les dépendances entre modules.

Ne commence pas encore le développement.

\---

\# PROMPT 03 — WORKFLOW ÉDITORIAL ET PUBLICATION

Conçois un véritable workflow de gestion des contenus.

Je veux pouvoir modifier un contenu sans risquer de publier immédiatement une modification non terminée.

Étudie les états suivants :

1. Brouillon.
1. En révision.
1. Publié.
1. Archivé.

\### Fonctionnalités

- Enregistrer automatiquement les brouillons si cela est pertinent.
- Sauvegarder manuellement.
- Prévisualiser avant publication.
- Comparer les modifications.
- Voir la date de dernière modification.
- Voir l'auteur de la modification.
- Restaurer une version précédente.
- Publier.
- Dépublier.
- Archiver.

Prévois un système de confirmation avant les opérations sensibles.

Une modification non publiée ne doit jamais modifier le site public.

La publication doit être transactionnelle autant que possible : si une opération échoue, le site ne doit pas se retrouver dans un état incohérent.

Prévois également la gestion des contenus bilingues, avec la possibilité de publier une langue indépendamment de l'autre si le fonctionnement éditorial le permet.

Présente-moi les workflows sous forme de diagrammes et de règles métier.

\---

\# PROMPT 04 — SÉCURITÉ ET AUTHENTIFICATION

La sécurité de l'espace admin est une priorité.

Je souhaite une interface privée accessible uniquement aux utilisateurs autorisés.

\### Authentification

Étudie et mets en place :

- Connexion sécurisée.
- Déconnexion.
- Gestion des sessions.
- Expiration automatique des sessions.
- Renouvellement sécurisé.
- Réinitialisation du mot de passe.
- Protection contre les tentatives répétées.
- Vérification de l'identité avant les opérations sensibles.
- MFA lorsque cela est pertinent.

Pour l'authentification web, privilégie une stratégie sécurisée basée sur des cookies HttpOnly, Secure et SameSite adaptés à l'environnement.

Évite le stockage des jetons d'authentification dans localStorage.

\### Autorisations

Prévois une gestion des rôles extensible :

- Administrateur.
- Éditeur.
- Lecteur.

L'administrateur contrôle les paramètres, les comptes et la sécurité.

L'éditeur gère les contenus autorisés.

Le lecteur dispose uniquement des droits de consultation.

Même si je suis initialement le seul administrateur, l'architecture doit permettre d'ajouter d'autres utilisateurs ultérieurement.

\### Protections techniques

Étudie :

- Protection CSRF.
- Protection XSS.
- Validation des entrées côté serveur.
- Protection contre les injections SQL.
- Rate limiting.
- Politique de mots de passe.
- Sécurisation des uploads.
- Contrôle des types MIME.
- Limitation de taille des fichiers.
- Protection des routes privées.
- Gestion des secrets.
- En-têtes HTTP de sécurité.
- Protection des formulaires.

La sécurité ne doit jamais reposer uniquement sur le frontend.

\### Livrable

Produis :

- Le modèle d'authentification.
- La matrice des permissions.
- Les menaces identifiées.
- Les mesures de protection.
- Le workflow de connexion et de déconnexion.
- Les règles de gestion des sessions.

Ne prétends pas qu'une sécurité est effective avant de l'avoir réellement implémentée et testée.

\---

\# PROMPT 05 — SURVEILLANCE ET JOURNALISATION

Je souhaite un véritable module de surveillance de la sécurité et de l'activité de mon espace admin.

Il doit me permettre de savoir ce qui se passe sur mon système.

\### A. Journal d'activité

Enregistrer les événements importants :

- Connexion réussie.
- Tentative de connexion échouée.
- Déconnexion.
- Modification d'un projet.
- Suppression d'un contenu.
- Publication.
- Dépublication.
- Modification des paramètres.
- Import d'un fichier.
- Modification d'un compte.
- Changement de permissions.

Chaque événement doit comporter autant que possible :

- Date et heure.
- Utilisateur concerné.
- Type d'action.
- Ressource concernée.
- Résultat.
- Informations de contexte nécessaires à l'investigation.

Les journaux doivent être protégés contre les modifications non autorisées.

Ne stocke pas les mots de passe, jetons, cookies ou secrets dans les logs.

\### B. Surveillance des connexions

Prévoir :

- Historique des connexions.
- Tentatives échouées.
- Sessions actives.
- Date de dernière activité.
- Détection de comportements anormaux.
- Alertes en cas de tentatives répétées.
- Possibilité de révoquer une session.

Ne considère pas une adresse IP inhabituelle comme une preuve suffisante de compromission.

\### C. Surveillance technique

Surveiller :

- Disponibilité du site public.
- Disponibilité de l'API.
- Erreurs backend.
- Erreurs applicatives.
- Temps de réponse.
- État de la base de données.
- État du stockage des médias.
- État des sauvegardes.

Ne montre que des indicateurs réellement mesurés.

\### D. Alertes

Prévoir des alertes pour :

- Multiples échecs de connexion.
- Activité suspecte.
- Erreurs serveur répétées.
- Échec de sauvegarde.
- Indisponibilité du service.
- Modification d'un paramètre de sécurité.
- Changement de permissions.

Étudie les canaux d'alerte possibles : email ou notification dans le dashboard.

\### E. Tableau de surveillance

Conçois un tableau de bord avec :

- Événements récents.
- Niveau de gravité.
- Alertes ouvertes.
- Sessions actives.
- État des services.
- Dernière sauvegarde.
- Historique des incidents.

\### F. Gestion des incidents

Permettre :

- Consulter un incident.
- Examiner les événements associés.
- Marquer un incident comme traité.
- Ajouter une note.
- Conserver un historique de résolution.

Prévois une politique de conservation des journaux et une minimisation des données personnelles.

\---

\# PROMPT 06 — SAUVEGARDE ET RESTAURATION

Conçois un système fiable de sauvegarde.

Il doit couvrir :

- Base de données.
- Contenus éditoriaux.
- Traductions.
- Métadonnées.
- Références aux médias.
- Fichiers importants.
- Configuration non sensible nécessaire à la restauration.

Prévois :

- Sauvegardes automatiques.
- Historique des sauvegardes.
- Vérification de leur intégrité.
- Alertes en cas d'échec.
- Restauration contrôlée.
- Documentation de reprise après incident.

Les sauvegardes doivent être protégées et ne pas être accessibles publiquement.

Ne considère pas une sauvegarde comme fiable tant que la restauration n'a pas été testée.

\---

\# PROMPT 07 — CONCEPTION UI/UX DE L'ADMIN

Conçois l'interface de l'espace d'administration.

L'interface doit avoir sa propre identité visuelle, cohérente avec le professionnalisme de mon portfolio, sans nécessairement reproduire ses animations expérimentales.

Je veux une interface :

- Moderne.
- Sobre.
- Élégante.
- Très lisible.
- Rapide à utiliser.
- Responsive.
- Accessible.

Étudie les interfaces d'administration professionnelles et les principes des CMS modernes.

Définis la navigation, les pages, les formulaires, les tableaux, les modales, les notifications et les états de chargement.

\### Écrans à concevoir

- Connexion.
- Dashboard.
- Gestion des projets.
- Formulaire de création de projet.
- Éditeur de contenu.
- Gestion des articles.
- Médiathèque.
- Expériences et formations.
- Compétences.
- Traductions.
- SEO.
- Journal d'activité.
- Sécurité et surveillance.
- Sessions.
- Sauvegardes.
- Paramètres.

\### Expérience de rédaction

Les formulaires doivent être bien organisés.

Prévois :

- Sauvegarde des brouillons.
- Indicateurs de champs obligatoires.
- Validation des données.
- Prévisualisation.
- Gestion des images.
- Édition bilingue.
- Confirmation des opérations sensibles.

\### Livrable

Présente les wireframes et les maquettes de l'espace admin.

Attends ma validation avant de coder.

\---

\# PROMPT 08 — ARCHITECTURE TECHNIQUE ET MODÈLE DE DONNÉES

À partir des spécifications fonctionnelles et des maquettes validées, définis l'architecture technique.

Étudie les besoins réels avant de choisir les technologies.

Je souhaite une séparation claire entre :

- Site public.
- Application d'administration.
- Backend/API.
- Base de données.
- Stockage des médias.
- Services de surveillance.

Le frontend public et l'admin doivent utiliser des contrats de données cohérents.

L'admin ne doit pas accéder directement à la base de données ou au stockage privé des médias. Toutes les opérations doivent passer par des interfaces serveur autorisées.

\### Modèle de données

Étudie les entités suivantes :

- AdminUser.
- Role.
- Permission.
- Session.
- AuditLog.
- Project.
- ProjectTranslation.
- ProjectImage.
- Article.
- ArticleTranslation.
- Category.
- Skill.
- Experience.
- Education.
- Certification.
- PageContent.
- PageTranslation.
- Media.
- SeoMetadata.
- SiteSettings.
- Backup.
- SecurityIncident.

Définis les relations, les contraintes, les index et les règles d'intégrité.

Ne crée pas toutes les entités si certaines ne sont pas nécessaires.

\### API

Définis les contrats API :

- Authentification.
- Gestion des projets.
- Gestion des articles.
- Gestion des contenus.
- Gestion des médias.
- Gestion des utilisateurs.
- Gestion des sessions.
- Journalisation.
- Surveillance.
- Sauvegardes.

Utilise une validation stricte des données, une documentation OpenAPI et des réponses d'erreur cohérentes.

Si une API existante est présente, analyse-la et réutilise-la lorsque c'est pertinent au lieu d'inventer de nouveaux endpoints.

\### Livrable

- Diagramme d'architecture.
- Modèle de données.
- Contrats API.
- Organisation des projets.
- Stratégie de sécurité.
- Stratégie de déploiement.

\---

\# PROMPT 09 — DÉVELOPPEMENT PROGRESSIF

Les spécifications, les maquettes et l'architecture sont validées.

Commence le développement de l'espace admin par modules.

Ordre recommandé :

1. Initialisation et configuration.
1. Authentification.
1. Sessions et permissions.
1. Dashboard.
1. Gestion des projets.
1. Gestion des textes.
1. Gestion des Insights.
1. Gestion des médias.
1. Gestion des expériences et formations.
1. Gestion des compétences.
1. Traductions.
1. SEO et paramètres.
1. Journalisation.
1. Surveillance.
1. Sauvegardes.

Pour chaque module :

- Analyse les dépendances.
- Développe le backend.
- Développe le frontend.
- Valide les données.
- Ajoute les protections nécessaires.
- Teste les opérations.
- Vérifie la connexion au site public.
- Documente le fonctionnement.

Ne développe pas tous les modules simultanément.

Après chaque module, présente les fichiers modifiés, les fonctionnalités opérationnelles et les tests réalisés.

\---

\# PROMPT 10 — TESTS, AUDIT DE SÉCURITÉ ET MISE EN PRODUCTION

Réalise un audit complet de l'espace admin.

\### Tests fonctionnels

Vérifie :

- Connexion et déconnexion.
- Gestion des sessions.
- Création et modification des projets.
- Publication et dépublication.
- Modification des textes.
- Gestion des articles.
- Upload des images.
- Traductions.
- Gestion des paramètres.
- Prévisualisation.
- Journalisation.

\### Tests de sécurité

Teste notamment :

- Accès non autorisé aux routes.
- Contournement des permissions.
- Tentatives de connexion répétées.
- Protection CSRF.
- Risques XSS.
- Validation des fichiers.
- Gestion des sessions expirées.
- Accès aux ressources privées.
- Exposition de données sensibles.
- Sécurité des journaux.

\### Tests de surveillance

Vérifie :

- Remontée des événements.
- Détection des erreurs.
- Alertes.
- Historique des incidents.
- État des sauvegardes.
- Possibilité de restauration.

\### Tests de cohérence

Vérifie que les modifications effectuées dans l'administration sont réellement visibles sur le site public après publication.

\### Livrable final

Produis :

- Rapport de tests.
- Rapport de sécurité.
- Liste des anomalies.
- Corrections réalisées.
- Documentation technique.
- Documentation utilisateur.
- Procédure de sauvegarde et de restauration.
- Procédure de déploiement.

Ne déclare pas le système sécurisé sur la seule base de tests automatisés. Signale les contrôles restant à effectuer.

\---
