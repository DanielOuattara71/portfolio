<script setup lang="ts">
const { t } = useI18n()
const site = useSite()
const transition = usePageTransition()
const route = useRoute()

async function scrollToHash(hash: string | undefined) {
  if (!import.meta.client || !hash) return
  const id = hash.replace(/^#/, '')
  if (!id) return
  await nextTick()
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

onMounted(() => scrollToHash(route.hash))
watch(() => route.fullPath, () => scrollToHash(route.hash))

// lang attribute, hreflang alternates and og:locale for every page.
const localeHead = useLocaleHead()
useHead(() => ({
  htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang },
  link: [...(localeHead.value.link ?? [])],
  meta: [...(localeHead.value.meta ?? [])],
}))

useSeoMeta({
  titleTemplate: (title) => {
    if (site.name) return title ? `${title} · ${site.name}` : `${site.name} · ${t('pages.home.title')}`
    return title ? `${title} · ${t('pages.home.title')}` : t('pages.home.title')
  },
  ogSiteName: () => site.name || t('pages.home.title'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: 'index,follow',
})

// Site-wide structured data. The Person node only exists once the real name is set in the admin.
const config = useRuntimeConfig()
useHead(() => {
  const url = config.public.siteUrl.replace(/\/$/, '')
  const graph: Record<string, unknown>[] = [
    { '@type': 'WebSite', '@id': `${url}/#website`, url, name: site.name ?? t('pages.home.title'), inLanguage: ['fr-FR', 'en-US'] },
  ]
  if (site.name) {
    graph.push({
      '@type': 'Person',
      '@id': `${url}/#person`,
      name: site.name,
      jobTitle: t('pages.home.title'),
      url,
      ...(site.links.length ? { sameAs: site.links.map((l) => l.href) } : {}),
    })
  }
  return {
    script: [{ key: 'ld-site', type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }],
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage :transition="transition" />
  </NuxtLayout>
</template>
