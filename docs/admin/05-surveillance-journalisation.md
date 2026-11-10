# Admin · Étape 05 — Surveillance et journalisation

> Livrable du **Prompt 05** de [admin_portfolio.md](../../admin_portfolio.md). **Statut : conception**, rien n'est encore en place.
> Règle : l'admin n'affiche **que des indicateurs réellement mesurés**. Une mesure absente s'affiche « non disponible ».

## A. Journal d'activité

### Événements enregistrés

| Catégorie | Événements |
|---|---|
| Authentification | Connexion réussie, connexion échouée, déconnexion, double authentification activée ou désactivée, codes de secours régénérés, mot de passe modifié ou réinitialisé, session révoquée |
| Contenus | Création, modification (point de sauvegarde manuel), soumission en révision, publication, dépublication, archivage, restauration d'une version, suppression |
| Médias | Import, remplacement, suppression, refus d'un fichier (type ou taille) |
| Paramètres | Toute modification (champ concerné, sans la valeur s'il s'agit d'une donnée sensible) |
| Comptes | Invitation, création, modification, changement de rôle, suppression |
| Système | Sauvegarde lancée, réussie, échouée ; restauration ; alerte ouverte ou résolue |
| Boîte de réception | Suppression d'un message |

L'enregistrement automatique (toutes les 3 s) n'est **pas** journalisé, pour ne pas noyer le journal.

### Contenu d'un événement

| Champ | Exemple |
|---|---|
| Date et heure (UTC, affichée dans ton fuseau) | 2026-11-07 14:32:05 |
| Utilisateur | Compte et rôle au moment de l'action (ou « anonyme » pour un échec de connexion) |
| Action | `project.publish` |
| Ressource | Projet `PRJ-02` « Retrouve Moi » |
| Résultat | Succès, échec, refusé (droits) |
| Gravité | Info, attention, critique |
| Contexte | Identifiant de requête, adresse IP **tronquée** (`41.202.x.x`), ville approximative, navigateur et système (sans version complète), champs modifiés (noms, pas les valeurs sensibles) |

**Jamais enregistrés** : mots de passe, codes de double authentification, cookies, jetons, clés, contenu des messages de contact.

### Protection du journal

- **Ajout seulement.** Le compte de base de données de l'API peut ajouter et lire des événements, mais pas les modifier ni les supprimer (droits Postgres).
- **Chaînage.** Chaque événement contient l'empreinte (SHA-256) du précédent. Une modification ou une suppression manuelle casse la chaîne, et le contrôle quotidien la signale.
- **Purge** des événements de plus de 12 mois par une fonction dédiée, seule autorisée à supprimer, et elle-même journalisée.

## B. Surveillance des connexions

| Vue | Contenu |
|---|---|
| Historique des connexions | Réussies et échouées, avec appareil, ville approximative, résultat |
| Tentatives échouées | Regroupées par compte et par adresse, sur 24 h et 7 jours |
| Sessions actives | Tous les comptes (administrateur) ou les siennes ; dernière activité ; bouton « Révoquer » |
| Dernière activité | Par compte |

### Comportements anormaux détectés

| Règle | Gravité | Réaction |
|---|---|---|
| 5 échecs sur un compte en 15 min | Attention | Blocage temporaire (étape 04), alerte dans l'admin |
| 10 échecs sur un compte en 1 h, ou 20 depuis une même adresse | Critique | Alerte email + incident |
| Connexion depuis un appareil jamais vu | Info | Email « nouvelle connexion » avec lien pour révoquer la session |
| Connexion depuis un pays inhabituel | Attention | Même email, mention du pays. **Ce n'est pas une preuve de compromission** (voyage, VPN) : simple signalement |
| Désactivation de la double authentification, changement de rôle | Critique | Alerte email |

## C. Surveillance technique

| Indicateur | Mesure | Fréquence |
|---|---|---|
| Disponibilité du site public | Requête sur la page d'accueil (FR) : code HTTP et temps de réponse | 5 min |
| Disponibilité de l'API | `GET /health` : code et temps de réponse | 5 min |
| Base de données | Requête `select 1` depuis `/health`, avec durée | 5 min |
| Stockage des médias | Lecture d'un petit fichier témoin sur R2 | 5 min |
| Erreurs backend | Réponses 5xx de l'API, comptées par tranche de 5 min et détaillées dans **Sentry** | En continu |
| Erreurs applicatives | Erreurs JavaScript du site et de l'admin (Sentry, sans données personnelles) | En continu |
| Temps de réponse | Médiane et 95ᵉ centile des sondes, sur 24 h et 7 jours | Calculé |
| Sauvegardes | Date, taille, résultat, vérification d'intégrité de la dernière sauvegarde (étape 06) | Quotidienne |

Fonctionnement : un planificateur externe (**Upstash QStash**, déjà prévu dans la pile) appelle toutes les 5 min une route interne de l'API, protégée par signature. Elle exécute les sondes et enregistre chaque résultat en base. Le planificateur de Vercel (offre gratuite) ne s'exécute qu'une fois par jour : insuffisant pour la disponibilité.

Limite connue : si l'API elle-même est hors service, elle ne peut pas enregistrer sa propre panne. Le planificateur conserve alors l'échec de l'appel et le signale par email. L'admin indique « aucune mesure depuis X min ».

## D. Alertes

| Déclencheur | Gravité | Canal |
|---|---|---|
| Échecs de connexion répétés (règles B) | Attention / critique | Admin + email si critique |
| Activité suspecte (règles B) | Selon la règle | Admin + email |
| 10 erreurs 5xx ou plus en 5 min | Critique | Admin + email |
| Sonde en échec 2 fois de suite | Critique | Admin + email ; message de rétablissement envoyé au retour |
| Sauvegarde échouée ou vérification ratée | Critique | Admin + email |
| Modification d'un paramètre de sécurité, changement de rôle | Attention | Admin + email |
| Chaîne du journal rompue | Critique | Admin + email |

- Canaux : **notification dans l'admin** (pastille sur le tableau de bord) et **email** (Resend) vers l'adresse des administrateurs.
- Anti-déluge : une même alerte ouverte ne renvoie pas d'email plus d'une fois par heure ; elle est regroupée.

## E. Tableau de surveillance

Page « Sécurité et surveillance » :
- état des services : site, API, base, stockage, avec dernière mesure et temps de réponse ;
- alertes ouvertes, par gravité ;
- événements récents, filtrables par gravité, utilisateur, action, date ;
- sessions actives ;
- dernière sauvegarde et son résultat ;
- historique des incidents ;
- état de la chaîne du journal (intègre / rompue, dernier contrôle).

## F. Incidents

| Fonction | Détail |
|---|---|
| Création | Automatique à partir d'une alerte critique, ou manuelle |
| États | Ouvert → pris en charge → résolu |
| Contenu | Titre, gravité, alerte d'origine, événements liés (liens vers le journal), notes horodatées, auteur de chaque note |
| Résolution | Note de résolution obligatoire ; l'historique est conservé |
| Réouverture | Possible, journalisée |

## Conservation et minimisation

| Donnée | Durée | Minimisation |
|---|---|---|
| Journal d'activité | 12 mois | IP tronquée, navigateur sans version complète |
| Tentatives de connexion | 90 jours | Email tenté conservé seulement s'il correspond à un compte existant |
| Sessions expirées ou révoquées | 30 jours | — |
| Mesures des sondes | 30 jours détaillées, puis moyennes journalières 12 mois | — |
| Incidents | 24 mois | — |
| Erreurs Sentry | Durée de l'offre Sentry (90 jours en gratuit) | Collecte des adresses IP et des données personnelles désactivée |

Ces durées seront indiquées dans la page Confidentialité.
