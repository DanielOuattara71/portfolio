<script setup lang="ts">
/** Projects page: all records with domain filter and text query (docs/07-contenus.md §3, 10-maquettes.md §2). */
const { t } = useI18n()
const projects = useProjects()
const grid = ref<HTMLElement | null>(null)
const { domain, query, visible, count, options } = useProjectFilter(projects, grid)

usePageSeo({ title: () => t('pages.projects.title'), description: () => t('pages.projects.description') })
</script>

<template>
  <section class="wrap page" aria-labelledby="projects-title">
    <div class="head">
      <UiSectionTitle
        id="projects-title"
        tag="h1"
        :title="t('pages.projects.route')"
        :count="t('projects.count', { n: projects.length }, projects.length)"
        ghost="Records"
      >
        {{ t('projectsPage.lead') }}
      </UiSectionTitle>

      <UiQueryBar id="projects-query" v-model="query" class="q" :placeholder="t('filters.placeholder')" />
      <UiFilterChips v-model="domain" class="chips" :label="t('filters.label')" :options="options" />
    </div>

    <div ref="grid" v-reveal="'stagger'" class="grid">
      <UiProjectCard
        v-for="p in projects"
        v-show="visible.has(p.id)"
        :key="p.id"
        :project="p"
        heading-level="h2"
      />
    </div>
    <p v-if="count === 0" class="empty">{{ t('projects.empty') }}</p>
    <p class="count" aria-live="polite">{{ t('projects.result', { n: count, total: projects.length }) }}</p>
  </section>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 2;
  padding-block: 40px 64px;
}

.head {
  margin-bottom: 8px;
}

.q {
  margin-bottom: 14px;
}

.chips {
  margin-bottom: 22px;
}

.grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.empty {
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
  text-align: center;
  font: 400 12px/1.5 var(--font-data);
  color: var(--ink-muted);
}

.count {
  margin-top: 14px;
  font: 400 11px/1 var(--font-data);
  color: var(--ink-muted);
}

@media (max-width: 759px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
