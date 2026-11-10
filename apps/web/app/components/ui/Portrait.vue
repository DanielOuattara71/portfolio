<script setup lang="ts">
/** Portrait photo (4:5). Neutral silhouette until the real photo is uploaded in the admin. */
defineProps<{ src?: string | null; srcset?: string | null; alt: string }>()
</script>

<template>
  <div class="portrait">
    <img v-if="src" :src="src" :srcset="srcset ?? undefined" :alt="alt" loading="lazy" />
    <div v-else class="ph" role="img" :aria-label="alt" />
  </div>
</template>

<style scoped>
.portrait {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 5;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lift);
}

img,
.ph {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ph {
  background:
    radial-gradient(ellipse 19% 17% at 50% 33%, #77716a 0 97%, transparent 100%),
    radial-gradient(ellipse 9% 10% at 50% 49%, #3c3934 0 97%, transparent 100%),
    radial-gradient(ellipse 50% 44% at 50% 104%, #4b4741 0 98%, transparent 100%),
    linear-gradient(#dcd6ca, #cdc6b8);
}
</style>
