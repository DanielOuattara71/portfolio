# Documentation utilisateur (en français)

> Guide d'utilisation de l'administration du portfolio. Aucune connaissance technique requise.
> Les termes entre « guillemets » sont les libellés exacts de l'interface.

## 1. Se connecter et se déconnecter

1. Ouvre l'adresse de l'admin (par exemple `http://localhost:3002` en local).
2. Saisis ton **email** et ton **mot de passe** (12 caractères minimum).
3. Saisis le **code à 6 chiffres** de ton application de double authentification (Google Authenticator, Authy…).
4. Tu arrives sur le **tableau de bord**.

Pour te déconnecter, utilise le bouton de déconnexion. Ta session dure **2 heures sans activité** (7 jours maximum). Après une restauration de sauvegarde, **tu devras te reconnecter** : toutes les sessions sont révoquées.

## 2. Publier un projet

1. Va dans **Projets** → **Nouveau projet** (ou clique sur un projet existant).
2. Remplis les onglets **Général** (FR et EN), **Étude de cas**, **Médias**, **Liens**, **SEO**.
   - Les textes longs sont des zones de texte simples : une liste par ligne, un paragraphe par bloc de texte séparé par une ligne vide.
   - Le bloc « Avant publication » liste ce qui manque.
3. L'enregistrement est automatique (3 secondes après ta dernière frappe). Tu peux aussi forcer avec **Ctrl+S**. En cas de conflit (un second onglet a modifié le même projet), on te propose de recharger ou de comparer : **rien n'est écrasé**.
4. **Publier** : le projet apparaît immédiatement sur le site. **Soumettre** (éditeur) envoie en révision à un administrateur.
5. **Dépublier** retire le projet du site sans le supprimer. **Archiver** le classe hors liste. **Supprimer** exige une session récente (re-saisie mot de passe + code) et la saisie du nom du projet.

## 3. Changer un texte du site

Va dans **Textes du site**, choisis le bloc à gauche, modifie FR et/ou EN à droite, puis **Publier**. Les libellés de boutons et d'erreurs restent dans les fichiers de langue (non modifiables ici).

## 4. Gérer les images

1. Va dans **Médiathèque** → glisse-dépose ou **Importer** (plusieurs fichiers à la fois).
2. Chaque image est vérifiée : type réel (JPEG, PNG, WebP, AVIF, PDF), taille (10 Mo image, 15 Mo PDF, 8 000 px max). Un fichier déguisé est refusé avec le motif.
3. Les images sont ré-encodées sans métadonnées ni GPS (EXIF retirés), en WebP 480/960/1 600/2 400 px (jamais agrandies).
4. **Le texte alternatif (FR et EN) est obligatoire** avant publication d'un contenu qui utilise l'image : le site l'utilise pour l'accessibilité.
5. Supprimer un fichier utilisé est **refusé** (on te montre où il est utilisé). Sinon il va à la **corbeille** (30 jours), d'où tu peux le restaurer.
6. Les fichiers restent **privés** tant qu'aucun contenu publié ne les utilise.

## 5. Boîte de réception

Va dans **Boîte de réception**. Lire un message le passe « lu ». Les actions **Répondu** et **Archiver** horodatent le message. La suppression exige ta re-saisie (session récente). Les messages archivés sont supprimés automatiquement après **12 mois**. Le formulaire du site est fermé si **Contact** est désactivé dans Paramètres (les visiteurs voient un message au lieu du formulaire).

## 6. Sécurité et surveillance

Va dans **Sécurité et surveillance** :

- les 4 sondes (site, API, base, stockage) avec leurs courbes 24 h ;
- les **alertes** : prends-les en charge ou résous-les ;
- les **incidents** : ajoute des notes horodatées ; la résolution exige une note de résolution ;
- « journal intègre / rompue » indique l'état de la chaîne du journal.

Une alerte critique ouvre automatiquement un incident. Un email est envoyé à l'adresse des Paramètres (au plus une par heure par règle).

## 7. Sauvegardes

Va dans **Sauvegardes** :

- **Lancer une sauvegarde** : crée un export chiffré et vérifié (une sauvegarde planifiée part aussi chaque jour à 3 h UTC).
- **Vérifier** : relit et déchiffre le fichier sans rien modifier.
- **Restaurer** : remplace tout par la sauvegarde (ton session récente est exigée). Une sauvegarde de l'état actuel est faite automatiquement avant. Tu seras déconnecté.
- **Partielle** : réinjecte un seul contenu (par exemple un projet supprimé par erreur) **comme brouillon** — jamais directement publié.
- Le tableau de bord affiche « non vérifiées » tant qu'aucun essai de restauration n'a réussi.

## 8. Retrouver un compte perdu

- **Mot de passe oublié** : « Mot de passe oublié » sur la page de connexion → lien valable 30 minutes reçu par email. Toutes les sessions sont fermées.
- **Téléphone de double authentification perdu** : utilise l'un des **10 codes de secours** générés à l'activation (ils sont à conserver hors ligne). Chaque code ne sert qu'une fois ; régénère-les après usage.
- **Plus aucun accès** (ni code de secours ni email) : il faut un accès direct à la base (voir les procédures techniques) — le premier compte administrateur se recrée par la commande `pnpm --filter @portfolio/api admin:create`.
- **Connexion inconnue** : si tu reçois « Nouvelle connexion à l'administration » pour un appareil inhabituel, vérifie d'abord qu'il ne s'agit pas de toi (nouveau navigateur, appareil, VPN). Sinon, révoque la session (page Sessions) et change ton mot de passe.

## 9. Les rôles

- **Administrateur** : tout faire, double authentification obligatoire.
- **Éditeur** : écrire, soumettre, importer des images, lire la boîte ; ne pas publier.
- **Lecteur** : consulter ; la boîte ne montre que le compteur de non lus.

## 10. Journal d'activité

Va dans **Journal d'activité** pour voir tout ce qui a été fait (qui, quoi, quand, avec quel résultat). IP tronquée et appareil en famille seulement ; aucun mot de passe, code, cookie ou jeton n'y figure jamais. Conservé 12 mois.
