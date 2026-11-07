<script setup lang="ts">
const { t } = useI18n()
usePageSeo({ title: () => t('pages.legal.title'), description: () => t('pages.legal.description'), robots: 'noindex' })
</script>

<template>
  <PageStub :title="t('pages.legal.title')" />
</template>
