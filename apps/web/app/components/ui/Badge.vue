<script setup lang="ts">
/** Data badge (design system: Badge). `id` = record identifier on marker, `kind` = on dark surfaces. */
withDefaults(defineProps<{ variant?: 'default' | 'id' | 'kind' }>(), { variant: 'default' })
</script>

<template>
  <span class="badge" :class="`badge--${variant}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  color: var(--ink);
  font: 400 11px/1.4 var(--font-data);
}

.badge--id,
.badge--kind {
  background: var(--marker);
  color: var(--on-marker);
}

.badge--kind {
  padding: 2px 8px;
}
</style>
