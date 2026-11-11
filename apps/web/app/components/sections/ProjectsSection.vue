<script setup lang="ts">
/** /PROJECTS on the home page: query, domain filters and record cards (docs/10-maquettes.md §1). */
const { t } = useI18n()
const projects = useProjects()
const featured = computed(() => projects.value.filter((p) => p.featured))
const grid = ref<HTMLElement | null>(null)
const { domain, query, visible, count, options } = useProjectFilter(featured, grid)
const blocks = useTextBlocks()
const homeTitle = computed(() => blocks.value.introProjects?.homeTitle ?? t('home.projects.title'))
const homeLead = computed(() => blocks.value.introProjects?.homeLead ?? null)
</script>

<template>
  <section class="sec" aria-labelledby="home-projects">
    <div class="wrap">
      <div class="panel panel--light">
        <UiSectionTitle id="home-projects" :title="homeTitle" ghost="Records">
          <template v-if="homeLead">
            <template v-for="(seg, i) in homeLead" :key="i"><span v-if="seg.accent" class="acc">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template>
          </template>
          <i18n-t v-else keypath="home.projects.lead" scope="global">
            <template #accent><span class="acc">{{ t('home.projects.leadAccent') }}</span></template>
          </i18n-t>
        </UiSectionTitle>

        <UiQueryBar id="home-query" v-model="query" class="q" :placeholder="t('filters.placeholder')" />
        <UiFilterChips v-model="domain" class="chips" :label="t('filters.label')" :options="options" />

        <div ref="grid" v-reveal="'stagger'" class="grid">
          <UiProjectCard v-for="p in featured" v-show="visible.has(p.id)" :key="p.id" :project="p" />
        </div>
        <p v-if="count === 0" class="empty">{{ t('projects.empty') }}</p>
        <p class="count" aria-live="polite">{{ t('projects.result', { n: count, total: featured.length }) }}</p>

      </div>
    </div>
  </section>
</template>

<style scoped>
.sec {
  margin-top: var(--space-32);
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
  gap: 32px;
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
