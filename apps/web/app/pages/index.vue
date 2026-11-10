<script setup lang="ts">
const { t } = useI18n()
const blocks = useTextBlocks(); usePageSeo({ title: () => null, description: () => blocks.value.seoHome?.description ?? t('pages.home.description') })
</script>

<template>
  <div>
    <SectionsHero />
    <SectionsTechRibbon />
    <SectionsProjectsSection />
    <SectionsProfileSection />
    <SectionsServicesAccordion />
    <SectionsProjectBand />
    <SectionsBackgroundSection />
    <SectionsApproachSection heading-id="home-approach" />
  </div>
</template>
