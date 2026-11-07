<script setup lang="ts">
/** /APPROACH: timeline des étapes réelles de travail (séquence ordonnée). */
withDefaults(defineProps<{ headingId?: string }>(), { headingId: 'approach' })
const { t } = useI18n()
const steps = useApproach()
</script>

<template>
  <section class="sec" :aria-labelledby="headingId">
    <div class="wrap">
      <div class="panel panel--light">
        <UiSectionTitle :id="headingId" :title="t('home.approach.title')">
          {{ t('home.approach.lead') }}
        </UiSectionTitle>
        <ol v-reveal="'stagger'" class="timeline">
          <li v-for="(s, i) in steps" :key="s.title" class="step">
            <span class="node" aria-hidden="true">
              <span class="dot"></span>
            </span>
            <div class="body">
              <span class="no" aria-hidden="true">0{{ i + 1 }}</span>
              <strong>{{ s.title }}</strong>
              <p>{{ s.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
.timeline {
  --dot: 14px;
  --line: 2px;
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Horizontal rail (desktop) */
.timeline::before {
  content: '';
  position: absolute;
  top: calc(var(--dot) / 2 - var(--line) / 2);
  left: calc(10% - var(--dot) / 2);
  right: calc(10% - var(--dot) / 2);
  height: var(--line);
  background: color-mix(in srgb, var(--ink) 18%, transparent);
  border-radius: 999px;
  pointer-events: none;
}

.step {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 14px;
  padding: 0 10px;
  text-align: center;
}

.node {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: var(--dot);
  height: var(--dot);
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--surface);
}

.dot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--marker);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 12%, transparent);
}

.body {
  display: grid;
  gap: 6px;
  max-width: 28ch;
}

.no {
  font: 600 11px/1 var(--font-data);
  letter-spacing: 0.08em;
  color: var(--ink-muted);
}

strong {
  font: 700 clamp(17px, 1.6vw, 22px)/1.1 var(--font-display);
  letter-spacing: -0.02em;
}

p {
  margin: 0;
  font-size: 14px;
  color: var(--ink-muted);
}

/* Vertical timeline (mobile/tablet) */
@media (max-width: 899px) {
  .timeline {
    grid-template-columns: 1fr;
    gap: 0;
    padding-left: 8px;
  }

  .timeline::before {
    top: 8px;
    bottom: 8px;
    left: calc(8px + var(--dot) / 2 - var(--line) / 2);
    right: auto;
    width: var(--line);
    height: auto;
  }

  .step {
    grid-template-columns: var(--dot) 1fr;
    justify-items: start;
    gap: 16px;
    padding: 0 0 24px;
    text-align: left;
  }

  .step:last-child {
    padding-bottom: 0;
  }

  .node {
    margin-top: 2px;
  }

  .body {
    max-width: none;
  }
}
</style>
