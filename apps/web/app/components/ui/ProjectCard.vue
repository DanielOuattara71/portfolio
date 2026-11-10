<script setup lang="ts">
import type { Project } from '~/composables/useContent'

/** Project record card (design system: ProjectCard; interactions I-04). The whole card is one link. */
const props = defineProps<{ project: Project; headingLevel?: 'h2' | 'h3' }>()
const { t } = useI18n()
const localePath = useLocalePath()

const fields = computed(() => [
  { label: t('fields.stack'), value: props.project.stack.length ? props.project.stack.join(' · ') : null },
  { label: t('fields.role'), value: props.project.role },
  { label: t('fields.period'), value: props.project.period },
])
</script>

<template>
  <NuxtLink class="card" :to="localePath({ name: 'projets-slug', params: { slug: project.slug } })" data-cursor="view">
    <div class="media">
      <img v-if="project.cover" :src="project.cover" :srcset="project.coverSrcset ?? undefined" :alt="project.coverAlt ?? project.name" class="zoom" loading="lazy" decoding="async" />
      <div v-else class="zoom ph" aria-hidden="true" />
      <div class="badges">
        <UiBadge variant="id">{{ project.id }}</UiBadge>
        <UiBadge>{{ project.kind }}</UiBadge>
        <UiBadge v-if="project.solo">{{ t('projects.solo') }}</UiBadge>
      </div>
    </div>
    <div class="body">
      <component :is="headingLevel ?? 'h3'" class="name">{{ project.name }}</component>
      <p>{{ project.summary }}</p>
      <UiRecordFields class="f" :items="fields" />
    </div>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: grid;
  align-content: start;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
  color: inherit;
  text-decoration: none;
}

.media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-md);
}

.zoom {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-out);
}

.ph {
  background: repeating-linear-gradient(135deg, var(--placeholder) 0 10px, var(--surface-sunken) 10px 20px);
}

.card:hover .zoom,
.card:focus-visible .zoom {
  transform: scale(1.04);
}

.badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.body {
  display: grid;
  gap: 10px;
  padding: 16px 10px 10px;
}

.name {
  font: 600 22px/1.15 var(--font-display);
  letter-spacing: -0.02em;
}

p {
  font-size: 15px;
  color: var(--ink-muted);
}

.f {
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
</style>
