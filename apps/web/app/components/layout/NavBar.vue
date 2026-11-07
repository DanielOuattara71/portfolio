<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const display = useDisplayName()

const isHome = computed(() => String(route.name ?? '').startsWith('index'))

const navItems = computed(() => [
  { key: 'home', anchor: 'home' },
  { key: 'projects', anchor: 'home-projects' },
  { key: 'profile', anchor: 'home-profile' },
  { key: 'expertise', anchor: 'home-services' },
  { key: 'contact', to: localePath('contact') },
])

/** Route names look like "projets-slug___fr": the section is the part before the first "-" or "___". */
const section = computed(() => String(route.name ?? '').split('___')[0]?.split('-')[0] ?? '')
const activeAnchor = ref<string>('home')
let sectionObserver: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
const pillNav = ref<HTMLElement | null>(null)
const itemRefs = new Map<string, HTMLElement>()
const indicator = reactive({ x: 0, y: 0, w: 0, h: 0, show: false, ready: false })

function setItemRef(key: string, el: unknown) {
  const node = (el as { $el?: HTMLElement } | null)?.$el ?? (el as HTMLElement | null)
  if (node instanceof HTMLElement) itemRefs.set(key, node)
  else itemRefs.delete(key)
}

const indicatorStyle = computed(() => ({
  transform: `translate(${indicator.x}px, ${indicator.y}px)`,
  width: `${indicator.w}px`,
  height: `${indicator.h}px`,
  opacity: indicator.show ? '1' : '0',
  transition: indicator.ready && !prefersReducedMotion()
    ? 'transform var(--duration-base) var(--ease-out), width var(--duration-base) var(--ease-out), height var(--duration-base) var(--ease-out), opacity var(--duration-fast)'
    : 'none',
}))

async function updateIndicator(animate = true) {
  if (!import.meta.client) return
  await nextTick()
  const container = pillNav.value
  if (!container) return
  const activeKey = navItems.value.find((i) => isActive(i))?.key
  const el = activeKey ? itemRefs.get(activeKey) : null
  if (!el) {
    indicator.show = false
    return
  }
  const cr = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const prevReady = indicator.ready
  if (!animate) indicator.ready = false
  indicator.x = r.left - cr.left
  indicator.y = r.top - cr.top
  indicator.w = r.width
  indicator.h = r.height
  indicator.show = true
  await nextTick()
  indicator.ready = prevReady || animate
}

function isActive(item: { key?: string; to?: string; anchor?: string }) {
  if (item.to) return section.value === 'contact'
  return isHome.value && activeAnchor.value === item.anchor
}

function observeSections() {
  if (!import.meta.client) return
  sectionObserver?.disconnect()
  sectionObserver = null
  if (!isHome.value) {
    activeAnchor.value = 'home'
    return
  }
  const ids = navItems.value.flatMap((i) => (i.anchor ? [i.anchor] : []))
  const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
  if (!els.length) return
  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) activeAnchor.value = e.target.id
      }
    },
    { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
  )
  for (const el of els) sectionObserver.observe(el)
}

const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

async function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) {
    await nextTick()
    menu.value?.querySelector('a')?.focus()
  }
}

function closeMenu(returnFocus = false) {
  menuOpen.value = false
  if (returnFocus) menuButton.value?.focus()
}

watch(
  () => route.fullPath,
  async () => {
    closeMenu()
    if (import.meta.client) {
      await nextTick()
      observeSections()
      await updateIndicator()
    }
  },
)

watch([activeAnchor, isHome, section], () => updateIndicator())

async function onAnchorClick(anchor: string, e: MouseEvent) {
  closeMenu()
  activeAnchor.value = anchor
  if (!isHome.value) return // let NuxtLink navigate to home#anchor
  e.preventDefault()
  const el = document.getElementById(anchor)
  if (!el) return
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(history.state, '', `#${anchor}`)
}

// Hide on scroll down, show on scroll up (motion M-06). Never hidden while focused or with the menu open.
const header = ref<HTMLElement | null>(null)
const hidden = ref(false)
let lastY = 0
function onScroll() {
  const y = window.scrollY
  const focusInside = header.value?.contains(document.activeElement) ?? false
  if (!prefersReducedMotion() && y > lastY && y > 140 && !menuOpen.value && !focusInside) hidden.value = true
  else if (y < lastY || y <= 140) hidden.value = false
  lastY = y
}
function onResize() {
  updateIndicator(false)
}

onMounted(async () => {
  lastY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  await nextTick()
  observeSections()
  await updateIndicator(false)
  requestAnimationFrame(() => { indicator.ready = true })
  if (pillNav.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => onResize())
    resizeObserver.observe(pillNav.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  sectionObserver?.disconnect()
  resizeObserver?.disconnect()
})
</script>

<template>
  <header ref="header" class="hdr" :class="{ 'is-hidden': hidden }" @focusin="hidden = false">
    <div class="wrap">
      <div class="row">
        <NuxtLink class="logo" :to="localePath('index')">
          <span class="mk" aria-hidden="true">{{ display.mark }}</span>
          <span class="logo-text">{{ display.text }}<span class="sr-only"> · {{ t('nav.home') }}</span></span>
        </NuxtLink>

        <nav ref="pillNav" class="pill" :aria-label="t('nav.label')">
          <span class="indicator" aria-hidden="true" :style="indicatorStyle"></span>
          <NuxtLink
            v-for="item in navItems"
            :key="item.key"
            :ref="(el) => setItemRef(item.key, el)"
            :to="item.to ?? { path: localePath('index'), hash: `#${item.anchor}` }"
            :aria-current="isActive(item) ? (item.to ? 'page' : 'true') : undefined"
            @click="item.anchor ? onAnchorClick(item.anchor, $event) : closeMenu()"
          >
            {{ t(`nav.${item.key}`) }}
          </NuxtLink>
        </nav>

        <div class="right">
          <LayoutLangToggle />
          <LayoutThemeToggle />
          <button
            ref="menuButton"
            class="menu-btn"
            type="button"
            :aria-expanded="menuOpen"
            aria-controls="mobile-menu"
            :aria-label="menuOpen ? t('nav.close') : t('nav.menu')"
            @click="toggleMenu"
          >
            <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span>
          </button>
        </div>
      </div>

      <nav
        v-show="menuOpen"
        id="mobile-menu"
        ref="menu"
        class="mnav"
        :aria-label="t('nav.mobileLabel')"
        @keydown.esc="closeMenu(true)"
      >
        <NuxtLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.to ?? { path: localePath('index'), hash: `#${item.anchor}` }"
          :aria-current="isActive(item) ? (item.to ? 'page' : 'true') : undefined"
          @click="item.anchor ? onAnchorClick(item.anchor, $event) : closeMenu()"
        >
          {{ t(`nav.${item.key}`) }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.hdr {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: var(--z-header);
  padding-block: 14px;
  pointer-events: none;
}

.row {
  display: grid;
  /* minmax(0, …): a long logo text truncates instead of pushing the menu off screen. */
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.row > *,
.mnav {
  pointer-events: auto;
  transition: transform var(--duration-base) var(--ease-out), opacity var(--duration-fast);
}

.is-hidden .row > *,
.is-hidden .mnav {
  transform: translateY(-150%);
  opacity: 0;
}

.logo {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  min-width: 0;
  max-width: 100%;
  text-decoration: none;
  white-space: nowrap;
}

.logo-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mk {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--marker);
  color: var(--on-marker);
  display: grid;
  place-items: center;
  font: 700 11px/1 var(--font-data);
  box-shadow: inset 0 0 0 1.5px var(--on-marker);
}

.pill {
  position: relative;
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: var(--radius-full);
  background: var(--marker);
  pointer-events: none;
  will-change: transform, width;
}

.pill a,
.mnav a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  text-decoration: none;
  font-size: 14px;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.pill a {
  position: relative;
  z-index: 1;
}

.pill a:hover:not([aria-current]) {
  background: var(--surface-sunken);
}

.pill a[aria-current='page'],
.pill a[aria-current='true'] {
  color: var(--on-marker);
}

.right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-btn {
  display: none;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: var(--ink);
  color: var(--on-ink);
  font-size: 16px;
  cursor: pointer;
}

.mnav {
  display: grid;
  gap: 4px;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface-raised);
  box-shadow: var(--shadow-menu);
}

.mnav a {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 500;
}

.mnav a[aria-current='page'],
.mnav a[aria-current='true'] {
  background: var(--marker);
  color: var(--on-marker);
  transition: background var(--duration-base) var(--ease-out), color var(--duration-base) var(--ease-out);
}

@media (min-width: 900px) {
  .mnav {
    display: none !important;
  }
}

@media (max-width: 899px) {
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .pill {
    display: none;
  }

  .menu-btn {
    display: grid;
    place-items: center;
  }
}
</style>
