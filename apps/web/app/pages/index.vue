<script setup lang="ts">
const { t } = useI18n()
usePageSeo({ title: () => null, description: () => t('pages.home.description') })
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
