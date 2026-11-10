<script setup lang="ts">
/**
 * Hero portrait stack (design system: PortraitStack; motion M-03; interactions I-05).
 * Card 1: photo (from the admin; placeholder until provided). Card 2: 1-bit "data view".
 * Card 3: profile record. Click, drag, arrow keys or buttons cycle the cards.
 */
const props = defineProps<{
  badge: string
  profile: { label: string; value: string | null }[]
  photoUrl?: string | null
  photoSrcset?: string | null
  photoAlt?: string | null
}>()

const { t } = useI18n()
const showPh = useShowPlaceholders()
const front = ref(0)
const leaving = ref<number | null>(null)
const cards = [0, 1, 2]
const label = computed(() => t(`hero.cards.${front.value}`))
const visibleProfile = computed(() => props.profile.filter((f) => f.value))

const pos = (i: number) => (i - front.value + cards.length) % cards.length

function next() {
  if (leaving.value !== null) return
  if (prefersReducedMotion()) {
    front.value = (front.value + 1) % cards.length
    return
  }
  leaving.value = front.value
  setTimeout(() => {
    front.value = (front.value + 1) % cards.length
    leaving.value = null
  }, 380)
}

function prev() {
  if (leaving.value !== null) return
  front.value = (front.value + cards.length - 1) % cards.length
}

// Drag / swipe (motion M-03): the front card follows the pointer with proportional rotation.
// Only clearly horizontal gestures count; vertical page scroll is never blocked (touch-action).
const cardsEl = ref<HTMLElement | null>(null)
let startX: number | null = null
let dragging = false

function frontCard(): HTMLElement | null {
  return cardsEl.value?.querySelector('[data-pos="0"]') ?? null
}

function onDown(e: PointerEvent) {
  startX = e.clientX
  dragging = true
  const el = frontCard()
  if (el && !prefersReducedMotion()) el.style.transition = 'none'
}

function onMove(e: PointerEvent) {
  if (!dragging || startX === null || prefersReducedMotion()) return
  const el = frontCard()
  if (!el) return
  const dx = e.clientX - startX
  // Follow the pointer, rotate proportionally (capped), skip vertical noise.
  const x = Math.max(-160, Math.min(160, dx))
  el.style.transform = `translateX(${x}px) rotate(${x * 0.08}deg)`
}

function onUp(e: PointerEvent) {
  if (startX === null) return
  const dx = e.clientX - startX
  const el = frontCard()
  if (el) el.style.transition = ''
  startX = null
  dragging = false
  if (Math.abs(dx) > 40) {
    // Fling: the card leaves in the drag direction, then the stack re-ranks (existing flow).
    if (el) el.style.transform = ''
    if (dx < 0) next()
    else prev()
  } else if (el && !prefersReducedMotion()) {
    // Snap back to place.
    el.style.transition = 'transform var(--duration-base) var(--ease-out)'
    el.style.transform = ''
    requestAnimationFrame(() => {
      el.style.transition = ''
    })
  } else {
    next()
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'Enter') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  }
}
</script>

<template>
  <div class="stack">

    <div
      ref="cardsEl"
      class="cards"
      tabindex="0"
      role="group"
      :aria-roledescription="t('hero.carousel')"
      :aria-label="t('hero.stackLabel')"
      data-cursor="drag"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @keydown="onKey"
    >
      <figure class="pc" :data-pos="pos(0)" :class="{ leaving: leaving === 0 }" :aria-hidden="front !== 0">
        <img v-if="photoUrl" :src="photoUrl" :srcset="photoSrcset ?? undefined" :alt="photoAlt ?? t('hero.photoAlt')" class="media" />
        <div v-else class="photo" role="img" :aria-label="t('hero.photoAlt')" />
        <figcaption><span>portrait.jpg</span><span v-if="!photoUrl && showPh" class="muted">{{ t('hero.photoMissing') }}</span></figcaption>
      </figure>

      <figure class="pc" :data-pos="pos(1)" :class="{ leaving: leaving === 1 }" :aria-hidden="front !== 1">
        <div class="dither" role="img" :aria-label="t('hero.ditherAlt')" />
        <figcaption><span>{{ t('hero.cards.1') }}</span><span>1 bit</span></figcaption>
      </figure>

      <figure class="pc profile is-inverse" :data-pos="pos(2)" :class="{ leaving: leaving === 2 }" :aria-hidden="front !== 2">
        <span class="big" aria-hidden="true">ON<br />DYX</span>
        <dl class="fields">
          <template v-for="f in visibleProfile" :key="f.label">
            <dt>{{ f.label }}</dt>
            <dd>{{ f.value }}</dd>
          </template>
        </dl>
      </figure>
    </div>

    <div class="ctl">
      <button class="iconbtn" type="button" :aria-label="t('hero.prev')" @click="prev">←</button>
      <span class="lbl" aria-live="polite">{{ label }} · {{ front + 1 }}/3</span>
      <button class="iconbtn" type="button" :aria-label="t('hero.next')" @click="next">→</button>
    </div>
  </div>
</template>

<style scoped>
.stack {
  position: relative;
}

.cards {
  position: relative;
  aspect-ratio: 4 / 5;
  cursor: pointer;
  touch-action: pan-y;
  border-radius: var(--radius-xl);
}

.pc {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
  box-shadow: inset 0 0 0 1px var(--line), var(--shadow-lift);
  transform-origin: 50% 100%;
  transition: transform var(--duration-slow) var(--ease-out), opacity var(--duration-base);
}

.pc[data-pos='0'] { z-index: 3; transform: none; }
.pc[data-pos='1'] { z-index: 2; transform: translate(22px, -16px) rotate(5deg) scale(0.95); }
.pc[data-pos='2'] { z-index: 1; transform: translate(42px, -30px) rotate(10deg) scale(0.9); }

@media (hover: hover) {
  .cards:hover .pc[data-pos='1'] { transform: translate(28px, -20px) rotate(7deg) scale(0.95); }
  .cards:hover .pc[data-pos='2'] { transform: translate(52px, -36px) rotate(12deg) scale(0.9); }
}

.pc.leaving {
  transform: translate(-120%, 10px) rotate(-14deg) !important;
  opacity: 0;
  transition: transform 380ms var(--ease-in), opacity 380ms var(--ease-in);
}

.media,
.photo,
.dither {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Placeholder silhouette until the real photo is uploaded */
.photo {
  background:
    radial-gradient(ellipse 19% 17% at 50% 33%, #77716a 0 97%, transparent 100%),
    radial-gradient(ellipse 9% 10% at 50% 49%, #3c3934 0 97%, transparent 100%),
    radial-gradient(ellipse 50% 44% at 50% 104%, #4b4741 0 98%, transparent 100%),
    linear-gradient(#dcd6ca, #cdc6b8);
}

/* 1-bit view (generated from the real photo later) */
.dither {
  background: var(--marker);
}

.dither::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, var(--on-marker) 1.4px, transparent 1.7px) 0 0 / 5px 5px;
  -webkit-mask:
    radial-gradient(ellipse 19% 17% at 50% 33%, #000 97%, transparent 100%),
    radial-gradient(ellipse 9% 10% at 50% 49%, #000 97%, transparent 100%),
    radial-gradient(ellipse 50% 44% at 50% 104%, #000 98%, transparent 100%);
  mask:
    radial-gradient(ellipse 19% 17% at 50% 33%, #000 97%, transparent 100%),
    radial-gradient(ellipse 9% 10% at 50% 49%, #000 97%, transparent 100%),
    radial-gradient(ellipse 50% 44% at 50% 104%, #000 98%, transparent 100%);
}

figcaption {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--ink);
  font: 400 10px/1.4 var(--font-data);
}

.profile {
  display: grid;
  align-content: space-between;
  padding: 22px;
  background: var(--surface-inverse);
  color: var(--ink-inverse);
}

.big {
  font: 800 42px/0.9 var(--font-display);
  letter-spacing: -0.04em;
  color: var(--marker);
}

.fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0;
  font: 400 12px/1.4 var(--font-data);
}

.fields dt {
  color: var(--ink-inverse-muted);
}

.fields dd {
  margin: 0;
}

.ctl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
}

.iconbtn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface-raised);
  cursor: pointer;
}

.iconbtn:hover {
  border-color: var(--ink);
}

.lbl {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--ink);
  color: var(--on-ink);
  font: 400 11px/1.2 var(--font-data);
}


</style>
