<script setup lang="ts">
import type { SkillLevel } from '@portfolio/shared/constants'

/** Skill level label: practised (solid), studied (outlined), exploring (dashed). Text always present. */
withDefaults(defineProps<{ level: SkillLevel; long?: boolean }>(), { long: false })
const { t } = useI18n()
</script>

<template>
  <span class="tag" :class="`tag--${level}`">{{ long ? t(`levelsLong.${level}`) : t(`levels.${level}`) }}</span>
</template>

<style scoped>
.tag {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: var(--radius-full);
  font: 400 11px/1.3 var(--font-data);
  white-space: nowrap;
}

.tag--practised {
  background: var(--ink);
  color: var(--on-ink);
}

.tag--studied {
  border: 1px solid var(--ink);
  background: var(--surface-raised);
}

.tag--exploring {
  border: 1px dashed var(--ink-muted);
  color: var(--ink-muted);
}
</style>
