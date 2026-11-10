<script setup lang="ts">
/** Page transition curtain (motion M-07). Driven by composables/usePageTransition.ts. */
</script>

<template>
  <div id="curtain" class="curtain" aria-hidden="true">
    <div class="route-wrap">
      <span id="curtain-route" class="route" />
      <span class="ondyx" aria-hidden="true">ONDYX</span>
    </div>
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

.route-wrap {
  display: grid;
  justify-items: center;
  gap: 18px;
}

.route {
  font: 400 14px/1 var(--font-data);
}

.ondyx {
  font: 800 clamp(46px, 11vw, 148px)/1 var(--font-display);
  letter-spacing: 0.35em;
  padding-left: 0.35em;
  color: var(--marker);
}
</style>
