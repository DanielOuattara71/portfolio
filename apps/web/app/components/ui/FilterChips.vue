<script setup lang="ts" generic="T extends string">
/**
 * Filter pills with a sliding active background (design system: FilterChips; motion M-10).
 * The indicator follows the active chip's position and height (the group can wrap on mobile).
 */
const model = defineModel<T>({ required: true })
const props = defineProps<{ label: string; options: { value: T; label: string; count?: number }[] }>()

const group = ref<HTMLElement | null>(null)
const indicator = ref({ x: 0, y: 0, w: 0, h: 0, ready: false })

function place() {
  const el = group.value?.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!el) return
  indicator.value = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, ready: true }
}

watch(model, () => nextTick(place))
watch(() => props.options, () => nextTick(place), { deep: true })
onMounted(() => {
  place()
  document.fonts?.ready.then(place)
  window.addEventListener('resize', place)
})
onBeforeUnmount(() => window.removeEventListener('resize', place))
</script>

<template>
  <div ref="group" class="chips" role="group" :aria-label="label">
    <span
      v-if="indicator.ready"
      class="ind"
      aria-hidden="true"
      :style="{ width: `${indicator.w}px`, height: `${indicator.h}px`, transform: `translate(${indicator.x}px, ${indicator.y}px)` }"
    />
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="chip"
      :class="{ 'no-js-active': !indicator.ready && model === o.value }"
      :aria-pressed="model === o.value"
      @click="model = o.value"
    >
      {{ o.label }}<sup v-if="o.count !== undefined">{{ o.count }}</sup>
    </button>
  </div>
</template>

<style scoped>
.chips {
  position: relative;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 100%;
  padding: var(--space-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-sunken);
}

.ind {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: var(--radius-full);
  background: var(--ink);
  transition: transform var(--duration-base) var(--ease-out), width var(--duration-base) var(--ease-out), height var(--duration-base) var(--ease-out);
}

.chip {
  position: relative;
  z-index: 1;
  padding: 7px 14px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--ink);
  font: 400 12px/1.2 var(--font-data);
  cursor: pointer;
  transition: color var(--duration-fast);
}

.chip[aria-pressed='true'] {
  color: var(--on-ink);
}

.chip.no-js-active {
  background: var(--ink);
}

sup {
  margin-left: 2px;
  font-size: 10px;
  opacity: 0.75;
}
</style>
