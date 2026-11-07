/**
 * Per-page SEO: title, description, Open Graph / Twitter copies and optional JSON-LD.
 * Canonical, hreflang alternates, og:url and og:locale come from useLocaleHead() in app.vue.
 */
export function usePageSeo(opts: {
  /** Page title without the site suffix; null for the home page. */
  title: () => string | null
  description: () => string
  robots?: string
  /** Extra schema.org nodes for this page (merged into one @graph). */
  jsonLd?: () => Record<string, unknown>[]
}) {
  const display = useDisplayName()
  const config = useRuntimeConfig()
  const fullTitle = computed(() => {
    const title = opts.title()
    return title ? `${title} · ${display.value.text}` : display.value.text
  })
  const image = `${config.public.siteUrl.replace(/\/$/, '')}/og-image.png`

  useSeoMeta({
    title: () => opts.title(),
    description: opts.description,
    ogTitle: () => fullTitle.value,
    ogDescription: opts.description,
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => display.value.text,
    twitterTitle: () => fullTitle.value,
    twitterDescription: opts.description,
    twitterImage: image,
    ...(opts.robots ? { robots: opts.robots } : {}),
  })

  if (opts.jsonLd) {
    useHead(() => ({
      script: [
        {
          key: 'ld-page',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': opts.jsonLd!() }),
        },
      ],
    }))
  }
}
