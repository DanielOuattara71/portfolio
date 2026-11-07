<script setup lang="ts">
/**
 * Technology ribbon (design system: TechRibbon; motion M-18): brand-coloured tiles, hairline above,
 * faded edges, continuous CSS scroll, paused on hover and focus, static with reduced motion.
 */
const { t } = useI18n()
const items = useTechStack()

// Pause the loop while the ribbon is off screen (saves CPU and battery).
const root = ref<HTMLElement | null>(null)
const offscreen = ref(false)
let io: IntersectionObserver | null = null
onMounted(() => {
  if (!root.value) return
  io = new IntersectionObserver(([e]) => (offscreen.value = !e?.isIntersecting))
  io.observe(root.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section ref="root" class="ribbon" :class="{ 'is-off': offscreen }" :aria-label="t('hero.ribbonLabel')">
    <div class="wrap">
      <div class="rib">
        <div class="track">
          <ul>
            <li v-for="item in items" :key="item.name" class="ti" :class="{ txt: !item.path }" :title="item.name" :style="item.path ? { '--bg': item.bg, '--fg': item.fg } : undefined">
              <svg v-if="item.path" viewBox="0 0 24 24" aria-hidden="true"><path :d="item.path" /></svg>
              <span v-else aria-hidden="true">{{ item.short }}</span>
              <span class="sr-only">{{ item.name }}</span>
            </li>
          </ul>
          <ul aria-hidden="true">
            <li v-for="item in items" :key="item.name" class="ti" :class="{ txt: !item.path }" :title="item.name" :style="item.path ? { '--bg': item.bg, '--fg': item.fg } : undefined">
              <svg v-if="item.path" viewBox="0 0 24 24"><path :d="item.path" /></svg>
              <span v-else>{{ item.short }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ribbon {
  position: relative;
  z-index: 2;
  padding-block: 20px 6px;
}

.rib {
  overflow: hidden;
  padding-block: 22px 26px;
  border-top: 1px solid var(--line);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent);
}

.track {
  display: flex;
  width: max-content;
  will-change: transform;
  animation: marquee var(--duration-marquee) linear infinite;
}

.ribbon:hover .track,
.ribbon:focus-within .track,
.ribbon.is-off .track {
  animation-play-state: paused;
}

ul {
  display: flex;
  align-items: center;
  gap: 36px;
  margin: 0;
  padding: 0 36px 0 0;
  list-style: none;
}

.ti {
  flex: none;
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--bg);
  box-shadow: inset 0 0 0 1px rgba(20, 19, 17, 0.06);
  transition: transform var(--duration-base) var(--ease-out);
}

.ti:hover {
  transform: translateY(-4px);
}

.ti svg {
  width: 27px;
  height: 27px;
  fill: var(--fg);
}

.ti.txt {
  background: var(--surface-inverse);
  color: var(--marker);
  font: 700 11px/1.05 var(--font-data);
  text-align: center;
  white-space: pre-line;
}

@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .track {
    animation: none;
  }
}
</style>
