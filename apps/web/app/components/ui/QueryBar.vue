<script setup lang="ts">
/**
 * Query-style search field (design system: QueryBar; interactions I-06).
 * "/" focuses it from anywhere on the page (outside form fields); Escape clears, then blurs.
 */
const model = defineModel<string>({ default: '' })
defineProps<{ id: string; placeholder: string }>()
const { t } = useI18n()
const input = ref<HTMLInputElement | null>(null)

function onGlobalKey(e: KeyboardEvent) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const tag = (document.activeElement?.tagName ?? '').toLowerCase()
  if (['input', 'textarea', 'select'].includes(tag) || (document.activeElement as HTMLElement | null)?.isContentEditable) return
  e.preventDefault()
  input.value?.focus()
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (model.value) model.value = ''
  else input.value?.blur()
}

onMounted(() => document.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKey))
</script>

<template>
  <div class="query">
    <label :for="id">query &gt;</label>
    <input :id="id" ref="input" v-model="model" type="search" :placeholder="placeholder" autocomplete="off" spellcheck="false" @keydown="onKey" />
    <kbd :title="t('filters.shortcut')" aria-hidden="true">/</kbd>
  </div>
</template>

<style scoped>
.query {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--ink);
  border-radius: 14px;
  background: var(--surface-sunken);
  font: 400 13px/1.4 var(--font-data);
}

label {
  color: var(--ink-muted);
  white-space: nowrap;
}

input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  outline: none;
}

input::-webkit-search-cancel-button {
  display: none;
}

.query:focus-within {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 35%, transparent);
}

kbd {
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-raised);
  color: var(--ink-muted);
  font: inherit;
  font-size: 11px;
}
</style>
