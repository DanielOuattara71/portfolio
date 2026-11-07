# Étape 17 — Audit et optimisation

Audit réalisé le 2026-11-07 sur le **build de production** (`pnpm build` puis `node .output/server/index.mjs`), avec Lighthouse 12.8 (mobile et desktop) et des contrôles automatisés dans Chrome. Pages testées : accueil FR/EN, projets, deux études de cas, profil, expertise, contact, mentions légales et page 404.

Écrans testés : grand écran 1920 px, portable 1366 px, tablette 820 px (tactile), smartphone 390 px (tactile).

## Résultat en bref

| | Avant | Après |
|---|---|---|
| Accessibilité (Lighthouse) | 93–100 | **100 sur toutes les pages** |
| SEO (Lighthouse) | 92–100 | **100 sur toutes les pages** |
| Bonnes pratiques | 100 | 100 |
| Débordement horizontal | 1 (mobile, logo) | 0 |
| Erreurs console | 0 | 0 |
| JS chargé sur mobile | GSAP + Lenis + zod sur la plupart des pages | Lenis seulement à la souris, zod seulement sur Contact |

La note de performance locale n'est pas fiable sur cette machine (WSL, ~4 Go, processeur déjà chargé à 50 %). La même page mesurée deux fois de suite donne un temps de blocage de 1,6 s puis 0,9 s. Les vrais chiffres seront mesurés sur Vercel, à l'étape mise en production.

## Demande ajoutée : un lien par projet

- Nouveau module `@portfolio/shared/project` : types de liens `demo`, `code`, `store`, `doc` et règle `projectLinksSchema` (**au moins un lien**, en `https`). L'admin et l'API l'appliqueront avant publication.
- Page projet : les liens deviennent des boutons visibles sous l'accroche (premier lien en bouton principal), ouverts dans un nouvel onglet et annoncés comme tels aux lecteurs d'écran.
- En mode relecture, un projet sans lien affiche « Lien à fournir (obligatoire avant publication) ».
- **À fournir** : les adresses réelles (site, dépôt GitHub, store…) des 5 projets. Aucune n'a été inventée.

## Performance

| Point | Constat | Correction |
|---|---|---|
| Compression | Le serveur local envoyait JS et CSS non compressés (~450 Ko de trop) | `nitro.compressPublicAssets` (gzip + brotli). Vercel compresse aussi de son côté |
| Code splitting | zod (~23 Ko compressé) chargé sur l'accueil et les études de cas, via les constantes partagées | Constantes déplacées dans `@portfolio/shared/constants`, sans zod ; zod ne se charge plus que sur Contact |
| Bibliothèques | Lenis (défilement doux) chargé partout, alors qu'il ne sert qu'à la souris | Import dynamique : les écrans tactiles ne le téléchargent plus |
| Animations | Ruban des technologies animé en continu, même hors écran | Mis en pause hors écran ; `will-change: transform` |
| Animations | Point « Disponible » animé via `box-shadow` (repeint à chaque image) | Halo en `transform` + `opacity` ; figé si réduction des animations |
| Images | Pas encore d'images réelles | `loading="lazy"` + `decoding="async"` sur les cartes ; `fetchpriority="high"` sur l'image principale d'une étude de cas |
| Polices | Poppins auto-hébergée, 24 fichiers woff2 (~9 Ko chacun) découpés par alphabet ; le navigateur ne télécharge que ceux utilisés | Rien à changer |
| À l'arrêt | Aucune boucle JavaScript ni recalcul de mise en page en continu | — |

Points restants, à traiter à l'étape 18 (audit des animations) :
- Le temps de blocage au chargement vient surtout de l'intro (première visite), de l'entrée du hero et de la découpe des textes en lignes. C'est un choix artistique validé : il sera réglé finement, sans le dénaturer.
- Le JS principal (~92 Ko compressé) contient GSAP et ses plugins. Ils sont utilisés sur toutes les pages.

## Responsive

- **Corrigé** : sur mobile, le texte du logo poussait le bouton menu hors de l'écran (+46 px de défilement horizontal). Il se coupe maintenant avec « … ».
- 4 tailles × 10 pages : aucun débordement, aucune erreur, aucun titre sauté, un seul `h1` par page.
- **Zones tactiles agrandies** (minimum 24 px, WCAG 2.5.8) : liens du pied de page, « ← Retour aux projets », liens projets de la page Expertise, case de consentement du formulaire (elle rétrécissait à 13 px sur mobile).
- **Textes trop petits** : badges, niveaux de compétence et mentions du pied de page passent de 10 px à 11 px ; compteurs des filtres de 9 px à 10 px.

## Accessibilité

| Point | Constat | Correction |
|---|---|---|
| ARIA | L'animation des textes (SplitText) laissait des `aria-label` sur des paragraphes (interdit) | Option `aria: 'none'` : la découpe en lignes garde le texte lisible tel quel |
| Contraste | Le mot fantôme décoratif était testé comme du texte (contraste 1,09:1) | Dessiné en CSS (`::before` + `data-word`) : purement décoratif |
| Nom accessible | Logo nommé « Accueil » alors qu'il affiche « Software & Data Engineer » ; FR/EN nommés « Français » / « English » | Le nom commence par le texte visible, suivi d'un complément pour les lecteurs d'écran (commande vocale « cliquer FR ») |
| Langue | La page 404 annonçait `lang="en"` même sous `/fr` | Langue définie dans `error.vue` |
| Réduction des animations | — | Vérifié sur 5 pages : tout le contenu est visible, pas d'intro, aucune erreur |
| Focus clavier | Anneau visible partout ; la barre de recherche l'affiche sur son conteneur | — |
| Textes alternatifs | Toutes les images en ont un | — |

## SEO

| Point | Constat | Correction |
|---|---|---|
| Descriptions | Absentes sur projets, profil, expertise et contact ; accueil réduit au titre | Description par page et par langue (110–165 caractères), écrite à partir de faits confirmés |
| Titres | Sans suffixe tant que le nom n'est pas renseigné (« Profil ») | « Profil · Software & Data Engineer » ; le nom remplacera le titre une fois saisi |
| Open Graph / Twitter | Pas de titre, description ni image de partage | `og:title`, `og:description`, `og:image` (1200×630) et équivalents Twitter sur chaque page, via `usePageSeo()` |
| Image de partage | Absente | `public/og-image.png`, aux couleurs du site, sans nom ni photo inventés. À régénérer quand le nom sera connu |
| Données structurées | Aucune | `WebSite` sur tout le site ; `BreadcrumbList` + `CreativeWork` sur chaque étude de cas ; `Person` ajouté automatiquement dès que le nom est renseigné |
| Sitemap | URLs sans lien entre versions FR et EN | Chaque URL liste ses versions `fr`, `en` et `x-default` (`xhtml:link`) |
| Métadonnées multilingues | `hreflang`, `canonical`, `og:locale` déjà présents | — |
| Robots | `robots.txt` avec un sitemap en URL absolue ; mentions légales et confidentialité en `noindex` | — |

## Fichiers principaux modifiés

- `packages/shared` : `constants.ts` (nouveau, sans zod), `project.ts` (règle des liens), `index.ts` (réexporte les constantes).
- `apps/web/app/composables/usePageSeo.ts` (nouveau), `app.vue` (titre de repli, données structurées), toutes les pages (descriptions).
- `apps/web/server/routes/sitemap.xml.get.ts` (alternates).
- `apps/web/nuxt.config.ts` (compression), `plugins/motion.client.ts` (Lenis à la demande).
- Composants : `NavBar`, `LangToggle`, `SectionTitle`, `TechRibbon`, `StatusPill`, `Badge`, `LevelTag`, `FilterChips`, `SiteFooter`, `Button` (`external`), `ProjectCard`, pages `projets/[slug]`, `expertise`, `contact`, `error.vue`.
- `apps/web/public/og-image.png`.
