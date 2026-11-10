# Procédures : sauvegarde, déploiement, rotation des secrets

> Livrable du **Prompt 10** (module 11). À exécuter dans l'ordre pour la mise en production (étape 20 de `prompt_workflow.md` et module 10 de `prompt-suite-developpement.md`).

## 1. Sauvegarde et restauration

### 1.1 Sauvegarde de référence (du jour de la mise en ligne)

Le planificateur Upstash QStash appelle quotidiennement :

- `POST /internal/checks` toutes les 5 min ;
- `POST /internal/backup` et `POST /internal/maintenance` 1 fois par jour (3 h UTC pour la sauvegarde).

Authentification : signature QStash (`QSTASH_CURRENT_SIGNING_KEY`, rotation possible avec `QSTASH_NEXT_SIGNING_KEY`). En dev, le script local fait la même chose (`pnpm --filter @portfolio/api internal -- checks|backup|maintenance`).

La sauvegarde est déroulée dans `services/backup.ts` : export JSON de 12 tables en transaction en lecture seule → empreinte SHA-256 → chiffrement AES-256-GCM → dépôt **privé** (dossier `.backups` en local, ressources `raw` préfixées `backups` sur Cloudinary en production) → **relecture + déchiffrement + vérification** → ligne d'historique (`backup`). Conservation : 42 fichiers les plus récents (30 quotidiennes + 12 mensuelles). **Sans `BACKUP_ENCRYPTION_KEY`, une sauvegarde est illisible : la clé doit aussi vivre dans le gestionnaire de mots de passe.**

### 1.2 Restauration (depuis l'admin, administrateur, session récente 🔐)

1. **Vérifier** d'abord la sauvegarde choisie (déchiffrement, empreinte, version du schéma, comptages).
2. Le système fait automatiquement une **sauvegarde de sécurité** de l'état actuel.
3. Restauration en **une transaction** (FK-safe ; les lignes du journal, de la surveillance et de l'historique des sauvegardes restent en place).
4. **Sessions révoquées** (reconnexion), site rafraîchi, événement journalisé, email de confirmation (si Resend configuré).

Restauration partielle : un contenu seul, réinjecté en **brouillon** (journalisé). Version de schéma différente : restaurer dans une base vide puis appliquer les migrations ; une sauvegarde plus récente que le code est refusée.

### 1.3 Essai de restauration (obligatoire)

| Quand | Quoi |
|---|---|
| Avant la mise en production | Restauration complète d'un export dans la base Docker locale, parité du contenu public (fait le 2026-11-08 : identique) |
| Chaque mois | Même essai sur la dernière sauvegarde mensuelle ; le tableau de bord affiche « vérifiées » seulement après un essai réussi |
| Après chaque changement du modèle de données | Essai avec une sauvegarde antérieure (mise à niveau par les migrations) |

Niveau 1 (retour dans le temps) : **Neon** (restauration à un instant donné, selon l'offre). Niveau 2 (export chiffré Cloudinary) : panne de l'hébergeur, suppression du projet Neon, erreur ancienne. Base perdue au-delà de Neon : nouvelle base Neon → migrations → restauration du dernier export → `DATABASE_URL` mise à jour → vérification du site.

## 2. Déploiement (mise en production)

1. **Neon** : base `main` + rôle `app` **sans `UPDATE` ni `DELETE` sur `audit_log`** (les déclencheurs sont la seconde défense ; le rôle API doit être restreint). `DATABASE_URL` = l'URL Neon dans Vercel.
2. **Migrations** : `pnpm --filter @portfolio/api db:migrate`, puis `db:seed`, puis `db:seed:blocks`, puis création de l'administrateur (`admin:create`).
3. **Vercel — 3 projets** : `apps/web` (site), `apps/admin` (admin), `apps/api` (API). Réécriture `/api/*` de l'admin vers l'API. Vérifier l'origine du cookie de session (même origine que l'admin).
4. **Variables d'environnement** (secrets en variables Vercel, jamais en dépôt) : `.env.example` donne la liste ; y ajouter `SITE_REVALIDATE_URL`, `REVALIDATE_TOKEN`, `NUXT_REVALIDATE_TOKEN`, `BACKUP_ENCRYPTION_KEY`, `QSTASH_*`, `UPSTASH_*`, `SENTRY_DSN`.
5. **Cloudinary** : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` ; dossiers publics `portfolio/public/*` et privés `portfolio/private/*` (confidentialité par identifiant UUID non devinable, pas d'accès public indexé) ; activer la livraison des PDF et des fichiers `raw` dans les paramètres de sécurité du cloud ; **et test réel du pilote Cloudinary** (envoi signé multipart, copie publique, dépôt des sauvegardes sous le préfixe `backups` en type `raw`, vérifiable via l'Admin API).
6. **Resend** : domaine d'envoi vérifié, `RESEND_API_KEY` + `MAIL_FROM` ; tester la réception réelle (alertes, mot de passe oublié, nouvelle connexion).
7. **Upstash QStash** : planificateurs (checks 5 min, backup + maintenance quotidiens) avec `QSTASH_CURRENT_SIGNING_KEY` ; verifier les en-têtes de signature.
8. **Sentry** : projet Sentry, `SENTRY_DSN` + `NUXT_PUBLIC_SENTRY_DSN` ; collecte d'IP désactivée de toute façon.
9. **CSP** : d'abord en mode rapport, puis appliquée ; vérifier les en-têtes de sécurité.
10. **Essai de restauration** (§1.3) puis **Lighthouse en production**.

## 3. Rotation des secrets

| Secret | Rotation | Effet |
|---|---|---|
| `BETTER_AUTH_SECRET` | nouveau secret aléatoire, redéploiement, puis reconnexion des utilisateurs | **invalide toutes les sessions** ; les signatures d'envoi de médias en cours expirent (5 min) |
| `ADMIN_PROXY_SECRET` | même valeur admin + API, redéploiement des deux | coupure brève de l'admin le temps du redéploiement |
| `BACKUP_ENCRYPTION_KEY` | nouveau secret ; les anciennes sauvegardes deviennent illisibles (à noter dans le journal) | sauvegardes antérieures **définitivement illisibles** : organiser la transition avant expiration des 42 fichiers conservés |
| `QSTASH_CURRENT_SIGNING_KEY` | passer l'ancienne en `QSTASH_NEXT_SIGNING_KEY`, la nouvelle en current ; garder l'ancienne un cycle complet | aucune coupure (les deux signatures sont acceptées) |
| `RESEND_API_KEY`, clés Cloudinary, `SENTRY_DSN` | clés révoquées chez le fournisseur + nouvelles valeurs | aucun effet de bord applicatif |
| `NUXT_REVALIDATE_TOKEN` | même valeur site + API avant redéploiement | rafraîchissement manuel en échec pendant la transition (cache 60 s reste le filet) |

Règle générale : toute rotation est **journalisée** (événement `auth`/`backup` ou noting manuel) et les anciennes sauvegardes concernées sont signalées dans l'historique des sauvegardes.

## 4. Incidents rapides

| Situation | Action |
|---|---|
| Contenu modifié/supprimé par erreur | Historique des versions du contenu ; sinon restauration partielle (brouillon) |
| Erreur importante des dernières heures | Retour dans le temps Neon |
| Base perdue / projet Neon supprimé | §1.3 |
| Média supprimé par erreur | Corbeille (30 jours) |
| Compte administrateur inaccessible | Codes de secours ; sinon accès direct à la base : `alter table "user" disable trigger user_keep_one_admin` (locale uniquement), réactivation 2FA ou recréation (`admin:create`), puis réactivation du déclencheur |
| Journal rompu | Site **Sécurité et surveillance** → alerte `audit.chain_broken` ; la maintenance quotidienne la signale ; investigation via les alertes Sentry (si configuré) |

## 5. Rappels maintenance

- Purges quotidiennes automatiques (journal 12 mois, tentatives 90 jours, sessions 30 jours, messages archivés 12 mois, corbeille médias 30 jours avec fichiers privés+publics, envois abandonnés 1 h) + contrôle de la chaîne du journal.
- Mesures des sondes : 30 jours détaillées, puis moyennes journalières 12 mois.
- Incidents conservés 24 mois ; erreurs Sentry selon l'offre (90 jours en gratuit).
