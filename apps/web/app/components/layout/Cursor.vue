<script setup lang="ts">
import gsap from 'gsap'

/**
 * Label cursor (motion M-12, interactions I-01). The system cursor stays everywhere except on
 * zones marked data-cursor="view|drag|open|read|go", where a marker disc with a label replaces it.
 * Fine pointer, ≥ 900 px and motion allowed only. Decorative: aria-hidden.
 */
const { t } = useI18n()
const disc = ref<HTMLElement | null>(null)
const label = ref('')
const active = ref(false)
let enabled = false
let xTo: gsap.QuickToFunc | null = null
let yTo: gsap.QuickToFunc | null = null

function check() {
  const ok =
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    window.innerWidth >= 900
  enabled = ok
  if (ok) document.documentElement.dataset.cursorMode = 'on'
  else {
    delete document.documentElement.dataset.cursorMode
    active.value = false
  }
}

function onMove(e: PointerEvent) {
  if (!enabled || !disc.value) return
  xTo?.(e.clientX)
  yTo?.(e.clientY)
  const target = (e.target as Element | null)?.closest?.('[data-cursor]')
  if (target && !target.closest('input, textarea, select')) {
    const key = target.getAttribute('data-cursor') ?? 'view'
    label.value = t(`cursor.${key}`)
    active.value = true
  } else {
    active.value = false
  }
}

function onLeave() {
  active.value = false
}

onMounted(() => {
  check()
  if (disc.value) {
    xTo = gsap.quickTo(disc.value, 'x', { duration: 0.35, ease: 'power3.out' })
    yTo = gsap.quickTo(disc.value, 'y', { duration: 0.35, ease: 'power3.out' })
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  window.addEventListener('resize', check)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  document.documentElement.removeEventListener('pointerleave', onLeave)
  window.removeEventListener('resize', check)
  delete document.documentElement.dataset.cursorMode
})
</script>

<template>
  <div ref="disc" class="cursor" :class="{ on: active }" aria-hidden="true">
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.cursor {
  position: fixed;
  left: 0;
  top: 0;
  z-index: var(--z-cursor);
  width: 74px;
  height: 74px;
  margin: -37px 0 0 -37px;
  pointer-events: none;
}

.cursor span {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--marker);
  color: var(--on-marker);
  font: 700 11px/1 var(--font-data);
  transform: scale(0);
  transition: transform 350ms var(--ease-out);
}

.cursor.on span {
  transform: scale(1);
}
</style>
