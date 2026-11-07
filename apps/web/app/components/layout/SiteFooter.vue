<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { duration } from '@portfolio/design-tokens/motion'

/** Global footer (design system: Footer; motion M-17; interactions I-15). */
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const site = useSite()
const year = new Date().getFullYear()
const display = useDisplayName()
const parts = computed(() => display.value.words)
const onContact = computed(() => String(route.name ?? '').startsWith('contact'))

const root = ref<HTMLElement | null>(null)
const copied = ref(false)
let ctx: gsap.Context | null = null

async function copyEmail() {
  if (!site.email) return
  try {
    await navigator.clipboard.writeText(site.email)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard refused: the address stays visible and selectable */
  }
}

onMounted(() => {
  if (!root.value || prefersReducedMotion()) return
  const el = root.value
  ctx = gsap.context(() => {
    const split = SplitText.create(el.querySelector('h2'), { type: 'lines', mask: 'lines', aria: 'none' })
    const tl = gsap.timeline({
      defaults: { ease: EASE.out },
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      onComplete: () => split.revert(),
    })
    tl.from(split.lines, { yPercent: 110, duration: duration.slow, stagger: 0.06 })
      .from('.round', { scale: 0.6, rotate: -20, opacity: 0, duration: duration.slow, clearProps: 'scale,rotate,opacity' }, 0.2)
      .from('.socials > *', { y: 12, opacity: 0, duration: 0.5, stagger: 0.05 }, 0.3)

    // Signature rises with the scroll as the footer enters (desktop only).
    if (window.matchMedia('(min-width: 900px)').matches) {
      gsap.from('.word', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true },
      })
    }
  }, el)
})

onBeforeUnmount(() => ctx?.revert())
// Recompute trigger positions when the page above changes height.
watch(() => route.fullPath, () => nextTick(() => ScrollTrigger.refresh()))
</script>

<template>
  <footer ref="root" class="foot">
    <div class="wrap">
      <div class="panel is-inverse">
        <div class="lead">
          <h2>{{ t('footer.title') }} <span class="acc">{{ t('footer.titleAccent') }}</span>.</h2>
          <NuxtLink v-if="!onContact" v-magnetic class="round" :to="localePath('contact')" data-cursor="go">
            <span>{{ t('cta.start') }}<span class="arrow" aria-hidden="true">↗</span></span>
          </NuxtLink>
        </div>

        <div v-if="site.links.length || site.email || site.cvUrl" class="socials">
          <a v-for="l in site.links" :key="l.href" :href="l.href" target="_blank" rel="noopener">{{ l.label }}<span class="sr-only"> ({{ t('a11y.newTab') }})</span></a>
          <button v-if="site.email" type="button" @click="copyEmail">
            <span aria-live="polite">{{ copied ? t('copy.done') : t('copy.email') }}</span>
          </button>
          <a v-if="site.cvUrl" :href="site.cvUrl">{{ t('cta.cv') }}</a>
        </div>

        <div v-if="parts.length" class="word" aria-hidden="true">
          <span class="outline-text">{{ parts[0] }}</span>
          <span>{{ parts.slice(1).join(' ') }}</span>
        </div>

        <div class="legal">
          <span>© {{ year }} · {{ t('footer.role') }} · {{ t('footer.modes') }}</span>
          <span class="links">
            <NuxtLink :to="localePath('mentions-legales')">{{ t('footer.legal') }}</NuxtLink>
            <NuxtLink :to="localePath('confidentialite')">{{ t('footer.privacy') }}</NuxtLink>
            <a href="#main">{{ t('footer.top') }} ↑</a>
          </span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.foot {
  position: relative;
  z-index: 2;
  padding-block: var(--space-6) 40px;
}

.panel {
  display: grid;
  gap: 36px;
  padding: clamp(22px, 4vw, 48px);
  border-radius: var(--radius-2xl);
  background: var(--surface-inverse);
  color: var(--ink-inverse);
  overflow: hidden;
}

.lead {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}

h2 {
  max-width: 14ch;
  font: 700 clamp(32px, 5.4vw, 72px)/1 var(--font-display);
  letter-spacing: -0.04em;
}

.round {
  flex: none;
  width: 150px;
  height: 150px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--marker);
  color: var(--on-marker);
  text-align: center;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
}

.arrow {
  display: block;
  font-size: 24px;
}

.socials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.socials a,
.socials button {
  padding: 9px 14px;
  border: 1px solid var(--line-inverse);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--ink-inverse);
  text-decoration: none;
  font: 400 12px/1 var(--font-data);
  cursor: pointer;
}

.socials a:hover,
.socials button:hover {
  border-color: var(--marker);
}

.word {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.2em;
  font: 800 clamp(44px, 12.4vw, 190px)/0.85 var(--font-display);
  letter-spacing: -0.045em;
  text-transform: uppercase;
}

.word span {
  transition: color var(--duration-base) var(--ease-out), -webkit-text-stroke-color var(--duration-base);
}

/* Outline / fill swap on hover (I-15), pointer devices only */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .word:hover span:first-child {
    color: var(--ink-inverse);
  }

  .word:hover span:last-child {
    color: transparent;
    -webkit-text-stroke: 1.5px var(--ink-inverse);
  }
}

.legal {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  font: 400 11px/1.4 var(--font-data);
  color: var(--ink-inverse-muted);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

/* Touch targets of at least 24px high (WCAG 2.5.8). */
.links a {
  display: inline-block;
  padding-block: 6px;
}
</style>
