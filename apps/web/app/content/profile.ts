import type { Domain, Locale, SkillLevel } from '@portfolio/shared/constants'
import type { TextSegment } from './home'

/**
 * Profile, expertise, services, background and approach. TEMPORARY SEED from docs/07-contenus.md
 * (§2.4 to §2.8, §5, §6). Unknown facts are null and hidden. Will come from the API.
 */
type L<T> = Record<Locale, T>

export interface DomainSeed {
  key: Domain | 'software'
  name: string
  level: SkillLevel
  description: L<string>
}

export const domainsSeed: DomainSeed[] = [
  { key: 'software', name: 'Software Engineering', level: 'practised', description: { fr: 'Concevoir des applications structurées et maintenables : architecture, modèle de données, API.', en: 'Designing structured, maintainable software: architecture, data models, APIs.' } },
  { key: 'web', name: 'Web & Mobile', level: 'practised', description: { fr: 'Construire des interfaces web et des applications mobiles reliées à un back-end.', en: 'Building web interfaces and mobile apps connected to a back end.' } },
  { key: 'ai', name: 'IA générative & automatisation', level: 'practised', description: { fr: 'Intégrer des modèles de langage et automatiser des tâches dans de vrais produits.', en: 'Integrating language models and automating tasks in real products.' } },
  { key: 'data', name: 'Data Engineering', level: 'studied', description: { fr: 'Explorer, nettoyer, transformer et contrôler la qualité des données.', en: 'Exploring, cleaning, transforming and quality-checking data.' } },
  { key: 'cloud', name: 'Cloud & DevOps', level: 'exploring', description: { fr: 'Stocker et déployer dans le cloud ; automatiser la mise en production.', en: 'Storing and deploying in the cloud; automating releases.' } },
]

export interface SkillSeed {
  name: L<string>
  level: SkillLevel
  /** Matches project stack entries, to count and link the projects that prove the skill */
  stackKey?: string
}

const same = (s: string): L<string> => ({ fr: s, en: s })

export const skillsSeed: SkillSeed[] = [
  { name: same('Node.js'), level: 'practised', stackKey: 'Node.js' },
  { name: same('API REST'), level: 'practised', stackKey: 'API REST' },
  { name: same('Vue.js'), level: 'practised', stackKey: 'Vue.js' },
  { name: same('Flutter'), level: 'practised', stackKey: 'Flutter' },
  { name: same('MongoDB'), level: 'practised', stackKey: 'MongoDB' },
  { name: same('Firebase'), level: 'practised', stackKey: 'Firebase' },
  { name: same('Cloudflare R2'), level: 'practised', stackKey: 'Cloudflare R2' },
  { name: { fr: 'Développement mobile', en: 'Mobile development' }, level: 'practised' },
  { name: { fr: "Intégration d'API de LLM", en: 'LLM API integration' }, level: 'practised' },
  { name: same('RAG / agents'), level: 'practised' },
  { name: { fr: "Workflows d'automatisation", en: 'Automation workflows' }, level: 'practised' },
  { name: { fr: 'Outils IA pour le développement', en: 'AI coding tools' }, level: 'practised' },
  { name: same('Python'), level: 'studied', stackKey: 'Python' },
  { name: same('Pandas'), level: 'studied', stackKey: 'Pandas' },
  { name: { fr: 'Nettoyage et transformation de données', en: 'Data cleaning and transformation' }, level: 'studied' },
  { name: { fr: 'Qualité des données', en: 'Data quality' }, level: 'studied' },
  { name: { fr: 'Fondamentaux du cloud', en: 'Cloud fundamentals' }, level: 'studied' },
  { name: { fr: 'Pipelines de données à grande échelle', en: 'Large-scale data pipelines' }, level: 'exploring' },
  { name: same('CI/CD'), level: 'exploring' },
  { name: { fr: 'Conteneurs', en: 'Containers' }, level: 'exploring' },
]

export interface ServiceSeed {
  title: L<string>
  description: L<string>
  cases: L<string[]>
  deliverables: L<string>
  projectIds: string[]
}

export const servicesSeed: ServiceSeed[] = [
  {
    title: { fr: 'Applications web & mobiles', en: 'Web & mobile apps' },
    description: { fr: "Concevoir et développer une application complète, de l'interface au serveur.", en: 'Design and build a complete app, from interface to server.' },
    cases: {
      fr: ['Lancer un produit ou une première version', 'Relier une application web et une application mobile à une même API', "Créer un site de contenu avec un espace d'administration"],
      en: ['Launching a product or a first version', 'Connecting a web app and a mobile app to the same API', 'Building a content site with an admin area'],
    },
    deliverables: { fr: 'Application en ligne, code source, documentation de prise en main', en: 'Live app, source code, getting-started docs' },
    projectIds: ['PRJ-01', 'PRJ-02', 'PRJ-03'],
  },
  {
    title: { fr: 'API & back-end', en: 'APIs & back end' },
    description: { fr: 'Construire la partie serveur : données, logique métier, sécurité.', en: 'Build the server side: data, business logic, security.' },
    cases: {
      fr: ['API REST documentée', 'Comptes utilisateurs et rôles', 'Stockage de fichiers et de médias'],
      en: ['A documented REST API', 'User accounts and roles', 'File and media storage'],
    },
    deliverables: { fr: 'API documentée, base de données, déploiement', en: 'Documented API, database, deployment' },
    projectIds: ['PRJ-02', 'PRJ-03', 'PRJ-05'],
  },
  {
    title: { fr: 'IA & automatisation', en: 'AI & automation' },
    description: { fr: "Intégrer l'IA et automatiser les tâches répétitives, là où c'est réellement utile.", en: 'Bring AI into your product and automate repetitive work, where it truly helps.' },
    cases: {
      fr: ["Intégration d'API de modèles de langage", 'Recherche dans vos documents (RAG)', "Workflows d'automatisation"],
      en: ['Integrating language-model APIs', 'Search over your own documents (RAG)', 'Automation workflows'],
    },
    deliverables: { fr: 'Fonctionnalité IA intégrée ou workflow automatisé, avec ses limites expliquées', en: 'Integrated AI feature or automated workflow, with its limits explained' },
    projectIds: [],
  },
  {
    title: { fr: 'Données', en: 'Data' },
    description: { fr: 'Rendre vos données propres, fiables et prêtes à être analysées.', en: 'Make your data clean, reliable and ready for analysis.' },
    cases: {
      fr: ['Nettoyage et transformation', 'Contrôle de la qualité', "Préparation pour l'analyse"],
      en: ['Cleaning and transformation', 'Quality checks', 'Preparing data for analysis'],
    },
    deliverables: { fr: 'Jeu de données nettoyé, scripts reproductibles, rapport de qualité', en: 'Cleaned dataset, reproducible scripts, quality report' },
    projectIds: ['PRJ-04'],
  },
]

export interface TimelineSeed {
  org: string
  kind: L<string>
  role: L<string>
  period: L<string> | null
  details: L<string> | null
  projectId?: string
}

export const experienceSeed: TimelineSeed[] = [
  {
    org: 'Smart Innovation 7',
    kind: { fr: 'stage', en: 'internship' },
    role: { fr: "Développement d'une solution de gestion de livraison", en: 'Built a delivery management solution' },
    period: null,
    details: {
      fr: 'Interface web en Vue.js, API REST en Node.js et application mobile.',
      en: 'Vue.js web interface, Node.js REST API and a mobile app.',
    },
    projectId: 'PRJ-03',
  },
]

export const educationSeed: TimelineSeed[] = [
  {
    org: 'ESATIC',
    kind: { fr: 'formation', en: 'education' },
    role: {
      fr: 'Master 2 Systèmes d’information et génie logiciel (SIGL), orientation cloud computing et data engineering',
      en: 'Master’s in Information Systems and Software Engineering (SIGL), cloud computing and data engineering track',
    },
    period: { fr: 'en cours', en: 'in progress' },
    details: null,
  },
]

export const approachSeed: L<{ title: string; text: string }[]> = {
  fr: [
    { title: 'Comprendre', text: "Le besoin, les utilisateurs, les contraintes. Je pose les questions avant d'écrire du code." },
    { title: 'Concevoir', text: "L'architecture, le modèle de données et les écrans, validés avec vous." },
    { title: 'Construire', text: 'Par petites étapes, montrées régulièrement, pour corriger tôt.' },
    { title: 'Livrer', text: 'Mise en ligne, documentation et transmission.' },
    { title: 'Améliorer', text: "À partir des retours et de l'usage réel." },
  ],
  en: [
    { title: 'Understand', text: 'The need, the users, the constraints. I ask questions before I write code.' },
    { title: 'Design', text: 'Architecture, data model and screens, agreed with you.' },
    { title: 'Build', text: 'In small steps, shown often, so we can adjust early.' },
    { title: 'Ship', text: 'Deployment, documentation and handover.' },
    { title: 'Improve', text: 'Based on feedback and real usage.' },
  ],
}

export const profileSeed: L<{
  short: TextSegment[][]
  long: TextSegment[][]
  vision: string
  facts: { label: string; value: string | null }[]
}> = {
  fr: {
    short: [
      [{ text: "Je termine un Master 2 en Systèmes d'information et génie logiciel à l'ESATIC, orienté cloud computing et data engineering." }],
      [
        { text: "J'ai construit des applications web et mobiles complètes, en stage comme pour des clients, et j'y intègre l'IA et l'automatisation quand elles apportent quelque chose. Aujourd'hui, j'approfondis la partie " },
        { text: 'donnée et cloud', accent: true },
        { text: '.' },
      ],
    ],
    long: [
      [{ text: "Je suis en Master 2 Systèmes d'information et génie logiciel à l'ESATIC, avec une orientation cloud computing et data engineering." }],
      [{ text: "Je construis des applications de bout en bout : l'interface, l'API, la base de données et la mise en ligne. Je l'ai fait pendant mon stage chez Smart Innovation 7, pour un client avec Prince Edja, et sur Retrouve Moi." }],
      [{ text: "J'intègre aussi l'IA et l'automatisation dans mon travail : appels à des modèles de langage, recherche dans des documents, workflows automatisés." }],
      [
        { text: "Ce qui m'intéresse aujourd'hui, c'est ce qui se passe " },
        { text: 'derrière', accent: true },
        { text: " l'application : comment la donnée est stockée, transformée et servie, et comment le tout tient dans le cloud." },
      ],
    ],
    vision: 'Je veux travailler sur des produits utiles, où le logiciel et la donnée avancent ensemble.',
    facts: [
      { label: 'langues', value: 'Français · Anglais' },
      { label: 'mode', value: 'Télétravail, clients et équipes dans le monde entier' },
      { label: 'fuseau', value: null },
      { label: 'disponibilité', value: null },
    ],
  },
  en: {
    short: [
      [{ text: "I'm in the final year of a Master's in Information Systems and Software Engineering at ESATIC, with a focus on cloud computing and data engineering." }],
      [
        { text: "I've built complete web and mobile apps, during an internship and for clients, and I bring in AI and automation when they add real value. I'm now going deeper into " },
        { text: 'data and cloud', accent: true },
        { text: '.' },
      ],
    ],
    long: [
      [{ text: "I'm in the final year of a Master's in Information Systems and Software Engineering at ESATIC, specialising in cloud computing and data engineering." }],
      [{ text: 'I build apps end to end: interface, API, database and deployment. I did it during my internship at Smart Innovation 7, for a client with Prince Edja, and on Retrouve Moi.' }],
      [{ text: 'I also bring AI and automation into my work: calling language models, searching over documents, automated workflows.' }],
      [
        { text: "What I'm most interested in now is what happens " },
        { text: 'behind', accent: true },
        { text: ' the app: how data is stored, transformed and served, and how it all runs in the cloud.' },
      ],
    ],
    vision: 'I want to work on useful products where software and data move forward together.',
    facts: [
      { label: 'languages', value: 'French · English' },
      { label: 'mode', value: 'Remote, with clients and teams worldwide' },
      { label: 'time zone', value: null },
      { label: 'availability', value: null },
    ],
  },
}
