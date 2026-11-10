<script setup lang="ts">
import { setHeader } from 'h3'
/**
 * Case study page (docs/07-contenus.md §4, 10-maquettes.md §3, prompt 15).
 * Reusable data from useProjectBySlug; empty sections hidden; no fake screenshots.
 */
definePageMeta({ key: (route) => String(route.params.slug) })

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug))

// Private preview: ?apercu={token} renders the working copy on its real page (banner, noindex, no cache).
const previewToken = typeof route.query.apercu === 'string' && route.query.apercu ? route.query.apercu : null
const previewPending = ref<string[]>([])
if (previewToken) {
  try {
    const base = useRuntimeConfig().public.apiBase.replace(/\/$/, '')
    const preview = await $fetch(`${base}/public/preview/${encodeURIComponent(previewToken)}`)
    useState('published-content').value = preview
    previewPending.value = (preview as unknown as { preview?: { pendingFields?: string[] } }).preview?.pendingFields ?? []
    const ev = useRequestEvent()
    if (ev) {
      setHeader(ev, 'Cache-Control', 'private, no-store')
      setHeader(ev, 'X-Robots-Tag', 'noindex, nofollow')
    }
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Preview not found', fatal: false })
  }
}
const isPreview = computed(() => !!previewToken)

const project = useProjectBySlug(slug)

if (!project.value) {
  const lc = locale.value === 'fr' ? 'fr' : 'en'
  const redir = usePublished().value.redirects?.find((x) => x.type === 'project' && x.locale === lc && x.from === slug.value && x.to)
  if (redir?.to) await navigateTo(localePath({ name: 'projets-slug', params: { slug: redir.to } }), { redirectCode: 301, replace: true })
  throw createError({ statusCode: 404, statusMessage: 'Record not found', fatal: false })
}

const showPh = useShowPlaceholders()
const c = computed(() => project.value!.caseStudy)
const next = computed(() => project.value!.next)

const facts = computed(() =>
  [
    { label: t('fields.role'), value: project.value!.role },
    { label: t('fields.period'), value: project.value!.period },
    { label: t('fields.stack'), value: project.value!.stack.length ? project.value!.stack.join(' · ') : null },
  ].filter((f) => f.value),
)

type SectionKey = 'context' | 'problem' | 'goals' | 'solution' | 'architecture' | 'tech' | 'challenges' | 'results' | 'gallery'
const tocSections = computed(() => {
  const items: { id: SectionKey; label: string }[] = []
  const add = (id: SectionKey, ok: boolean) => {
    if (ok) items.push({ id, label: t(`case.${id}`) })
  }
  add('context', !!c.value.context)
  add('problem', !!c.value.problem)
  add('goals', !!c.value.goals?.length)
  add('solution', !!c.value.solution?.length)
  add('architecture', !!c.value.architectureNote)
  add('tech', !!c.value.techRoles?.length)
  add('challenges', !!c.value.challenges?.length)
  add('results', !!c.value.results?.length)
  // Real captures, or identified placeholders in review mode only.
  add('gallery', c.value.gallery.length > 0 || showPh.value)
  return items
})

const activeId = ref<SectionKey | null>(null)
const article = ref<HTMLElement | null>(null)
const progress = ref(0)
const lightbox = ref<string | null>(null)
const dialog = ref<HTMLDialogElement | null>(null)

function updateProgress() {
  if (!import.meta.client || !article.value) return
  const rect = article.value.getBoundingClientRect()
  const total = rect.height - window.innerHeight
  progress.value = total > 0 ? Math.min(100, Math.max(0, Math.round((-rect.top / total) * 100))) : 0
}

function openLightbox(src: string) {
  lightbox.value = src
  dialog.value?.showModal()
}
function closeLightbox() {
  dialog.value?.close()
  lightbox.value = null
}

let observer: IntersectionObserver | null = null
onMounted(() => {
  updateProgress()
  window.addEventListener('scroll', updateProgress, { passive: true })
  if (!article.value) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) activeId.value = e.target.id as SectionKey
    },
    { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
  )
  article.value.querySelectorAll<HTMLElement>('[data-toc]').forEach((el) => observer?.observe(el))
})
onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('scroll', updateProgress)
  observer?.disconnect()
})

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl.replace(/\/$/, '')
const pubMedia = usePublished()
function seoImage(): string | null {
  const p = project.value
  if (!p?.seo?.imageId) return null
  const m = pubMedia.value.media[p.seo.imageId]
  if (!m || m.kind !== 'image' || !m.variants.length) return null
  const sorted = [...m.variants].sort((a, b) => a.width - b.width)
  return (sorted.find((v) => v.width >= 1200) ?? sorted.at(-1)!)?.url ?? null
}
usePageSeo({
  title: () => {
    const p = project.value
    if (!p) return ''
    const lc = locale.value === 'fr' ? 'fr' : 'en'
    return p.seo?.title?.[lc] ?? `${p.name} · ${t('pages.project.title')}`
  },
  description: () => {
    const p = project.value
    if (!p) return ''
    const lc = locale.value === 'fr' ? 'fr' : 'en'
    return p.seo?.description?.[lc] ?? p.summary ?? ''
  },
  robots: isPreview.value || project.value?.seo?.index === false ? 'noindex,nofollow' : undefined,
  image: () => seoImage(),
  jsonLd: () => {
    const p = project.value
    if (!p) return []
    const url = siteUrl + localePath({ name: 'projets-slug', params: { slug: p.slug } })
    return [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('nav.home'), item: siteUrl + localePath('index') },
          { '@type': 'ListItem', position: 2, name: t('pages.projects.title'), item: siteUrl + localePath('projets') },
          { '@type': 'ListItem', position: 3, name: p.name, item: url },
        ],
      },
      {
        '@type': 'CreativeWork',
        name: p.name,
        description: p.summary,
        url,
        inLanguage: locale.value === 'fr' ? 'fr-FR' : 'en-US',
        ...(p.stack.length ? { keywords: p.stack.join(', ') } : {}),
        ...(p.period ? { dateCreated: p.period } : {}),
        ...(p.links?.length ? { sameAs: p.links.map((l) => l.href) } : {}),
        isPartOf: { '@id': `${siteUrl}/#website` },
      },
    ]
  },
})
</script>

<template>
  <div v-if="project" class="page">
    <div v-if="isPreview" class="wrap preview-banner" role="status">
      <b>Aperçu — non publié</b>
      <span v-if="previewPending.length" class="small">{{ previewPending.length }} champ(s) « à valider » restant(s) : {{ previewPending.join(', ') }}</span>
      <span v-else class="small">Copie de travail, non visible des visiteurs.</span>
    </div>
    <header class="wrap hero">
      <NuxtLink class="back" :to="localePath('projets')">← {{ t('cta.backProjects') }}</NuxtLink>
      <div class="badges">
        <UiBadge variant="id">{{ project.id }}</UiBadge>
        <UiBadge>{{ project.kind }}</UiBadge>
        <UiBadge v-if="project.context">{{ t(`ctx.${project.context}`) }}</UiBadge>
        <UiBadge v-if="project.solo">{{ t('projects.solo') }}</UiBadge>
      </div>
      <h1 class="name">{{ project.name }}</h1>
      <p class="tagline">{{ project.tagline }}</p>
      <UiRecordFields v-if="facts.length" class="facts" :items="facts" />
      <!-- Every published project has at least one link (rule in @portfolio/shared/project). -->
      <div v-if="project.links?.length" class="links">
        <UiButton
          v-for="(l, i) in project.links"
          :key="l.href"
          :label="t(`link.${l.kind}`)"
          :href="l.href"
          external
          icon="↗"
          :variant="i === 0 ? 'primary' : 'secondary'"
        />
      </div>
      <p v-else-if="showPh" class="links-ph">{{ t('ph.link') }}</p>
    </header>

    <div v-if="project.cover || showPh" class="wrap hero-media">
      <div class="media-frame">
        <img v-if="project.cover" :src="project.cover" :srcset="project.coverSrcset ?? undefined" :alt="project.coverAlt ?? t('case.heroAlt')" class="media-img" fetchpriority="high" decoding="async" />
        <div v-else class="placeholder">
          <span>{{ t('ph.media') }}</span>
        </div>
      </div>
    </div>

    <div class="wrap body">
      <aside v-if="tocSections.length" class="toc" :aria-label="t('case.toc')">
        <nav>
          <p class="toc-title">{{ t('case.toc') }}</p>
          <ol>
            <li v-for="s in tocSections" :key="s.id">
              <a :href="`#${s.id}`" :aria-current="activeId === s.id ? 'location' : undefined">{{ s.label }}</a>
            </li>
          </ol>
        </nav>
      </aside>

      <article ref="article" class="content">
        <section v-if="c.context" id="context" data-toc class="block">
          <h2>{{ t('case.context') }}</h2>
          <p>{{ c.context }}</p>
        </section>

        <section v-if="c.problem" id="problem" data-toc class="block">
          <h2>{{ t('case.problem') }}</h2>
          <p>{{ c.problem }}</p>
        </section>

        <section v-if="c.goals?.length" id="goals" data-toc class="block">
          <h2>{{ t('case.goals') }}</h2>
          <ul>
            <li v-for="(g, i) in c.goals" :key="i">{{ g }}</li>
          </ul>
        </section>

        <section v-if="c.solution?.length" id="solution" data-toc class="block">
          <h2>{{ t('case.solution') }}</h2>
          <p v-for="(p, i) in c.solution" :key="i">{{ p }}</p>
        </section>

        <section v-if="c.architectureNote" id="architecture" data-toc class="block">
          <h2>{{ t('case.architecture') }}</h2>
          <div class="arch">
            <p>{{ c.architectureNote }}</p>
            <div v-if="showPh" class="placeholder placeholder--arch">
              <span>{{ t('case.archPlaceholder') }}</span>
            </div>
          </div>
        </section>

        <section v-if="c.techRoles?.length" id="tech" data-toc class="block">
          <h2>{{ t('case.tech') }}</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Tech</th>
                  <th scope="col">{{ t('fields.role') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in c.techRoles" :key="row.tech">
                  <th scope="row">{{ row.tech }}</th>
                  <td>{{ row.role }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="c.challenges?.length" id="challenges" data-toc class="block">
          <h2>{{ t('case.challenges') }}</h2>
          <ul>
            <li v-for="(ch, i) in c.challenges" :key="i">{{ ch }}</li>
          </ul>
        </section>

        <section v-if="c.results?.length" id="results" data-toc class="block">
          <h2>{{ t('case.results') }}</h2>
          <ul>
            <li v-for="(r, i) in c.results" :key="i">{{ r }}</li>
          </ul>
        </section>

        <section v-if="c.gallery.length || showPh" id="gallery" data-toc class="block">
          <h2>{{ t('case.gallery') }}</h2>
          <div v-if="c.gallery.length" class="gallery">
            <figure
              v-for="(g, i) in c.gallery"
              :key="g.src"
              class="shot-fig"
            >
              <button
                type="button"
                class="shot"
                :aria-label="g.alt || `${t('case.galleryAlt')} ${i + 1}`"
                @click="openLightbox(g.src)"
              >
                <img :src="g.src" :srcset="g.srcset" :alt="g.alt || `${t('case.galleryAlt')} ${i + 1}`" loading="lazy" decoding="async" />
              </button>
              <figcaption v-if="g.caption" class="shot-cap">{{ g.caption }}</figcaption>
            </figure>
          </div>
          <div v-else class="gallery gallery--ph">
            <div v-for="n in 3" :key="n" class="placeholder placeholder--shot">
              <span>{{ t('ph.media') }}</span>
            </div>
          </div>
        </section>
      </article>
    </div>

    <NuxtLink
      v-if="next"
      class="wrap next is-inverse"
      :to="localePath({ name: 'projets-slug', params: { slug: next.slug } })"
      data-cursor="open"
    >
      <span class="next-label">{{ t('case.next') }}</span>
      <span class="next-name">{{ next.name }}</span>
      <span class="next-tag">{{ next.tagline }}</span>
    </NuxtLink>

    <div class="progress" :aria-label="t('case.readProgress')" role="img">
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle class="track" cx="18" cy="18" r="15.5" />
        <circle class="bar" cx="18" cy="18" r="15.5" :style="{ strokeDashoffset: `${97.4 - (97.4 * progress) / 100}` }" />
      </svg>
      <span>{{ progress }}%</span>
    </div>

    <dialog ref="dialog" class="lightbox" @click.self="closeLightbox" @close="lightbox = null">
      <button type="button" class="close" :aria-label="t('nav.close')" @click="closeLightbox">×</button>
      <img v-if="lightbox" :src="lightbox" :alt="t('case.galleryAlt')" />
    </dialog>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 2;
  padding-block: 32px 64px;
}

.preview-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  border: 1px dashed var(--line);
  color: var(--ink);
}

.shot-fig {
  margin: 0;
  display: grid;
  gap: 6px;
}

.shot-cap {
  font: 400 12px/1.4 var(--font-data);
  color: var(--ink-muted);
}

.back {
  display: inline-flex;
  margin-bottom: 10px;
  padding-block: 8px;
  font: 400 12px/1 var(--font-data);
  color: var(--ink-muted);
  text-decoration: none;
}

.back:hover {
  color: var(--ink);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.name {
  margin: 0;
  font: 700 clamp(42px, 8vw, 96px) / 0.98 var(--font-display);
  letter-spacing: -0.04em;
}

.tagline {
  margin-top: 14px;
  max-width: 48ch;
  font-size: clamp(18px, 2vw, 22px);
  color: var(--ink-muted);
}

.facts {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.links-ph {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 16px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-full);
  font: 400 12px/1.4 var(--font-data);
  color: var(--ink-muted);
}

.hero-media {
  margin-block: 28px 8px;
}

.media-frame {
  overflow: hidden;
  aspect-ratio: 16 / 8;
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
}

.media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 24px;
  background: repeating-linear-gradient(135deg, var(--placeholder) 0 10px, var(--surface-sunken) 10px 20px);
  color: var(--ink-muted);
  font: 400 12px/1.4 var(--font-data);
  text-align: center;
}

.body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
  margin-top: 28px;
}

.toc {
  position: sticky;
  top: 96px;
}

.toc-title {
  margin: 0 0 10px;
  font: 400 11px/1 var(--font-data);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.toc ol {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc a {
  font-size: 14px;
  color: var(--ink-muted);
  text-decoration: none;
}

.toc a:hover,
.toc a[aria-current='location'] {
  color: var(--ink);
}

.content {
  display: grid;
  gap: 34px;
  max-width: 68ch;
}

.block h2 {
  margin: 0 0 12px;
  font: 600 26px/1.15 var(--font-display);
  letter-spacing: -0.02em;
}

.block p,
.block li {
  font-size: 17px;
  line-height: 1.65;
  color: var(--ink);
}

.block p + p {
  margin-top: 12px;
}

.block ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.arch {
  display: grid;
  gap: 14px;
}

.placeholder--arch {
  min-height: 220px;
  border-radius: var(--radius-md);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

thead th {
  font: 400 11px/1.3 var(--font-data);
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

tbody th {
  font-weight: 600;
  white-space: nowrap;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.shot {
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-sunken);
  cursor: pointer;
}

.shot img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-out);
}

.shot:hover img {
  transform: scale(1.03);
}

.placeholder--shot {
  min-height: 140px;
  border-radius: var(--radius-md);
}

.next {
  display: grid;
  gap: 8px;
  margin-top: 40px;
  padding: 28px;
  border-radius: var(--radius-lg);
  text-decoration: none;
  /* Text on the dark surface (inheriting the page ink made it invisible) */
  color: var(--ink-inverse);
}

.next-label {
  font: 400 11px/1 var(--font-data);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-inverse-muted);
}

.next-name {
  font: 700 clamp(28px, 4vw, 52px) / 1.05 var(--font-display);
  letter-spacing: -0.03em;
}

.next-tag {
  color: var(--ink-inverse-muted);
  font-size: 16px;
  max-width: 60ch;
}

.progress {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 20;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  color: var(--ink);
}

.progress svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.progress circle {
  fill: var(--surface-raised);
  stroke-width: 2.5;
}

.track {
  stroke: var(--line);
}

.bar {
  stroke: var(--ink);
  stroke-dasharray: 97.4;
  transition: stroke-dashoffset 80ms linear;
}

.progress span {
  position: relative;
  font: 500 10px/1 var(--font-data);
}

.lightbox {
  max-width: min(1100px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 0;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  overflow: hidden;
  /* Motion M-11: image grows from centre; opacity only, no layout cost */
  animation: lightbox-in var(--duration-slow) var(--ease-out);
}

.lightbox::backdrop {
  background: color-mix(in srgb, var(--ink) 55%, transparent);
  animation: lightbox-backdrop-in var(--duration-base) var(--ease-out);
}

@keyframes lightbox-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes lightbox-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.lightbox img {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 32px);
}

.close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  color: var(--ink);
  font-size: 22px;
  cursor: pointer;
}

@media (max-width: 899px) {
  .body {
    grid-template-columns: 1fr;
  }

  .toc {
    position: static;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
  }

  .toc ol {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 559px) {
  .toc ol {
    grid-template-columns: 1fr;
  }

  .gallery {
    grid-template-columns: 1fr;
  }

  .progress {
    width: 42px;
    height: 42px;
    right: 12px;
    bottom: 12px;
  }
}
</style>
