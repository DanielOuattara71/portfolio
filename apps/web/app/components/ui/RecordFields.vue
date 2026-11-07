<script setup lang="ts">
/**
 * "field → value" list in the data font (design system: RecordFields).
 * Fields without a value are hidden: the site never shows a placeholder for missing data.
 */
const props = defineProps<{ items: { label: string; value?: string | null }[] }>()
const visible = computed(() => props.items.filter((item) => item.value))
</script>

<template>
  <dl v-if="visible.length" class="fields">
    <template v-for="item in visible" :key="item.label">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
    </template>
  </dl>
</template>

<style scoped>
.fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 14px;
  margin: 0;
  font: 400 11.5px/1.5 var(--font-data);
}

dt {
  color: var(--ink-muted);
}

dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
