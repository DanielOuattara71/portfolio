<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span class="status"><span class="dot" aria-hidden="true" />{{ label }}</span>
</template>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  font-size: 13px;
}

.dot {
  position: relative;
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

/* Halo drawn by a pseudo-element animated with transform + opacity only (GPU, no per-frame repaint). */
.dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--success);
  animation: ping 2.4s var(--ease-out) infinite;
}

@keyframes ping {
  0% { transform: scale(1); opacity: 0.45; }
  70%,
  100% { transform: scale(3); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .dot::after {
    animation: none;
    opacity: 0;
  }
}
</style>
