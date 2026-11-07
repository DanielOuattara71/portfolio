<script setup lang="ts">
import gsap from 'gsap'
import { duration } from '@portfolio/design-tokens/motion'

/**
 * Session intro (docs/08-motion.md, M-01). Rendered on the server but only visible when the boot
 * script set html[data-intro] (first page of the session, motion allowed). The counter follows real
 * loading (fonts), between 0.9 s and 1.5 s. Skip button and Escape always available.
 */
const { t } = useI18n()
const introDone = useIntroDone()
const root = ref<HTMLElement | null>(null)
const count = ref('000')
const greeting = ref(t('intro.hello'))
const bar = ref<HTMLElement | null>(null)
let exiting = false
let tl: gsap.core.Timeline | null = null

function finish() {
  delete document.documentElement.dataset.intro
  try {
    sessionStorage.setItem('intro-seen', '1')
  } catch {
    /* storage blocked: intro may replay on next page */
  }
  document.removeEventListener('keydown', onKey)
}

function exit(fast = false) {
  if (exiting || !root.value) return
  exiting = true
  tl?.kill()
  gsap.to(root.value, {
    clipPath: 'inset(0% 0% 100% 0%)',
    duration: fast ? 0.5 : duration.xslow,
    ease: EASE.inOut,
    onUpdate() {
      if (!introDone.value && this.progress() > 0.6) introDone.value = true
    },
    onComplete() {
      introDone.value = true
      finish()
    },
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') exit(true)
}

onMounted(async () => {
  if (!document.documentElement.dataset.intro || !root.value) {
    introDone.value = true
    return
  }
  document.addEventListener('keydown', onKey)
  const progress = { v: 0 }
  const start = performance.now()

  // Phase 1: count to 90 while fonts load.
  tl = gsap.timeline()
  tl.to(progress, {
    v: 90,
    duration: 1.2,
    ease: EASE.out,
    onUpdate: () => {
      count.value = String(Math.round(progress.v)).padStart(3, '0')
      if (bar.value) bar.value.style.transform = `scaleX(${progress.v / 100})`
      if (progress.v > 50) greeting.value = t('intro.hello2')
    },
  })

  const fontsReady = document.fonts?.ready ?? Promise.resolve()
  const cap = new Promise((resolve) => setTimeout(resolve, 1500))
  await Promise.race([fontsReady, cap])
  const elapsed = performance.now() - start
  if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed))
  if (exiting) return

  // Phase 2: complete to 100, then open the curtain.
  tl?.kill()
  gsap.to(progress, {
    v: 100,
    duration: 0.25,
    ease: 'none',
    onUpdate: () => {
      count.value = String(Math.round(progress.v)).padStart(3, '0')
      if (bar.value) bar.value.style.transform = `scaleX(${progress.v / 100})`
    },
    onComplete: () => exit(),
  })
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div ref="root" class="intro" aria-hidden="true">
    <button class="skip" type="button" tabindex="-1" @click="exit(true)">{{ t('intro.skip') }}</button>
    <p class="hi">
      <span>{{ greeting }}</span>
      <small>{{ t('intro.loading') }}</small>
    </p>
    <p class="num">{{ count }}</p>
    <span ref="bar" class="bar" />
  </div>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: var(--z-intro);
  place-items: center;
  background: var(--surface-inverse);
  color: var(--ink-inverse);
  clip-path: inset(0% 0% 0% 0%);
}
/* Visibility rules (shown only with html[data-intro], 4 s safety) live in assets/styles/base.css */

.hi {
  display: grid;
  gap: 8px;
  text-align: center;
  font: 700 28px/1.1 var(--font-display);
}

.hi small {
  font: 400 11px/1 var(--font-data);
  color: var(--ink-inverse-muted);
}

.num {
  position: absolute;
  right: max(24px, env(safe-area-inset-right, 0px));
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  font: 800 clamp(80px, 18vw, 240px)/1 var(--font-display);
  letter-spacing: -0.06em;
  color: color-mix(in srgb, var(--ink-inverse) 12%, transparent);
  font-variant-numeric: tabular-nums;
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--marker);
  transform: scaleX(0);
  transform-origin: left;
}

.skip {
  position: absolute;
  top: calc(18px + env(safe-area-inset-top, 0px));
  right: max(18px, env(safe-area-inset-right, 0px));
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--ink-inverse) 25%, transparent);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--ink-inverse);
  font: 400 11px/1 var(--font-data);
  cursor: pointer;
}
</style>
