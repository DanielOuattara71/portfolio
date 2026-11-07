<script setup lang="ts">
const { t } = useI18n()
usePageSeo({ title: () => t('pages.privacy.title'), description: () => t('pages.privacy.description'), robots: 'noindex' })
</script>

<template>
  <PageStub :title="t('pages.privacy.title')" />
</template>
