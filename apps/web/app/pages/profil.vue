<script setup lang="ts">
/** Profile page: presentation, practical facts, vision, approach and detailed background (docs/10-maquettes.md §4). */
const { t } = useI18n()
const localePath = useLocalePath()
const site = useSite()
const profile = useProfile()
const bg = useBackground()
const facts = computed(() => profile.value.facts.filter((f) => f.value))

usePageSeo({ title: () => t('pages.profile.title'), description: () => t('pages.profile.description') })
</script>

<template>
  <div>
    <section class="wrap head">
      <UiSectionTitle tag="h1" :title="t('pages.profile.route')" />
      <div class="intro">
        <div class="txt">
          <UiRichText v-reveal :paragraphs="profile.long" />
          <div class="actions">
            <UiButton v-if="site.cvUrl" :label="t('cta.cv')" roll-label="cv.pdf" :href="site.cvUrl" icon="↓" />
            <UiButton :label="t('cta.contact')" :to="localePath('contact')" :variant="site.cvUrl ? 'secondary' : 'primary'" />
          </div>
        </div>
        <UiPortrait v-reveal class="photo" :alt="t('profilePage.portraitAlt')" />
      </div>
      <dl v-if="facts.length" v-reveal="'stagger'" class="facts">
        <div v-for="f in facts" :key="f.label" class="fact">
          <dt>{{ f.label }}</dt>
          <dd>{{ f.value }}</dd>
        </div>
      </dl>
    </section>

    <section class="sec" aria-labelledby="profile-vision">
      <div class="wrap">
        <div class="panel panel--light">
          <UiSectionTitle id="profile-vision" :title="t('profilePage.vision')" ghost="Vision" />
          <p v-reveal="'lines'" class="vision">{{ profile.vision }}</p>
        </div>
      </div>
    </section>

    <SectionsApproachSection heading-id="profile-approach" />

    <section id="parcours" class="sec" aria-labelledby="profile-background">
      <div class="wrap">
        <div class="panel is-inverse">
          <UiSectionTitle id="profile-background" :title="t('profilePage.background')" ghost="Background">
            {{ t('profilePage.backgroundLead') }}
          </UiSectionTitle>
          <template v-for="group in (['experience', 'education'] as const)" :key="group">
            <h3 v-if="bg[group].length" class="group">{{ t(`profilePage.${group}`) }}</h3>
            <ul v-reveal="'stagger'" class="timeline">
              <li v-for="item in bg[group]" :key="item.org">
                <p class="when">
                  <span v-if="item.period">{{ item.period }}<br /></span>{{ item.kind }}
                </p>
                <div class="what">
                  <h4>{{ item.org }}</h4>
                  <p class="role">{{ item.role }}</p>
                  <p v-if="item.details" class="details">{{ item.details }}</p>
                  <NuxtLink
                    v-if="item.project"
                    class="more"
                    :to="localePath({ name: 'projets-slug', params: { slug: item.project.slug } })"
                  >
                    {{ t('profilePage.caseStudy', { name: item.project.name }) }} →
                  </NuxtLink>
                </div>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.head {
  position: relative;
  z-index: 2;
  padding-block: 40px 24px;
}

.intro {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}

.txt {
  display: grid;
  gap: 24px;
  font-size: 18px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.photo {
  max-width: 420px;
  justify-self: end;
  width: 100%;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 40px 0 0;
}

.fact {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-sunken);
}

.fact dt {
  font: 400 11px/1 var(--font-data);
  color: var(--ink-muted);
}

.fact dd {
  margin: 0;
  font-weight: 600;
}

.vision {
  max-width: 34ch;
  font: 600 clamp(22px, 2.6vw, 32px)/1.25 var(--font-display);
  letter-spacing: -0.02em;
}

.group {
  margin: 24px 0 4px;
  font: 400 11px/1 var(--font-data);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-inverse-muted);
}

.timeline {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline > li {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 24px;
  padding: 22px 0;
  border-top: 1px solid var(--line-inverse);
}

.when {
  font: 400 12px/1.5 var(--font-data);
  color: var(--ink-inverse-muted);
}

.what {
  display: grid;
  gap: 8px;
}

h4 {
  margin: 0;
  font: 600 24px/1.2 var(--font-display);
  letter-spacing: -0.02em;
}

.role {
  font-size: 17px;
}

.details {
  color: var(--ink-inverse-muted);
}

.what .more {
  margin-top: 8px;
  justify-self: start;
}

@media (max-width: 759px) {
  .intro {
    grid-template-columns: 1fr;
  }

  .photo {
    justify-self: start;
    max-width: 320px;
  }

  .timeline > li {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
