<script setup lang="ts">
/** Page transition curtain (motion M-07). Driven by composables/usePageTransition.ts. */
</script>

<template>
  <div id="curtain" class="curtain" aria-hidden="true">
    <span id="curtain-route" class="route" />
  </div>
</template>

<style scoped>
.curtain {
  position: fixed;
  inset: 0;
  z-index: var(--z-intro);
  display: grid;
  place-items: center;
  background: var(--surface-inverse);
  color: var(--ink-inverse);
  clip-path: inset(100% 0% 0% 0%);
  pointer-events: none;
  visibility: hidden;
}

.route {
  font: 400 14px/1 var(--font-data);
}
</style>
