<script setup lang="ts">
/** /SERVICES: one open row at a time, the first open on load (design system: ServiceAccordion; M-14). */
withDefaults(defineProps<{ showLink?: boolean }>(), { showLink: true })
const { t } = useI18n()
const services = useServices()
const open = ref(0)
const blocks = useTextBlocks()
const homeTitle = computed(() => blocks.value.introServices?.homeTitle ?? t('home.services.title'))
const homeLead = computed(() => blocks.value.introServices?.homeLead ?? null)

function toggle(i: number) {
  open.value = open.value === i ? -1 : i
}
</script>

<template>
  <section class="sec" aria-labelledby="home-services">
    <div class="wrap">
      <div class="panel panel--light">
        <UiSectionTitle id="home-services" :title="homeTitle" ghost="Services">
          <template v-if="homeLead">
            <template v-for="(seg, i) in homeLead" :key="i"><span v-if="seg.accent" class="acc">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template>
          </template>
          <i18n-t v-else keypath="home.services.lead" scope="global">
            <template #accent><span class="acc">{{ t('home.services.leadAccent') }}</span></template>
          </i18n-t>
        </UiSectionTitle>

        <ul class="acc-list">
          <li v-for="(s, i) in services" :key="s.title" :class="{ open: open === i }">
            <h3>
              <button
                :id="`svc-h-${i}`"
                class="head"
                type="button"
                :aria-expanded="open === i"
                :aria-controls="`svc-p-${i}`"
                data-cursor="open"
                @click="toggle(i)"
              >
                <span class="t">{{ s.title }}</span>
                <span class="ic" aria-hidden="true">+</span>
              </button>
            </h3>
            <div :id="`svc-p-${i}`" class="content" role="region" :aria-labelledby="`svc-h-${i}`">
              <div>
                <div class="box is-inverse">
                  <p>{{ s.description }}</p>
                  <ul class="cases">
                    <li v-for="c in s.cases" :key="c">{{ c }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.acc-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.acc-list > li {
  border-bottom: 1px solid var(--line);
}

h3 {
  margin: 0;
}

.head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 4px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.t {
  font: 600 clamp(20px, 3.4vw, 40px)/1.05 var(--font-display);
  letter-spacing: -0.035em;
  text-transform: uppercase;
}

.ic {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--ink);
  border-radius: 50%;
  transition: transform var(--duration-base) var(--ease-out), background var(--duration-fast);
}

.open .ic {
  transform: rotate(45deg);
  background: var(--marker);
  color: var(--on-marker);
  border-color: var(--on-marker);
}

.content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-slow) var(--ease-out);
}

.open .content {
  grid-template-rows: 1fr;
}

.content > div {
  overflow: hidden;
}

/* Closed panels are not reachable by keyboard or screen readers */
li:not(.open) .content > div {
  visibility: hidden;
  transition: visibility 0s var(--duration-slow);
}

.box {
  display: grid;
  gap: 8px;
  margin: 0 0 20px;
  padding: 22px;
  border-radius: var(--radius-lg);
}

.box p,
.cases {
  max-width: 60ch;
  color: var(--ink-inverse-muted);
  font-size: 15px;
}

.cases {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
}
</style>
