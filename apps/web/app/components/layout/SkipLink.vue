<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <a class="skip" href="#main">{{ t('skip') }}</a>
</template>

<style scoped>
.skip {
  position: fixed;
  left: 12px;
  top: -64px;
  z-index: 100;
  background: var(--ink);
  color: var(--on-ink);
  padding: 10px 16px;
  border-radius: var(--radius-full);
  text-decoration: none;
  font-weight: 600;
}

.skip:focus {
  top: calc(12px + env(safe-area-inset-top, 0px));
}
</style>
