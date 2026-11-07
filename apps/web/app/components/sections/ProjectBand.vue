<script setup lang="ts">
/**
 * Yellow "What's your project?" band (design system: ProjectTypeTile; motion M-19).
 * Selected tiles are passed to the contact page, which opens with the client profile pre-filled.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const TYPES = ['web', 'mobile', 'api', 'ai', 'data', 'other'] as const
const picked = ref<string[]>([])

function toggle(key: string) {
  picked.value = picked.value.includes(key) ? picked.value.filter((k) => k !== key) : [...picked.value, key]
}

const summary = computed(() =>
  picked.value.length
    ? t('home.band.selected', { n: picked.value.length, list: picked.value.map((k) => t(`home.band.types.${k}`)).join(', ') }, picked.value.length)
    : t('home.band.none'),
)

const target = computed(() =>
  localePath({ name: 'contact', query: picked.value.length ? { profile: 'client', types: picked.value.join(',') } : { profile: 'client' } }),
)
</script>

<template>
  <section class="sec" aria-labelledby="band-title">
    <div class="wrap">
      <div class="band is-on-marker">
        <div>
          <h2 id="band-title" v-reveal="'lines'">
            <i18n-t keypath="home.band.title" scope="global">
              <template #accent><span class="acc">{{ t('home.band.accent') }}</span></template>
            </i18n-t>
          </h2>
          <p class="text">{{ t('home.band.text') }}</p>
        </div>
        <div v-reveal="'stagger'" class="tiles" role="group" :aria-label="t('home.band.label')">
          <button
            v-for="(key, i) in TYPES"
            :key="key"
            type="button"
            class="tile"
            :aria-pressed="picked.includes(key)"
            @click="toggle(key)"
          >
            <span class="k" aria-hidden="true">type_0{{ i + 1 }}</span>
            <span class="l">{{ t(`home.band.types.${key}`) }}</span>
          </button>
        </div>
        <div class="go">
          <span aria-live="polite">{{ summary }}</span>
          <UiButton class="cta" :label="t('cta.continue')" :to="target" icon="→" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 28px;
  padding: clamp(24px, 4vw, 52px);
  border-radius: var(--radius-2xl);
  background: var(--marker);
  color: var(--on-marker);
}

h2 {
  font: 800 clamp(38px, 6vw, 88px)/0.95 var(--font-display);
  letter-spacing: -0.04em;
}

h2 :deep(.acc) {
  font-weight: 400;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 6px;
}

.text {
  max-width: 36ch;
  margin-top: 14px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tile {
  min-height: 104px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px;
  border: 1px solid rgba(20, 19, 17, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.35);
  color: var(--on-marker);
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast), transform var(--duration-base) var(--ease-out);
}

.tile:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

.tile[aria-pressed='true'] {
  background: var(--on-marker);
  color: var(--marker);
}

.k {
  font: 400 10px/1 var(--font-data);
  opacity: 0.75;
}

.l {
  font: 700 16px/1.2 var(--font-body);
}

.go {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font: 400 12px/1.4 var(--font-data);
}

/* Ink button on the yellow band, identical in both themes */
.cta {
  --ink: var(--on-marker);
  --on-ink: var(--marker);
}

@media (max-width: 859px) {
  .band {
    grid-template-columns: 1fr;
  }

  .go {
    grid-column: 1;
  }

  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
