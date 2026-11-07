<script setup lang="ts">
import type { TextSegment } from '~/content/home'

/** Paragraphs made of text segments; accent segments use the italic serif (accent-italic). */
defineProps<{ paragraphs: TextSegment[][] }>()
</script>

<template>
  <div class="rich">
    <p v-for="(para, i) in paragraphs" :key="i">
      <template v-for="(seg, j) in para" :key="j">
        <span v-if="seg.accent" class="acc">{{ seg.text }}</span>
        <template v-else>{{ seg.text }}</template>
      </template>
    </p>
  </div>
</template>

<style scoped>
.rich {
  display: grid;
  gap: 14px;
}
</style>
