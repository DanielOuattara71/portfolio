<script setup lang="ts">
const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const kind = useNavKind()

// Plain links: switching language works without JavaScript and keeps the same page.
const items = computed(() =>
  locales.value.map((l) => ({
    code: l.code,
    name: l.name ?? l.code,
    to: switchLocalePath(l.code),
    active: l.code === locale.value,
  })),
)

/** Circular reveal from the clicked code (motion M-15), plain navigation otherwise. */
function onClick(event: MouseEvent, to: string, active: boolean) {
  if (active || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  if (prefersReducedMotion() || !('startViewTransition' in document)) return
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  document.documentElement.style.setProperty('--reveal-x', `${rect.left + rect.width / 2}px`)
  document.documentElement.style.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`)
  kind.value = 'lang'
  document.startViewTransition(() => navigateTo(to))
}
</script>

<template>
  <div class="lang" role="group" :aria-label="t('lang.label')">
    <NuxtLink
      v-for="item in items"
      :key="item.code"
      :to="item.to"
      :lang="item.code"
      :hreflang="item.code"
      :aria-current="item.active ? 'true' : undefined"
      @click="onClick($event, item.to, item.active)"
    >
      <!-- The accessible name starts with the visible code (voice control: "click FR"). -->
      {{ item.code.toUpperCase() }}<span class="sr-only"> · {{ item.active ? item.name : t('lang.switchTo', { language: item.name }) }}</span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.lang {
  display: flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  font: 400 11px/1 var(--font-data);
}

.lang a {
  padding: 7px 10px;
  border-radius: var(--radius-full);
  text-decoration: none;
}

.lang a[aria-current='true'] {
  background: var(--ink);
  color: var(--on-ink);
}
</style>
