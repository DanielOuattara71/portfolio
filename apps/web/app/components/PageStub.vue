<script setup lang="ts">
/** Temporary page shell used while each page is being built (Prompts 13 to 16). */
defineProps<{ title: string; ghost?: string; detail?: string }>()
const { t } = useI18n()
</script>

<template>
  <section class="wrap stub">
    <UiSectionTitle tag="h1" :title="title" :ghost="ghost">
      {{ t('placeholder.building') }}
    </UiSectionTitle>
    <p v-if="detail" class="mono muted detail">{{ detail }}</p>
  </section>
</template>

<style scoped>
.stub {
  position: relative;
  padding-block: 64px 96px;
}

.detail {
  font-size: 12px;
}
</style>
