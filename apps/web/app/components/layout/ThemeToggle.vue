<script setup lang="ts">
const { t } = useI18n()
const isDark = ref(false)

function readTheme(): boolean {
  const explicit = document.documentElement.dataset.theme
  if (explicit) return explicit === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

onMounted(() => {
  isDark.value = readTheme()
})

/** Circular reveal from the button (View Transitions), plain switch otherwise. */
function toggle(event: MouseEvent) {
  const next = isDark.value ? 'light' : 'dark'
  const apply = () => {
    document.documentElement.dataset.theme = next
    isDark.value = next === 'dark'
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  document.documentElement.style.setProperty('--reveal-x', `${rect.left + rect.width / 2}px`)
  document.documentElement.style.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`)

  if (!reduce && 'startViewTransition' in document) {
    document.startViewTransition(apply)
  } else {
    apply()
  }
}
</script>

<template>
  <button
    class="theme"
    type="button"
    :aria-pressed="isDark"
    :aria-label="isDark ? t('theme.toLight') : t('theme.toDark')"
    @click="toggle"
  >
    <svg v-if="isDark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  </button>
</template>

<style scoped>
.theme {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface-raised);
  cursor: pointer;
}

.theme svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.8;
  stroke-linecap: round;
}
</style>
