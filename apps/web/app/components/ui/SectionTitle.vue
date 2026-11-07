<script setup lang="ts">
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { duration } from '@portfolio/design-tokens/motion'

/**
 * Route-style section title (/PROJECTS) with a real count and a decorative ghost word
 * (design system: SectionTitle; motion M-04).
 */
withDefaults(
  defineProps<{
    title: string
    tag?: 'h1' | 'h2'
    count?: string
    ghost?: string
    id?: string
  }>(),
  { tag: 'h2' },
)

const root = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null

onMounted(() => {
  if (!root.value || prefersReducedMotion()) return
  const el = root.value
  ctx = gsap.context(() => {
    const trigger = { trigger: el, start: 'top 85%', once: true }
    const tl = gsap.timeline({ defaults: { ease: EASE.out }, scrollTrigger: trigger })
    tl.from('.title-inner', { yPercent: 110, duration: duration.slow })
    if (el.querySelector('.count')) tl.from('.count', { opacity: 0, duration: duration.base }, 0.3)
    const lead = el.querySelector('.lead')
    if (lead) {
      const split = SplitText.create(lead, { type: 'lines', mask: 'lines', aria: 'none' })
      tl.from(split.lines, { yPercent: 110, duration: duration.slow, stagger: 0.06, onComplete: () => split.revert() }, 0.15)
    }
    const ghost = el.querySelector('.ghost')
    if (ghost && window.matchMedia('(min-width: 900px)').matches) {
      gsap.fromTo(ghost, { xPercent: -4 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
    }
  }, el)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <div ref="root" class="st">
    <!-- Decorative: drawn by CSS from data-word, so it is neither read aloud nor treated as text. -->
    <div v-if="ghost" class="ghost" aria-hidden="true" :data-word="ghost"></div>
    <component :is="tag" :id="id" class="title"><span class="title-mask"><span class="title-inner">{{ title }}</span></span></component>
    <span v-if="count" class="count">{{ count }}</span>
    <p v-if="$slots.default" class="lead"><slot /></p>
  </div>
</template>

<style scoped>
.st {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  gap: 10px 16px;
  margin-bottom: var(--space-8);
}

.title {
  position: relative;
  font: 800 clamp(34px, 6vw, 76px)/0.95 var(--font-display);
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.title-mask {
  display: inline-block;
  overflow: hidden;
  padding-block: 0.05em;
  vertical-align: bottom;
}

.title-inner {
  display: inline-block;
}

.count {
  font: 400 13px/1 var(--font-data);
  color: var(--ink-muted);
}

.lead {
  position: relative;
  grid-column: 1 / -1;
  max-width: 52ch;
  font-size: 18px;
  color: var(--ink-muted);
}

.is-inverse .count,
.is-inverse .lead {
  color: var(--ink-inverse-muted);
}

.ghost {
  position: absolute;
  inset: -8px 0 auto;
  overflow: hidden;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
  font: 800 clamp(64px, 14vw, 220px)/1 var(--font-display);
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: currentColor;
  opacity: 0.045;
}

.ghost::before {
  content: attr(data-word);
}
</style>
