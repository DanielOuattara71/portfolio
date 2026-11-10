<script setup lang="ts">
const { t } = useI18n()
const blocks = useTextBlocks()
const sections = computed(() => blocks.value.privacy ?? null)
usePageSeo({ title: () => t('pages.privacy.title'), description: () => t('pages.privacy.description'), robots: 'noindex' })
</script>

<template>
  <section v-if="sections" class="wrap page">
    <UiSectionTitle tag="h1" :title="t('pages.privacy.title')" />
    <div class="doc">
      <template v-for="(s, i) in sections" :key="i">
        <h2 v-if="s.kind === 'h2'">{{ s.text }}</h2>
        <p v-else>{{ s.text }}</p>
      </template>
    </div>
  </section>
  <PageStub v-else :title="t('pages.privacy.title')" />
</template>

<style scoped>
.page {
  position: relative;
  z-index: 2;
  padding-block: 40px 64px;
}

.doc {
  display: grid;
  gap: 12px;
  max-width: 68ch;
}

.doc h2 {
  margin-top: 20px;
  font: 700 24px/1.2 var(--font-display);
  letter-spacing: -0.02em;
}

.doc p {
  font-size: 16px;
  line-height: 1.65;
  color: var(--ink-muted);
}
</style>
