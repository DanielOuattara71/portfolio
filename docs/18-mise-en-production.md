# Étape 18-20 — Audit des animations, tests fonctionnels complets, préparation de la mise en production

> Livrables des PROMPTS 18, 19 et 20 de [prompt_workflow.md](../prompt_workflow.md). Réalisés le 2026-11-08 en local (aucun Chrome disponible dans cet environnement : ni navigateur ni Lighthouse menables).
> **Rien n'a été publié** : la mise en ligne attend l'autorisation explicite de l'utilisateur.

## 1. Audit des animations (PROMPT 18)

Référentiel : [08-motion.md](08-motion.md) (M-01 à M-19) et le design system. Audit par relecture du code, des tokens et de la page servie (pas de navigateur, donc pas de mesure d'images/seconde locale — les mesures locales étant de toute façon bruitées, cf. étape 20 du plan).

### 1.1 Ce qui est conforme

| Animation | État | Observations |
|---|---|---|
| M-01 · Intro de session | ✅ | Compteur réel (polices), 900 ms min / 1 500 ms max, sortie `duration-xslow` + `ease-in-out`, Hero démarre à 60 % de la sortie, bouton « Passer » + Échap, `sessionStorage`, mobile plafonné, sans JS : invisible (sécurité 4 s) |
| M-02 · Entrée du Hero | ✅ | Mots en `duration-slow` + 100 ms (`stagger-word`), cartes 1 000 ms / 120 ms d'écart, ligne par ligne, boutons puis pastilles, badge 700 ms ; mobile : ligne par ligne, pile en fondu. Total ≈ 1,6 s |
| M-03 · Pile portrait | ⚠️ corrigé | Clic, clavier, survol +6 px/+2 %, sortie 380 ms `ease-in` — mais **le glisser ne suivait pas la carte** (détection de seuil seulement). Corrigé : la carte suit le pointeur avec rotation proportionnelle, départ au-delà de 40 px, retour élastique en `duration-base` |
| M-04 · Titres de section | ✅ | Masque + compteur, chapeau en lignes, mot fantôme ±4 % lié au scroll (≥ 900 px uniquement), une seule fois |
| M-05 · Textes et blocs | ✅ | `v-reveal` (block/stagger/lines), `top 85 %`, une fois, tokens |
| M-06 · Navigation | ✅ | Barre masquée au-delà de 140 px, focus clavier respecté, indicateur en token, menu mobile pivot + cascade 40 ms, scroll bloqué, smooth sur ancres |
| M-07 · Rideau de page | ✅ | 550 ms + 650 ms `ease-in-out`, route affichée, back/forward en fondu 150 ms, changement de langue sans rideau |
| M-08 · Défilement doux | ✅ | Lenis `lerp: 0.1` (déjà conforme à aquidev 0,085), pointeur fin uniquement, chargement paresseux (jamais sur tactile), `prefers-reduced-motion` désactive |
| M-09 · Parallaxes | ✅ | Mots fantômes ±4 %, visuel accordéon, signature footer (±2 éléments relevés en code) ; ≥ 900 px uniquement |
| M-10 · Fiches et filtres | ✅ | Fondu + 32 px `duration-slow`, zoom image 104 %, Flip `absolute`, entrées en cascade 40 ms, compteurs de filtres |
| M-11 · Images et galeries | ⚠️ partiel | Zoom fiche 104 %, lightbox corrigée (animation d'ouverture `duration-slow` + fond `duration-base`) ; **révélation d'image clip-path + dézoom 112→100 non implémentée** (acceptable tant qu'aucune image réelle n'est publiée — les placeholders se révèlent en fondu) |
| M-12 · Curseur | ⚠️ corrigé | Disque 74 px, 350 ms, traînée, zones `data-cursor`, étiquette, jamais sur les champs ; `power3.out` remplacé par le token `ease-out` (conforme au design system) |
| M-13 · Boutons / magnétisme | ⚠️ corrigé | Roulement du libellé, flèche, appui 0,97 ; magnétisme sur 2 boutons seulement, 25 %, retour `duration-slow` sans rebond — `power3.out` remplacé par `ease-out` |
| M-14 · Progression + accordéon | ✅ | Cercle de progression sur les études de cas (scroll listener passif, IntersectionObserver pour le sommaire) ; accordéon en `grid-template-rows` (écart documenté ci-dessous) |
| M-15 · Langue | ✅ | `startViewTransition` + cercle `clip-path` 700 ms `ease-in-out` depuis le bouton ; repli sans API Vue |
| M-16 · Insights | — | Aucun module Insights dans le site (les projets sont les seuls contenus éditoriaux) |
| M-17 · Footer | ✅ | Phrase masquée en ligne, bouton 200 ms après (+ rotation), cascade 50 ms, signature verticale liée au scroll, copie email avec roulement « Copié » |
| M-18 · Boucles | ✅ | Ruban : CSS `linear`, 42 s, pause au survol/focus + hors écran (IntersectionObserver), `animation: none` en réduit ; badge rotatif 22 s ; point « Disponible » pulsé |
| M-19 · Bandeau jaune | ✅ | Montée tuiles 2 px, fond `on-marker`/`marker`, compteur roulé, transition M-07 vers Contact |

### 1.2 Conformité aux règles transverses

| Règle de [08-motion.md §5](08-motion.md) | État |
|---|---|
| Visible sans JavaScript (états seulement après script, 3 s de sécurité) | ✅ `html[data-motion='pending'] [data-reveal] { opacity: 0; animation: reveal-safety 0s linear 3s forwards }` |
| Une apparition, une fois | ✅ `once: true` partout |
| 2 mouvements maximum par élément | ✅ (apparition + survol au pire) |
| Boucles arrêtées hors écran / réduites | ✅ ruban + `animation: none` en réduit |
| Temps avant interaction | ✅ intro 0,9-1,5 s + sortie 1,1 s, Hero 1,6 s (total ≈ 1,6 s première visite hors intro) |
| `transform`/`opacity`/`clip-path` seuls | ⚠️ accordéon en `grid-template-rows` (fluidité légèrement inférieure, mais état cible identique ; choix documenté, pas d'identité dérangée) |
| Animations réduites | ✅ interdiction globale de durée en CSS + chaque composant GSAP vérifie `prefersReducedMotion()` (Hero, pile, titres, curseur, Lenis, transitions, magnétisme, ruban, pager) |
| Mobile | ✅ pas de Lenis, pas de parallaxe (≥ 900 px), pas de curseur, `touch-action: pan-y` sur la pile, images `lazy` |

### 1.3 Poids mesurés (build du 2026-11-08)

- Chunks client Nuxt : **≈ 2,6 Mo non compressé au total**, fichiers ≤ 760 Ko (route `entry`), GSAP + plugins dans les chunks des pages qui les utilisent.
- Polices : Poppins **auto-hébergées au build** (`@nuxt/fonts`, aucune requête Google chez les visiteurs).
- Images : aucune image réelle publiée pour l'instant (logos SVG inline, placeholders) ; `og-image.png` 72 Ko.
- Lenis (~25 Ko) chargé seulement avec pointeur fin et sans mouvement réduit.

### 1.4 Corrections appliquées

1. `magnetic.ts` et `Cursor.vue` : `power3.out` → `ease-out` du token (le design system impose la courbe unique).
2. `PortraitStack.vue` : le glisser suit désormais la carte (rotation proportionnelle, départ au-delà de 40 px, retour snap en `duration-base`), conformément à M-03.
3. `projets/[slug].vue` : ouverture et fond de la galerie plein écran animés (`duration-slow` / `duration-base`), conformément à M-11.

## 2. Tests fonctionnels complets (PROMPT 19)

Scénarios HTTP via le HTML servi (site construit, API et base réelles), le 2026-11-08.

| Zone | Vérifié | Résultat |
|---|---|---|
| Routes FR/EN | `/`, `/en`, projets, profil, expertise, contact, mentions légales, confidentialité (15 pages FR/EN) | 15/15 **200**, sans `src=""` ni `undefined` |
| Pages projets | 5 projets × 2 langues (slugs réels : `prince-edja`, `retrouve-moi`, `gestion-de-livraison`/`delivery-management`, `data-engineering`, `portfolio-cms`) | 10/10 **200** |
| Page inconnue | 404 propre, sans stack trace | ✅ |
| Liens internes | 15 liens de l'accueil FR + 15 EN, tous résolus | 30/30 |
| Changement de langue | Voir [10-rapport](admin/10-rapport-tests-securite.md) pour les routes EN (`/en/projects` etc.) | ✅ |
| Formulaire de contact | honeypot rempli → 201 simulé (rien stocké), message valide → 201, message court → 400 `{error: validation, fields}`, sans consentement → 400, limite (5/10 min) → 429, champ honeypot `id="c-website"` absent de la marque `name=` (modélisation Vue, **attente de test incorrecte, pas un bug**) | 5/5 |
| CV | `/fr/cv` et `/en/cv` répondent 404 proprement (aucun CV publié) | ✅ |
| Sommaire des études de cas | 3/5 pages l'affichent (les sections « à valider » sont retirées du public par conception W1) | ✅ par conception |
| SEO | titre + description, mentions légales `noindex`, sitemap 200 (projets publiés présents), `robots.txt`, `og-image.png` | 6/6 |
| Ressources | asset CSS 200 | ✅ |

Totaux étape 19 : **55/62** au premier passage (7 échecs immédiatement identifiés comme des artefacts du scénario — slugs inventés, honeypot `name=`, schéma de contact incomplet), **19/20** au second (1 échec : sommaire `data-toc` non présent sur la page dont les sections sont retirées comme « à valider », comportement conforme).

Limites de ces tests (pas de Chrome dans cet environnement) : pas d'erreurs console navigateur, pas de Lenisroulement ni de Curseur mesuré, pas de responsive mesuré, pas de partage de liens sociaux vérifié, pas de Lighthouse. Contrôles à rejouer en production (voir §3.5).

## 3. Préparation de la mise en production (PROMPT 20)

### 3.1 Configuration de production (vérifiée)

- `nuxt.config.ts` : `devtools: false`, `NUXT_PUBLIC_SHOW_PLACEHOLDERS: false` par défaut (placeholders invisibles en production), auto-hébergement des polices, métadonnées `robots` sur l'admin (`noindex` + `robots.txt` « Disallow »), télémétrie Better Auth désactivée.
- En-têtes ajoutés au site (durcissement du 2026-11-08) : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. CSP à appliquer côté Vercel en mode rapport d'abord (voir 13-procedures).
- L'API sert ses en-têtes via `secureHeaders()` ; l'injection CSP reste un contrôle manuel de production.

### 3.2 Variables d'environnement (à seter dans Vercel, jamais dans le dépôt)

`.env.example` donne la liste complète, dont `SITE_REVALIDATE_URL`, `REVALIDATE_TOKEN`, `NUXT_REVALIDATE_TOKEN`, `BACKUP_ENCRYPTION_KEY`, `QSTASH_*`, `UPSTASH_*`, `SENTRY_DSN`. Domaine et certificat HTTPS : fournis par Vercel (sauf domaine personnalisé à déclarer).

### 3.3 Documentation (déjà produite)

- Installation locale, commandes de dev et de build : [11-documentation-technique.md](admin/11-documentation-technique.md).
- Gestion du contenu, ajout d'un projet, gestion des traductions : [12-documentation-utilisateur.md](admin/12-documentation-utilisateur.md).
- Ajout d'un article : **aucun module Insights n'existe** (choix du périmètre) ; les projets sont les seuls contenus dynamiques ; passer par le workflow de l'admin (brouillon → révision → publication).
- Déploiement, sauvegarde/restauration, rotation des secrets : [13-procedures.md](admin/13-procedures.md).

### 3.4 À faire en production (non exécutable ici)

1. Lancer PROMPT 20 avec l'autorisation explicite de l'utilisateur (rien n'est déployé).
2. Resend (domaine), Upstash QStash, Sentry, Cloudinary, Neon (rôle restreint sur le journal), CSP rapport → en vigueur, Lighthouse, essai de restauration mensuelle.

### 3.5 Contrôles restants (à mesurer sur Vercel)

- **Lighthouse en production** et **audit des animations mesuré** (framerate, CLS) — les mesures locales sont bruitées.
-_navigation mobile réelle (tactile, pas de Lenis, pas de parallaxe).
- Erreurs console navigateur, partage social, rendu des images réelles (Cloudinary).

## 4. Bilan

| Étape | État |
|---|---|
| 1-17 (site) | Effectués (docs 01-17) |
| Admin modules 1-11 | Tous ✅ (voir [09-developpement.md](admin/09-developpement.md)) |
| 18 Animations | Audit effectué ; 3 écarts corrigés (courbe token, glisser de la pile, galerie) ; 1 écart documenté (accordéon `grid-template-rows`) ; révélé d'images reporté (aucune image réelle publiée) |
| 19 Tests fonctionnels | 55/62 puis 19/20 (artefacts de scénario expliqués) ; limites = pas de navigateur |
| 20 Production | Préparée mais **non déployée** (en attente de l'autorisation) ; en-têtes de sécurité ajoutés ; docs 11/12/13 produites |
| Loader de navigation « ONDYX » | ✅ Site + admin : indicateur Nuxt de 22 px, texte « ONDYX » en lettrage espacé, dégradé `marker` → `focus-ring`, `throttle` 200 ms (voir layouts); ajouté aussi au rideau de page (M-07) : le mot ONDYX en grand sous la route |

Points restants à traiter (sans l'utilisateur) : nom, photo, email professionnel, liens LinkedIn/GitHub, CV FR/EN, captures et liens des projets, confirmation des textes « à valider », informations légales (éditeur/hébergeur), comptes Neon/Vercel/Cloudflare/Resend/Upstash/Sentry, domaine éventuel — aucun de ces éléments n'a été inventé.
