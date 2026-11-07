/**
 * robots.txt with an absolute Sitemap URL (required by the robots.txt standard),
 * built from the site URL of the current environment (NUXT_PUBLIC_SITE_URL).
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const site = String(config.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${site}/sitemap.xml`, ''].join('\n')
})
