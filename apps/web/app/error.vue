<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

useSeoMeta({ title: () => t('notFound.title') + ' ' + t('notFound.titleOutline'), robots: 'noindex' })
// error.vue replaces app.vue, so the page language is set here too.
useHead({ htmlAttrs: { lang: () => (locale.value === 'fr' ? 'fr-FR' : 'en-US') } })
</script>

<template>
  <NuxtLayout>
    <section class="wrap nf">
      <p class="mono muted">{{ t('notFound.query', { path: route.path }) }}</p>
      <h1>
        {{ t('notFound.title') }}<br />
        <span class="outline-text">{{ t('notFound.titleOutline') }}</span>
      </h1>
      <p class="text">{{ props.error.statusCode === 404 ? t('notFound.text') : props.error.message }}</p>
      <div class="actions">
        <UiButton :label="t('cta.backHome')" :to="localePath('index')" />
        <UiButton :label="t('cta.projects')" :to="localePath('projets')" variant="secondary" />
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.nf {
  display: grid;
  gap: 22px;
  min-height: 60vh;
  align-content: center;
  padding-block: 60px;
}

h1 {
  font: 800 clamp(52px, 11vw, 170px)/0.88 var(--font-display);
  letter-spacing: -0.045em;
  text-transform: uppercase;
}

.text {
  font-size: 20px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
