<script setup lang="ts">
/** /BACKGROUND (home): experience and education rows on a dark panel (design system: TimelineRow). */
const { t } = useI18n()
const bg = useBackground()
const rows = computed(() => [...bg.value.experience, ...bg.value.education])
const blocks = useTextBlocks()
const bgTitle = computed(() => blocks.value.introBackground?.title ?? t('home.background.title'))
const bgLead = computed(() => blocks.value.introBackground?.lead ?? null)
const bgLeadText = computed(() => (bgLead.value ?? []).map((s) => s.text).join(''))
</script>

<template>
  <section class="sec" aria-labelledby="home-background">
    <div class="wrap">
      <div class="panel is-inverse">
        <UiSectionTitle id="home-background" :title="bgTitle" ghost="Background">
          <template v-if="bgLead"><template v-for="(seg, i) in bgLead" :key="i"><span v-if="seg.accent" class="acc">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template></template>
          <template v-else>{{ t('home.background.lead') }}</template>
        </UiSectionTitle>
        <ul v-reveal="'stagger'" class="rows">
          <li v-for="r in rows" :key="r.org">
            <span class="org">{{ r.org }}<UiBadge variant="kind" class="kind">{{ r.kind }}</UiBadge></span>
            <span class="role">{{ r.role }}</span>
            <span v-if="r.period" class="date">{{ r.period }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rows li {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 6px 20px;
  padding: 20px 8px;
  border-bottom: 1px solid var(--line-inverse);
}

.org {
  font: 600 22px/1.2 var(--font-display);
  letter-spacing: -0.02em;
}

.kind {
  margin-left: 8px;
  vertical-align: 4px;
}

.role,
.date {
  color: var(--ink-inverse-muted);
}

.date {
  font: 400 12px/1.4 var(--font-data);
  text-align: right;
}

@media (max-width: 699px) {
  .rows li {
    grid-template-columns: 1fr;
  }

  .date {
    text-align: left;
  }
}
</style>
