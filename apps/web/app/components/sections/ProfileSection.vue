<script setup lang="ts">
/** /PROFILE on the home page: short presentation + the five fields with their honest level. */
const { t } = useI18n()
const profile = useProfile()
const domains = useDomains()
const blocks = useTextBlocks()
const homeTitle = computed(() => blocks.value.introProfile?.homeTitle ?? t('home.profile.title'))
</script>

<template>
  <section class="sec" aria-labelledby="home-profile">
    <div class="wrap">
      <div class="panel panel--light">
        <UiSectionTitle id="home-profile" :title="homeTitle" />
        <div class="cols">
          <div>
            <UiRichText v-reveal class="txt" :paragraphs="profile.short" />
          </div>
          <ul v-reveal="'stagger'" class="levels">
            <li v-for="d in domains" :key="d.key" class="lvl">
              <strong>{{ d.name }}</strong>
              <UiLevelTag :level="d.level" />
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}

.txt {
  font-size: 18px;
}

.levels {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lvl {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-sunken);
}

.lvl strong {
  font: 600 16px/1.2 var(--font-display);
}

@media (max-width: 759px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
</style>
