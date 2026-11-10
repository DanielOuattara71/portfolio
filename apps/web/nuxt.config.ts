// Public site configuration. Decisions: docs/06-architecture.md (URLs, i18n) and docs/11-architecture-technique.md.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },

  modules: ['@nuxtjs/i18n', '@nuxt/fonts', '@sentry/nuxt'],

  css: ['@portfolio/design-tokens/tokens.css', '~/assets/styles/base.css'],

  runtimeConfig: {
    // Shared secret with the API for on-demand refresh after a publication (NUXT_REVALIDATE_TOKEN).
    revalidateToken: '',
    public: {
      siteUrl: 'http://localhost:3000',
      apiBase: 'http://localhost:8787',
      // Public Sentry DSN (NUXT_PUBLIC_SENTRY_DSN). Empty in dev: Sentry stays silent.
      sentryDsn: '',
      // Shows "to provide" placeholders and unconfirmed draft copy (review mode). Off in production;
      // set NUXT_PUBLIC_SHOW_PLACEHOLDERS=true locally to review what still needs content.
      showPlaceholders: false,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'theme-color', content: '#f3f0e8' }],
      script: [
        {
          // Before first paint: saved theme, and motion flags (no flash of content that is about to animate).
          // data-motion="pending" hides [data-reveal] until JS animates it (CSS safety reveal after 3 s).
          // data-intro="1" shows the session intro once per browser session. Will get a CSP hash.
          key: 'boot',
          tagPosition: 'head',
          innerHTML:
            "(function(d){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')d.dataset.theme=t}catch(e){}try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.motion='pending';if(!sessionStorage.getItem('intro-seen'))d.dataset.intro='1'}}catch(e){}})(document.documentElement)",
        },
      ],
    },
  },

  // Self-hosted at build time: no request to Google from visitors' browsers.
  fonts: {
    // Italic is loaded for accent words (.acc): no synthetic slanting. Browsers only fetch the faces actually used.
    families: [{ name: 'Poppins', provider: 'google', weights: [300, 400, 500, 600, 700, 800], styles: ['normal', 'italic'] }],
  },

  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    strategy: 'prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'lang',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
    customRoutes: 'config',
    pages: {
      'projets/index': { fr: '/projets', en: '/projects' },
      'projets/[slug]': { fr: '/projets/[slug]', en: '/projects/[slug]' },
      profil: { fr: '/profil', en: '/profile' },
      expertise: { fr: '/expertise', en: '/expertise' },
      contact: { fr: '/contact', en: '/contact' },
      'mentions-legales': { fr: '/mentions-legales', en: '/legal-notice' },
      confidentialite: { fr: '/confidentialite', en: '/privacy' },
    },
  },

  // Production security headers (step 20). The CSP starts in report-only Vercel-side when required;
  // the static headers below never carry a secret and stay identical in dev/prod.
  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },

  // Pre-compressed static files (gzip + brotli). Vercel's CDN compresses on its own; this covers any
  // other Node host and keeps local Lighthouse runs realistic.
  nitro: {
    compressPublicAssets: { gzip: true, brotli: true },
  },

  typescript: {
    strict: true,
  },
})
