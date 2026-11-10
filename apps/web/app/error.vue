<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

// 503: content API unreachable on a cold start. Anything else uses the "not found" wording.
const ns = computed(() => (props.error.statusCode === 503 ? 'unavailable' : 'notFound'))
useSeoMeta({ title: () => t(`${ns.value}.title`) + ' ' + t(`${ns.value}.titleOutline`), robots: 'noindex' })
// error.vue replaces app.vue, so the page language is set here too.
useHead({ htmlAttrs: { lang: () => (locale.value === 'fr' ? 'fr-FR' : 'en-US') } })
</script>

<template>
  <NuxtLayout>
    <section class="wrap nf">
      <p class="mono muted">{{ t(`${ns}.query`, { path: route.path }) }}</p>
      <h1>
        {{ t(`${ns}.title`) }}<br />
        <span class="outline-text">{{ t(`${ns}.titleOutline`) }}</span>
      </h1>
      <p class="text">{{ props.error.statusCode === 404 || props.error.statusCode === 503 ? t(`${ns}.text`) : props.error.message }}</p>
      <div v-if="props.error.statusCode !== 503" class="actions">
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
