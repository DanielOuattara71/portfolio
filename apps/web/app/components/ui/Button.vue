<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * Pill button (design system: Button). A link when `to` or `href` is set, a <button> otherwise.
 * `rollLabel` is the copy that rolls in on hover (defaults to the label).
 */
const props = withDefaults(
  defineProps<{
    label: string
    rollLabel?: string
    variant?: 'primary' | 'secondary'
    to?: RouteLocationRaw
    href?: string
    icon?: string
    type?: 'button' | 'submit'
    ariaDisabled?: boolean
    /** External `href`: opens in a new tab, announced to screen readers. */
    external?: boolean
  }>(),
  { variant: 'primary', type: 'button' },
)

const route = useRoute()
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : props.href ? 'a' : 'button'))

function onClick(e: MouseEvent) {
  if (!props.to || !import.meta.client) return
  const hash = typeof props.to === 'object' && props.to && 'hash' in props.to ? (props.to as { hash?: string }).hash : undefined
  if (!hash || !String(route.name ?? '').startsWith('index')) return
  const id = hash.replace(/^#/, '')
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(history.state, '', hash)
}
</script>

<template>
  <component
    :is="tag"
    class="btn"
    :class="`btn--${variant}`"
    :to="to"
    :href="href"
    :type="!to && !href ? type : undefined"
    :target="href && external ? '_blank' : undefined"
    :rel="href && external ? 'noopener noreferrer' : undefined"
    @click="onClick"
  >
    <span class="roll">
      <span>{{ label }}<span v-if="href && external" class="sr-only"> ({{ $t('a11y.newTab') }})</span></span>
      <span aria-hidden="true">{{ rollLabel ?? label }}</span>
    </span>
    <span v-if="icon" class="ico" aria-hidden="true">{{ icon }}</span>
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px var(--space-5);
  border: 1px solid var(--ink);
  border-radius: var(--radius-full);
  font: 600 15px/1.3 var(--font-body);
  text-decoration: none;
  cursor: pointer;
  transition: transform var(--duration-micro) var(--ease-out);
}

.btn:active {
  transform: scale(0.97);
}

.btn--primary {
  background: var(--ink);
  color: var(--on-ink);
  box-shadow: var(--shadow-button);
}

.btn--secondary {
  background: var(--surface-raised);
  color: var(--ink);
  border-color: var(--line);
}

.roll {
  display: inline-grid;
  height: 1.3em;
  overflow: hidden;
}

.roll > span {
  grid-area: 1 / 1;
  transition: transform var(--duration-base) var(--ease-out);
}

.roll > span + span {
  transform: translateY(110%);
}

.btn:hover .roll > span:first-child,
.btn:focus-visible .roll > span:first-child {
  transform: translateY(-110%);
}

.btn:hover .roll > span + span,
.btn:focus-visible .roll > span + span {
  transform: translateY(0);
}

.ico {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--marker);
  color: var(--on-marker);
  font-size: 12px;
}
</style>
