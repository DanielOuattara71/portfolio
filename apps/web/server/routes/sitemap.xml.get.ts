import { projectsSeed } from '../../app/content/projects'

/**
 * Sitemap with language alternates: every URL lists its FR and EN versions (hreflang) and x-default (EN).
 * Legal pages are noindex, so they are left out.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const site = String(config.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

  // FR path → EN path. Mirrors the translated routes in nuxt.config (i18n.pages).
  const pairs: { fr: string; en: string }[] = [
    { fr: '', en: '' },
    { fr: '/projets', en: '/projects' },
    { fr: '/profil', en: '/profile' },
    { fr: '/expertise', en: '/expertise' },
    { fr: '/contact', en: '/contact' },
    ...projectsSeed.map((p) => ({ fr: `/projets/${p.slug.fr}`, en: `/projects/${p.slug.en}` })),
  ]

  const entry = (loc: string, pair: { fr: string; en: string }) => {
    const fr = `${site}/fr${pair.fr}`
    const en = `${site}/en${pair.en}`
    return [
      '  <url>',
      `    <loc>${loc === 'fr' ? fr : en}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="fr" href="${fr}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`,
      '  </url>',
    ].join('\n')
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...pairs.flatMap((pair) => [entry('fr', pair), entry('en', pair)]),
    '</urlset>',
    '',
  ].join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
