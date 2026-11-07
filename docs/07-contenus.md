# Étape 7 — Contenus du site (FR / EN)

> Livrable du **Prompt 07**. Tous les textes, en français et en anglais, organisés selon l'architecture validée ([06-architecture.md](06-architecture.md)).
> Une fois validés, ces textes serviront de **données initiales** de la base. Tu pourras ensuite tout modifier depuis l'admin.

## Conventions

| Marque | Sens |
|---|---|
| **[À COMPLÉTER : …]** | Information que je n'ai pas. À saisir dans l'admin, sinon le champ est masqué sur le site. |
| **[À VALIDER]** | Texte que j'ai déduit de tes informations. Vérifie qu'il est exact avant publication. |
| *mot* | Mot mis en valeur en italique serif (`accent-italic`). |

Règles suivies : première personne, phrases courtes, aucun chiffre ni résultat inventé. L'anglais est écrit pour des lecteurs internationaux, pas traduit mot à mot.

---

## 1. Éléments communs

### Navigation

| Clé | FR | EN |
|---|---|---|
| nav.projects | Projets | Projects |
| nav.profile | Profil | Profile |
| nav.expertise | Expertise | Expertise |
| nav.insights | Insights | Insights |
| nav.contact | Contact | Contact |
| nav.menu | Menu | Menu |
| nav.close | Fermer le menu | Close menu |
| nav.home | Accueil | Home |
| lang.label | Langue | Language |
| status.available | Disponible | Available |
| status.available_long | Disponible · télétravail | Available · remote |

### Boutons et micro-textes

| Clé | FR | EN |
|---|---|---|
| cta.projects | Voir les projets | See my work |
| cta.cv | Télécharger le CV | Download my CV |
| cta.contact | Me contacter | Get in touch |
| cta.start | Démarrer | Let's talk |
| cta.all_projects | Tous les projets | All projects |
| cta.read_profile | Lire le profil | Read my profile |
| cta.see_expertise | Voir l'expertise | See my expertise |
| cta.full_journey | Parcours complet | Full background |
| cta.all_articles | Tous les articles | All articles |
| cta.continue | Continuer | Continue |
| cta.next_project | Projet suivant | Next project |
| cta.back_projects | Retour aux projets | Back to projects |
| cursor.view | voir | view |
| cursor.drag | glisser | drag |
| cursor.open | ouvrir | open |
| cursor.read | lire | read |
| copy.email | Copier l'email | Copy email |
| copy.done | Copié | Copied |
| intro.hello | Bonjour | Hello |
| intro.loading | chargement des enregistrements | loading records |
| intro.skip | Passer | Skip |
| ph.media | capture à fournir | screenshot coming |
| reading.progress | lu | read |

### Footer

**FR**
- Titre : Construisons quelque chose de *fiable*.
- Liens : LinkedIn · GitHub · Email · CV
- Mentions : © 2026 [À COMPLÉTER : Prénom Nom] · Software & Data Engineer · FR · EN · télétravail
- Liens légaux : Mentions légales · Confidentialité

**EN**
- Title: Let's build something *reliable*.
- Links: LinkedIn · GitHub · Email · CV
- Notice: © 2026 [À COMPLÉTER : First Last] · Software & Data Engineer · FR · EN · remote
- Legal: Legal notice · Privacy

---

## 2. Accueil

### 2.1 Hero

| Élément | FR | EN |
|---|---|---|
| Ligne d'enregistrement | record 001 / profile · lang: fr · en · updated: {date réelle} | record 001 / profile · lang: fr · en · updated: {real date} |
| Nom | [À COMPLÉTER : Prénom] / [À COMPLÉTER : Nom] | idem |
| Titre | Software & Data Engineer | Software & Data Engineer |
| Accroche | Du produit à la donnée. | From product to data. |
| Phrase de valeur | Je conçois des applications web et mobiles *de bout en bout*, j'y intègre l'IA et l'automatisation quand elles sont utiles, et je me spécialise dans *la donnée et le cloud*. | I design and build web and mobile apps *end to end*, add AI and automation where they make a real difference, and I'm specialising in *data and cloud*. |
| Bouton 1 | Voir les projets | See my work |
| Bouton 2 | Télécharger le CV | Download my CV |
| Pastille 1 | **5** études de cas | **5** case studies |
| Pastille 2 | **FR · EN** bilingue | **FR · EN** bilingual |
| Pastille 3 | M2 SIGL · **ESATIC** | Master's · **ESATIC** |
| Badge rotatif | SOFTWARE · DATA · CLOUD · IA · WEB · MOBILE · | SOFTWARE · DATA · CLOUD · AI · WEB · MOBILE · |
| Pile, carte 1 | portrait.jpg | portrait.jpg |
| Pile, carte 2 | vue données · 1 bit | data view · 1 bit |
| Pile, carte 3 | role: Software & Data Engineer · focus: web · mobile · IA · data · cloud · langs: fr · en · mode: télétravail international · ville: [À COMPLÉTER] | role: Software & Data Engineer · focus: web · mobile · AI · data · cloud · langs: fr · en · mode: remote, worldwide · city: [À COMPLÉTER] |

> La pastille « 5 études de cas » est calculée : elle affiche le nombre réel de projets publiés.

### 2.2 Ruban technologies
- Libellé accessible — FR : Technologies utilisées dans mes projets · EN : Technologies I've used in my projects

### 2.3 /PROJETS

| Élément | FR | EN |
|---|---|---|
| Titre | /Projets | /Projects |
| Compteur | [{n} enregistrements] | [{n} records] |
| Mot fantôme | Records | Records |
| Chapeau | Cinq réalisations, du *projet client* au travail de données. Filtre par domaine ou tape une technologie. | Five projects, from *client work* to data engineering. Filter by field or type a technology. |
| Barre de requête | query > · ex. flutter, node, pandas… | query > · e.g. flutter, node, pandas… |
| Filtres | tous · web · mobile · data · cloud · ia | all · web · mobile · data · cloud · ai |
| Résultat | {n} / {total} enregistrements | {n} / {total} records |
| État vide | Aucun projet ne correspond. Essaie un autre filtre ou une autre technologie. | No project matches. Try another filter or technology. |
| Lien | Tous les projets | All projects |

### 2.4 /PROFIL

**FR**
- Titre : /Profil
- Texte : Je termine un Master 2 en Systèmes d'information et génie logiciel à l'ESATIC, orienté cloud computing et data engineering. J'ai construit des applications web et mobiles complètes, en stage comme pour des clients, et j'y intègre l'IA et l'automatisation quand elles apportent quelque chose. Aujourd'hui, j'approfondis la partie *donnée et cloud* : stocker, transformer et servir la donnée de façon fiable.
- Libellés des niveaux : Pratiqué en projet · Formation et pratique encadrée · En exploration
- Lien : Lire le profil

**EN**
- Title: /Profile
- Text: I'm in the final year of a Master's in Information Systems and Software Engineering at ESATIC, with a focus on cloud computing and data engineering. I've built complete web and mobile apps, during an internship and for clients, and I bring in AI and automation when they add real value. I'm now going deeper into *data and cloud*: storing, transforming and serving data reliably.
- Level labels: Used in projects · Studied and practised · Exploring
- Link: Read my profile

### 2.5 /SERVICES (accordéon, version courte)

**FR** — Chapeau : Formulés par *problème résolu*, pour tout type de client, en télétravail.
**EN** — Intro: Described by the *problem they solve*, for any kind of client, working remotely.

| # | FR | EN |
|---|---|---|
| 1 | **Applications web & mobiles** — Concevoir et développer une application complète, de l'interface au serveur. Cas : lancer un produit ou une première version · relier une application web et une application mobile à une même API · créer un site de contenu avec un espace d'administration. | **Web & mobile apps** — Design and build a complete app, from interface to server. For example: launching a product or a first version · connecting a web app and a mobile app to the same API · building a content site with an admin area. |
| 2 | **API & back-end** — Construire la partie serveur : données, logique métier, sécurité. Cas : API REST documentée · comptes utilisateurs et rôles · stockage de fichiers et de médias. | **APIs & back end** — Build the server side: data, business logic, security. For example: a documented REST API · user accounts and roles · file and media storage. |
| 3 | **IA & automatisation** — Intégrer l'IA et automatiser les tâches répétitives, là où c'est réellement utile. Cas : intégration d'API de modèles de langage · recherche dans vos documents (RAG) · workflows d'automatisation. | **AI & automation** — Bring AI into your product and automate repetitive work, where it truly helps. For example: integrating language-model APIs · search over your own documents (RAG) · automation workflows. |
| 4 | **Données** — Rendre vos données propres, fiables et prêtes à être analysées. Cas : nettoyage et transformation · contrôle de la qualité · préparation pour l'analyse. | **Data** — Make your data clean, reliable and ready for analysis. For example: cleaning and transformation · quality checks · preparing data for analysis. |

### 2.6 Bandeau « Et votre projet ? »

| Élément | FR | EN |
|---|---|---|
| Titre | Et votre *projet* ? | What's your *project*? |
| Texte | Choisissez ce qui correspond. Le formulaire de contact s'ouvrira avec ces éléments déjà remplis. | Pick what fits. The contact form will open with these already filled in. |
| Tuiles | Application web · Application mobile · API & back-end · IA & automatisation · Données · Autre | Web app · Mobile app · API & back end · AI & automation · Data · Something else |
| Aucune sélection | Aucune sélection | Nothing selected |
| Sélection | {n} sélection(s) · {liste} | {n} selected · {list} |
| Bouton | Continuer | Continue |

### 2.7 /PARCOURS

| Élément | FR | EN |
|---|---|---|
| Titre | /Parcours | /Background |
| Chapeau | Expérience et formation. | Experience and education. |
| Ligne 1 | **Smart Innovation 7** · stage · Développement d'une solution de gestion de livraison · [À COMPLÉTER : dates] | **Smart Innovation 7** · internship · Built a delivery management solution · [À COMPLÉTER : dates] |
| Ligne 2 | **ESATIC** · formation · Master 2 SIGL, orientation cloud computing et data engineering · en cours | **ESATIC** · education · Master's in Information Systems & Software Engineering, cloud and data track · in progress |
| Liens | Parcours complet · Télécharger le CV | Full background · Download my CV |

### 2.8 /MÉTHODE ✅ validée

| # | FR | EN |
|---|---|---|
| Titre | /Méthode | /Approach |
| Chapeau | Comment je travaille, du premier échange à la mise en ligne. | How I work, from the first conversation to going live. |
| 01 | **Comprendre** — Le besoin, les utilisateurs, les contraintes. Je pose les questions avant d'écrire du code. | **Understand** — The need, the users, the constraints. I ask questions before I write code. |
| 02 | **Concevoir** — L'architecture, le modèle de données et les écrans, validés avec vous. | **Design** — Architecture, data model and screens, agreed with you. |
| 03 | **Construire** — Par petites étapes, montrées régulièrement, pour corriger tôt. | **Build** — In small steps, shown often, so we can adjust early. |
| 04 | **Livrer** — Mise en ligne, documentation et transmission. | **Ship** — Deployment, documentation and handover. |
| 05 | **Améliorer** — À partir des retours et de l'usage réel. | **Improve** — Based on feedback and real usage. |

### 2.9 /INSIGHTS (masquée tant qu'aucun article n'est publié)

| Élément | FR | EN |
|---|---|---|
| Titre | /Insights | /Insights |
| Chapeau | Notes techniques et retours d'expérience. | Technical notes and lessons from my projects. |
| Lien | Tous les articles | All articles |

---

## 3. Page Projets

| Élément | FR | EN |
|---|---|---|
| Titre meta | Projets · [Prénom Nom] | Projects · [First Last] |
| Titre | /Projets | /Projects |
| Chapeau | Toutes mes réalisations : projets clients, stage, travaux de données et ce site. Chaque fiche ouvre une étude de cas détaillée. | All my work: client projects, an internship, data engineering work and this site. Each card opens a detailed case study. |

Les libellés de recherche, filtres et état vide sont ceux du §2.3.

---

## 4. Études de cas

### Libellés communs

| Clé | FR | EN |
|---|---|---|
| field.role | rôle | role |
| field.period | période | period |
| field.context | contexte | context |
| field.stack | stack | stack |
| field.links | liens | links |
| h.context | Contexte | Context |
| h.problem | Problématique | The problem |
| h.goals | Objectifs | Goals |
| h.solution | Approche et solution | Approach and solution |
| h.architecture | Architecture | Architecture |
| h.tech | Technologies | Technologies |
| h.challenges | Difficultés | Challenges |
| h.results | Résultats | Outcome |
| h.gallery | Galerie | Gallery |
| ctx.client | projet client | client project |
| ctx.internship | stage | internship |
| ctx.academic | travaux pratiques | coursework |
| ctx.personal | projet personnel | personal project |
| ctx.this_site | ce site · en cours | this site · in progress |
| solo | réalisé seul | built solo |
| link.demo | Voir le site | Visit the site |
| link.code | Code source | Source code |

---

### PRJ-01 · Prince Edja

| Champ | FR | EN |
|---|---|---|
| Contexte | projet client · réalisé seul | client project · built solo |
| Accroche | Une plateforme web pour faire vivre un univers artistique. | A web platform to showcase an artistic universe. |
| Description courte | Plateforme web qui présente un univers artistique, ses projets et ses contenus éditoriaux, avec une réflexion sur un espace d'administration. | A web platform presenting an artistic universe, its projects and editorial content, with groundwork for an admin area. |
| Rôle | Conception et développement, seul | Design and development, solo |
| Période | [À COMPLÉTER] | [À COMPLÉTER] |
| Stack | [À COMPLÉTER : technologies utilisées] | |
| Liens | [À COMPLÉTER : URL du site ? code public ?] | |

- **Contexte** [À VALIDER] — FR : Le client avait besoin d'un site pour présenter son univers artistique, ses projets et ses contenus, et pouvoir le faire évoluer. · EN: The client needed a website to present their artistic universe, projects and content, and to keep it up to date over time.
- **Problématique** [À VALIDER] — FR : Réunir des contenus de nature différente (projets, textes éditoriaux) dans un site cohérent, et préparer leur mise à jour sans passer par le code. · EN: Bring together different kinds of content (projects, editorial pieces) in one coherent site, and prepare for updates without touching the code.
- **Objectifs** — [À COMPLÉTER : 2 à 5 objectifs fixés avec le client]
- **Approche et solution** — [À COMPLÉTER : pages réalisées, fonctionnalités livrées]
- **Point à préciser** : l'espace d'administration a-t-il été **livré**, ou seulement **conçu** ? La maquette dit « avec un espace d'administration » : je la corrigerai selon ta réponse.
- **Difficultés, Résultats, Galerie** — [À COMPLÉTER]

---

### PRJ-02 · Retrouve Moi

| Champ | FR | EN |
|---|---|---|
| Contexte | [À COMPLÉTER : client, personnel ou académique ?] | |
| Accroche | Une application mobile pour retrouver ce qu'on a perdu. | A mobile app to find what you've lost. |
| Description courte | Application mobile de recherche d'objets perdus et retrouvés. | A mobile app for reporting and finding lost items. |
| Rôle | [À COMPLÉTER] | |
| Période | [À COMPLÉTER] | |
| Stack | Flutter · Node.js · MongoDB · Firebase · Cloudflare R2 | idem |
| Liens | [À COMPLÉTER : store, démo, code ?] | |

- **Problématique** [À VALIDER] — FR : Quand on perd un objet, on ne sait pas s'il a été trouvé, ni par qui. Quand on en trouve un, il est difficile d'en retrouver le propriétaire. · EN: When you lose something, you rarely know whether anyone found it. When you find something, it's hard to track down its owner.
- **Objectifs** [À VALIDER] — FR : publier une annonce d'objet perdu ou trouvé, avec photo · rechercher parmi les annonces · mettre en relation la personne qui a perdu et celle qui a trouvé. · EN: post a lost or found item with a photo · search existing posts · connect the person who lost the item with the one who found it.
- **Technologies et rôle de chacune** [À VALIDER] :

| Techno | FR | EN |
|---|---|---|
| Flutter | Application mobile multiplateforme | Cross-platform mobile app |
| Node.js | API qui gère les annonces et les utilisateurs | API handling posts and users |
| MongoDB | Base de données des annonces | Database for posts |
| Firebase | [À COMPLÉTER : authentification ? notifications ?] | |
| Cloudflare R2 | Stockage des photos d'objets | Storage for item photos |

- **Approche, Architecture, Difficultés, Résultats, Galerie** — [À COMPLÉTER]

---

### PRJ-03 · Gestion de livraison

| Champ | FR | EN |
|---|---|---|
| Contexte | stage · Smart Innovation 7 | internship · Smart Innovation 7 |
| Accroche | Une solution de gestion de livraison : web, mobile et API. | A delivery management solution: web, mobile and API. |
| Description courte | Solution de gestion de livraison développée pendant mon stage : interface web, application mobile et API REST. | A delivery management solution built during my internship: web interface, mobile app and REST API. |
| Rôle | [À COMPLÉTER : ton poste et ta part du travail] | |
| Période | [À COMPLÉTER] | |
| Stack | Vue.js · Node.js · API REST · application mobile [À COMPLÉTER : technologie mobile] | idem |
| Liens | [À COMPLÉTER : publiable ? sous accord de confidentialité ?] | |

- **Contexte** [À VALIDER] — FR : Projet réalisé au sein de Smart Innovation 7 pendant mon stage. · EN: Built at Smart Innovation 7 during my internship.
- **Problématique, Objectifs, Solution** — [À COMPLÉTER : qui utilise l'outil (clients, livreurs, gestionnaires) et quel problème il résout]
- **Point à préciser** : peux-tu montrer des captures ? Si le projet est confidentiel, l'étude de cas décrira l'architecture et ton rôle, sans visuels.

---

### PRJ-04 · Data Engineering

| Champ | FR | EN |
|---|---|---|
| Contexte | travaux pratiques · Master 2 SIGL | coursework · Master's |
| Accroche | Rendre un jeu de données fiable, étape par étape. | Making a dataset reliable, step by step. |
| Description courte | Exploration, nettoyage, transformation et contrôle de la qualité des données avec Python et Pandas. | Exploring, cleaning, transforming and quality-checking data with Python and Pandas. |
| Rôle | [À COMPLÉTER : seul ou en groupe ?] | |
| Période | [À COMPLÉTER] | |
| Stack | Python · Pandas | idem |
| Liens | [À COMPLÉTER : notebook ou dépôt GitHub ?] | |

- **Contexte** — FR : Travaux pratiques de mon Master, orienté data engineering. · EN: Coursework from my Master's, on the data engineering track.
- **Approche** — FR : Quatre étapes : explorer les données, les nettoyer, les transformer, puis contrôler leur qualité. · EN: Four steps: explore the data, clean it, transform it, then check its quality.
- **Architecture** — le pipeline en 4 étapes ci-dessus, illustré par un schéma.
- **Jeu de données, Difficultés, Résultats** — [À COMPLÉTER : quel jeu de données, quels problèmes trouvés (valeurs manquantes, doublons, formats), quelles vérifications]

---

### PRJ-05 · Portfolio & CMS

| Champ | FR | EN |
|---|---|---|
| Contexte | ce site · en cours | this site · in progress |
| Accroche | Ce site : un portfolio bilingue et son propre espace d'administration. | This site: a bilingual portfolio with its own admin system. |
| Description courte | Site public bilingue, API, espace d'administration sécurisé et déploiement sur Vercel, conçus et développés de bout en bout. | A bilingual public site, an API, a secure admin area and deployment on Vercel, designed and built end to end. |
| Rôle | Conception et développement | Design and development |
| Période | 2026 · en cours | 2026 · in progress |
| Stack | [Défini à l'étape « architecture technique »] | |

- **Contexte** — FR : Je voulais un portfolio dont je gère tous les contenus moi-même, en français et en anglais, sans modifier le code à chaque changement. · EN: I wanted a portfolio where I manage all the content myself, in French and English, without editing code for every change.
- **Objectifs** — FR : gérer projets, textes, articles et médias depuis un espace d'administration · publier chaque langue indépendamment · sécuriser l'accès (connexion, rôles, journal d'activité, sauvegardes) · garder un site rapide et accessible. · EN: manage projects, copy, articles and media from an admin area · publish each language independently · secure access (sign-in, roles, activity log, backups) · keep the site fast and accessible.
- **Solution, Architecture, Difficultés, Résultats** — rédigés au fil du développement, à partir de ce que nous construisons réellement.

---

## 5. Page Profil

### Présentation

**FR** — Je m'appelle [À COMPLÉTER : Prénom Nom]. Je suis en Master 2 Systèmes d'information et génie logiciel à l'ESATIC, avec une orientation cloud computing et data engineering.

Je construis des applications de bout en bout : l'interface, l'API, la base de données et la mise en ligne. Je l'ai fait pendant mon stage chez Smart Innovation 7, pour un client avec Prince Edja, et dans mes propres projets comme Retrouve Moi.

J'intègre aussi l'IA et l'automatisation dans mon travail : appels à des modèles de langage, recherche dans des documents, workflows automatisés.

Ce qui m'intéresse aujourd'hui, c'est ce qui se passe *derrière* l'application : comment la donnée est stockée, transformée et servie, et comment le tout tient dans le cloud.

**EN** — I'm [À COMPLÉTER : First Last], in the final year of a Master's in Information Systems and Software Engineering at ESATIC, specialising in cloud computing and data engineering.

I build apps end to end: interface, API, database and deployment. I did it during my internship at Smart Innovation 7, for a client with Prince Edja, and in my own projects such as Retrouve Moi.

I also bring AI and automation into my work: calling language models, searching over documents, automated workflows.

What I'm most interested in now is what happens *behind* the app: how data is stored, transformed and served, and how it all runs in the cloud.

> [À VALIDER] « mes propres projets comme Retrouve Moi » suppose que Retrouve Moi est un projet personnel. À corriger selon ta réponse sur son contexte.

### Vision

**FR** — Je veux travailler sur des produits utiles, où le logiciel et la donnée avancent ensemble. Mon objectif à court terme : [À COMPLÉTER : par exemple rejoindre une équipe produit ou data, en poste ou en alternance, et continuer les missions freelance].

**EN** — I want to work on useful products where software and data move forward together. My short-term goal: [À COMPLÉTER : e.g. join a product or data team, as an employee or apprentice, while keeping freelance work going].

### Méthode
Reprend les 5 étapes du §2.8, avec une phrase de plus par étape si tu le souhaites.

### Parcours détaillé

**Smart Innovation 7** — stage · [À COMPLÉTER : intitulé du poste] · [À COMPLÉTER : dates] · [À COMPLÉTER : ville ou télétravail]
- FR : Développement d'une solution de gestion de livraison (interface web en Vue.js, API REST en Node.js, application mobile). Missions : [À COMPLÉTER : ce que tu as fait toi-même].
- EN: Built a delivery management solution (Vue.js web interface, Node.js REST API, mobile app). Responsibilities: [À COMPLÉTER].
- Lien : étude de cas « Gestion de livraison ».

**ESATIC** · École Supérieure Africaine des Technologies de l'Information et de la Communication [À VALIDER : nom complet]
- FR : Master 2 Systèmes d'information et génie logiciel (SIGL), orientation cloud computing et data engineering · [À COMPLÉTER : dates] · en cours.
- EN: Master's in Information Systems and Software Engineering (SIGL), cloud computing and data engineering track · [À COMPLÉTER : dates] · in progress.

**Certifications** — [À COMPLÉTER : s'il y en a. Sinon le bloc est masqué.]

### Informations pratiques

| Élément | FR | EN |
|---|---|---|
| Langues | Français · Anglais [À COMPLÉTER : niveau] | French · English [À COMPLÉTER : level] |
| Mode de travail | Télétravail, clients et équipes dans le monde entier | Remote, with clients and teams worldwide |
| Fuseau horaire | [À COMPLÉTER : ex. GMT / UTC+0] | |
| Disponibilité | [À COMPLÉTER : à partir de quand, pour quel type de contrat] | |

---

## 6. Page Expertise

### Introduction

**FR** — Ce que je sais faire, et à quel niveau. Chaque compétence « pratiquée » renvoie aux projets qui le prouvent.
**EN** — What I can do, and how far I've taken it. Every skill marked "used in projects" links to the work that shows it.

### Les 5 domaines

| Domaine | FR | EN |
|---|---|---|
| Software Engineering | Concevoir des applications structurées et maintenables : architecture, modèle de données, API. | Designing structured, maintainable software: architecture, data models, APIs. |
| Web & Mobile | Construire des interfaces web et des applications mobiles reliées à un back-end. | Building web interfaces and mobile apps connected to a back end. |
| Data Engineering | Explorer, nettoyer, transformer et contrôler la qualité des données. | Exploring, cleaning, transforming and quality-checking data. |
| Cloud & DevOps | Stocker et déployer dans le cloud ; automatiser la mise en production. | Storing and deploying in the cloud; automating releases. |
| IA générative & automatisation | Intégrer des modèles de langage et automatiser des tâches dans de vrais produits. | Integrating language models and automating tasks in real products. |

### Matrice des compétences

| Niveau | FR | EN | Compétences |
|---|---|---|---|
| 1 | Pratiqué en projet | Used in projects | Node.js · API REST · Vue.js · Flutter · MongoDB · Firebase · Cloudflare R2 · développement mobile · intégration d'API de LLM · RAG / agents · workflows d'automatisation · outils d'IA pour le développement |
| 2 | Formation et pratique encadrée | Studied and practised | Python · Pandas · exploration, nettoyage, transformation et qualité des données · fondamentaux du cloud computing |
| 3 | En exploration | Exploring | Pipelines de données à grande échelle · DevOps (CI/CD, conteneurs) |

> Les compétences du niveau 1 sont reliées aux projets qui les utilisent. Les compétences IA seront reliées aux projets que tu ajouteras dans l'admin.

### Services (version détaillée)

Reprend les 4 services du §2.5, avec en plus :

| Service | Livrables types FR | Deliverables EN | Projets liés |
|---|---|---|---|
| Applications web & mobiles | Application en ligne, code source, documentation de prise en main | Live app, source code, getting-started docs | Prince Edja, Retrouve Moi, Gestion de livraison |
| API & back-end | API documentée, base de données, déploiement | Documented API, database, deployment | Retrouve Moi, Gestion de livraison, Portfolio & CMS |
| IA & automatisation | Fonctionnalité IA intégrée ou workflow automatisé, avec ses limites expliquées | Integrated AI feature or automated workflow, with its limits explained | [À COMPLÉTER] |
| Données | Jeu de données nettoyé, scripts reproductibles, rapport de qualité | Cleaned dataset, reproducible scripts, quality report | Data Engineering |

---

## 7. Insights

### Catégories

| Catégorie | FR | EN |
|---|---|---|
| Data Engineering | Traiter, fiabiliser et servir la donnée. | Processing, validating and serving data. |
| Web & Mobile | Construire des applications de bout en bout. | Building apps end to end. |
| IA & automatisation | Utiliser l'IA et l'automatisation dans de vrais projets. | Using AI and automation in real projects. |
| Cloud | Stocker, déployer et faire tourner une application. | Storing, deploying and running applications. |
| Carnet de projet | Ce que j'ai appris en construisant. | Lessons from building things. |

### Premiers sujets proposés
Tous liés à tes projets réels. Tu choisis lesquels écrire.

| # | Catégorie | FR | EN |
|---|---|---|---|
| 1 | Carnet de projet | Construire un CMS sur mesure pour mon portfolio : mes choix d'architecture | Building a custom CMS for my portfolio: my architecture choices |
| 2 | Cloud | Stocker les photos d'une application mobile avec Cloudflare R2 | Storing a mobile app's photos with Cloudflare R2 |
| 3 | Web & Mobile | Relier une application Flutter à une API Node.js : ce que je fais à chaque fois | Connecting a Flutter app to a Node.js API: my checklist |
| 4 | Data Engineering | Nettoyer un jeu de données avec Pandas : les vérifications indispensables | Cleaning a dataset with Pandas: the checks I always run |
| 5 | IA & automatisation | Le RAG expliqué simplement : faire répondre un modèle à partir de vos documents | RAG, simply explained: getting a model to answer from your documents |
| 6 | Data Engineering | Qualité des données : cinq contrôles avant toute analyse | Data quality: five checks before any analysis |
| 7 | IA & automatisation | Automatiser une tâche répétitive : comment je choisis l'outil | Automating a repetitive task: how I pick the tool |
| 8 | Carnet de projet | Ce que mon stage m'a appris sur une application de livraison | What my internship taught me about building a delivery app |

### Libellés de la rubrique

| Clé | FR | EN |
|---|---|---|
| list.intro | Notes techniques et retours d'expérience, en français et en anglais. | Technical notes and lessons learned, in French and English. |
| list.empty | Premiers articles en préparation. | First articles coming soon. |
| meta.reading | {n} min de lecture | {n} min read |
| meta.published | Publié le {date} | Published {date} |
| meta.updated | Mis à jour le {date} | Updated {date} |
| toc | Sommaire | Contents |
| share | Partager | Share |
| share.copy | Copier le lien | Copy link |
| related | À lire aussi | Keep reading |
| only_fr | Cet article n'existe qu'en français. | This article is only available in French. |
| only_en | Cet article n'existe qu'en anglais. | This article is only available in English. |

---

## 8. Contact

### Introduction

**FR** — Titre : /Contact · Texte : Un poste, une mission ou une question ? Écrivez-moi, je réponds [À COMPLÉTER : délai, ex. sous 48 h].
**EN** — Title: /Contact · Text: A role, a project or a question? Drop me a line, I reply [À COMPLÉTER : e.g. within 48 hours].

### Choix du profil

| Profil | FR | EN |
|---|---|---|
| Question | Vous êtes… | You are… |
| Recruteur | Recruteur ou entreprise — *Un poste, un stage ou une alternance à proposer.* | Recruiter or company — *A job, internship or apprenticeship to discuss.* |
| Client | Client — *Un projet à lancer ou à faire évoluer.* | Client — *A project to launch or improve.* |
| Autre | Autre — *Une question, une collaboration, un échange.* | Other — *A question, a collaboration, a chat.* |

### Champs du formulaire

| Champ | FR | EN | Affiché pour |
|---|---|---|---|
| Nom | Nom | Name | tous |
| Email | Email | Email | tous |
| Entreprise | Entreprise | Company | recruteur (obligatoire), client (facultatif) |
| Poste proposé | Poste ou type de contrat | Role or contract type | recruteur |
| Types de projet | Type de projet | Project type | client (pré-rempli par le bandeau) |
| Délai | Délai souhaité | Ideal timeline | client (facultatif) |
| Message | Votre message | Your message | tous |
| Consentement | J'accepte que mes informations soient utilisées pour me répondre. Voir la politique de confidentialité. | I agree to my details being used to reply to me. See the privacy policy. | tous |
| Envoyer | Envoyer le message | Send message | tous |

### Messages

| Cas | FR | EN |
|---|---|---|
| Envoi en cours | Envoi… | Sending… |
| Succès | Message envoyé. Merci, je reviens vers vous rapidement. | Message sent. Thanks, I'll get back to you soon. |
| Champ manquant | Ce champ est obligatoire. | This field is required. |
| Email invalide | Vérifiez l'adresse email, elle semble incomplète. | Check your email address, it looks incomplete. |
| Message trop court | Ajoutez quelques mots pour que je comprenne votre demande (20 caractères minimum). | Add a few more words so I understand your request (20 characters minimum). |
| Trop d'envois | Plusieurs messages ont été envoyés en peu de temps. Réessayez dans quelques minutes. | Several messages were sent in a short time. Please try again in a few minutes. |
| Erreur serveur | Le message n'est pas parti. Réessayez, ou écrivez directement à {email}. | The message didn't go through. Try again, or email me directly at {email}. |

### Colonne d'informations

| Élément | FR | EN |
|---|---|---|
| Email | Email (bouton « Copier l'email ») | Email ("Copy email" button) |
| Réseaux | LinkedIn · GitHub | LinkedIn · GitHub |
| CV | Télécharger le CV (FR) | Download my CV (EN) |
| Disponibilité | [À COMPLÉTER] | [À COMPLÉTER] |
| Fuseau horaire | [À COMPLÉTER] | [À COMPLÉTER] |

---

## 9. Pages techniques

### 404

| Élément | FR | EN |
|---|---|---|
| Titre | Record introuvable. | Record not found. |
| Texte | Cette page n'existe pas, ou plus. | This page doesn't exist, or no longer does. |
| Ligne technique | query > {chemin demandé} · 0 résultat | query > {requested path} · 0 results |
| Liens | Retour à l'accueil · Voir les projets | Back to home · See my work |

### Mentions légales (structure)
Éditeur : [À COMPLÉTER : nom, ville, email] · Hébergeur : Vercel Inc. [À COMPLÉTER : adresse légale à recopier depuis le site de Vercel] · Propriété intellectuelle : contenus et visuels du site, sauf mention contraire · Crédits : polices Google Fonts (Poppins, Martian Mono, Newsreader), logos de technologies Simple Icons (CC0).

### Confidentialité (structure)
Données collectées : celles du formulaire de contact (nom, email, entreprise, message) · Finalité : répondre à la demande · Durée de conservation : [À COMPLÉTER : ex. 12 mois] · Destinataire : moi uniquement · Statistiques de visite : [À COMPLÉTER : outil choisi, idéalement sans cookie] · Droits : accès, rectification, suppression, sur demande à {email}.

---

## 10. Référencement (titres et descriptions)

| Page | Titre FR | Titre EN | Description FR | Description EN |
|---|---|---|---|---|
| Accueil | [Prénom Nom] · Software & Data Engineer | [First Last] · Software & Data Engineer | Applications web et mobiles de bout en bout, IA et automatisation, spécialisation data et cloud. Disponible en télétravail. | End-to-end web and mobile apps, AI and automation, specialising in data and cloud. Available for remote work. |
| Projets | Projets · [Prénom Nom] | Projects · [First Last] | Cinq études de cas : projet client, stage, travaux de données et un CMS sur mesure. | Five case studies: client work, an internship, data engineering and a custom CMS. |
| Étude de cas | {Projet} · [Prénom Nom] | {Project} · [First Last] | {Description courte du projet} | {Project short description} |
| Profil | Profil · [Prénom Nom] | Profile · [First Last] | Parcours, méthode et compétences d'un Software & Data Engineer en Master 2 SIGL. | Background, approach and skills of a Software & Data Engineer in the final year of a Master's. |
| Expertise | Expertise et services · [Prénom Nom] | Expertise and services · [First Last] | Ce que je sais faire, à quel niveau, et les services que je propose. | What I can do, how far I've taken it, and the services I offer. |
| Insights | Insights · [Prénom Nom] | Insights · [First Last] | Notes techniques sur la donnée, le web, le mobile, le cloud et l'IA. | Technical notes on data, web, mobile, cloud and AI. |
| Contact | Contact · [Prénom Nom] | Contact · [First Last] | Un poste, une mission ou une question ? Écrivez-moi. | A role, a project or a question? Get in touch. |

---

## 11. Ce qu'il me manque de ta part

À fournir maintenant ou plus tard via l'admin. Les plus importants sont en gras.

1. **Prénom et nom** tels qu'ils doivent apparaître.
2. **Prince Edja** : l'espace d'administration a-t-il été livré ou seulement conçu ? Technologies utilisées ? Site en ligne ?
3. **Retrouve Moi** : projet personnel, académique ou client ? Ton rôle ? À quoi sert Firebase ?
4. **Smart Innovation 7** : intitulé du poste, dates, tes missions, technologie de l'application mobile, captures autorisées ou non.
5. **Data Engineering** : jeu de données utilisé, seul ou en groupe, lien vers le notebook.
6. Projets ou cas concrets en **IA / automatisation** à relier à ce domaine.
7. ~~Ta méthode (§2.8)~~ ✅ validée le 6 novembre 2026.
8. Ta vision à court terme, ta disponibilité, ton fuseau horaire, ta ville, ton niveau d'anglais.
9. Délai de réponse que tu veux afficher sur la page Contact.
