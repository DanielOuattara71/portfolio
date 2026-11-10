// Admin app (docs/admin/08-architecture-donnees.md). Rendered in the browser only, never indexed.
// It talks to the API on its own origin: server/routes/api/[...path].ts proxies /api/** to the API so
// the session cookie stays first-party (docs/11-architecture-technique.md §3, rule 4).
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  ssr: false,

  modules: ['@nuxt/fonts', '@sentry/nuxt'],

  css: ['@portfolio/design-tokens/tokens.css', '~/assets/admin.css'],

  runtimeConfig: {
    // Server-only (proxy). NUXT_API_ORIGIN / NUXT_ADMIN_PROXY_SECRET override them at runtime.
    apiOrigin: process.env.ADMIN_API_ORIGIN ?? 'http://localhost:8787',
    adminProxySecret: process.env.ADMIN_PROXY_SECRET ?? '',
    public: {
      siteUrl: 'http://localhost:3000',
      sentryDsn: '',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Administration',
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'theme-color', content: '#f3f0e8' },
      ],
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  },

  fonts: {
    families: [{ name: 'Poppins', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] }],
  },

  typescript: {
    strict: true,
  },
})
