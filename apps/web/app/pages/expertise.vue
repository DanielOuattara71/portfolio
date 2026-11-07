<script setup lang="ts">
import { SKILL_LEVELS } from '@portfolio/shared/constants'

/** Expertise page: fields, honest skill matrix, detailed services, project band (docs/10-maquettes.md §5). */
const { t } = useI18n()
const localePath = useLocalePath()
const domains = useDomains()
const skills = useSkills()
const services = useServices()

const columns = computed(() => SKILL_LEVELS.map((level) => ({ level, items: skills.value.filter((s) => s.level === level) })))

usePageSeo({ title: () => t('pages.expertise.title'), description: () => t('pages.expertise.description') })
</script>

<template>
  <div>
    <section class="wrap head">
      <UiSectionTitle tag="h1" :title="t('pages.expertise.route')" :count="t('expertisePage.domainsCount', { n: domains.length })" ghost="Expertise">
        {{ t('expertisePage.lead') }}
      </UiSectionTitle>
      <ul v-reveal="'stagger'" class="domains">
        <li v-for="(d, i) in domains" :key="d.key" class="dom">
          <span class="k" aria-hidden="true">domain_0{{ i + 1 }}</span>
          <h2>{{ d.name }}</h2>
          <p>{{ d.description }}</p>
          <UiLevelTag :level="d.level" />
        </li>
      </ul>
    </section>

    <section class="sec" aria-labelledby="exp-skills">
      <div class="wrap">
        <div class="panel panel--light">
          <UiSectionTitle id="exp-skills" :title="t('expertisePage.skills')" :count="t('expertisePage.skillsCount')" ghost="Skills">
            {{ t('expertisePage.skillsLead') }}
          </UiSectionTitle>
          <div v-reveal="'stagger'" class="matrix">
            <div v-for="col in columns" :key="col.level" class="mcol">
              <h3><UiLevelTag :level="col.level" long /><span class="n">{{ col.items.length }}</span></h3>
              <ul class="skills">
                <li v-for="s in col.items" :key="s.name">
                  <NuxtLink
                    v-if="s.projectCount && s.stackKey"
                    class="skill"
                    :to="localePath({ name: 'projets', query: { q: s.stackKey } })"
                  >
                    {{ s.name }} <span class="p">· {{ t('expertisePage.projectsUsing', { n: s.projectCount }, s.projectCount) }}</span>
                  </NuxtLink>
                  <span v-else class="skill">{{ s.name }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="sec" aria-labelledby="exp-services">
      <div class="wrap">
        <UiSectionTitle id="exp-services" :title="t('expertisePage.services')" :count="`[${services.length}]`">
          {{ t('expertisePage.servicesLead') }}
        </UiSectionTitle>
        <div v-reveal="'stagger'" class="svc">
          <article v-for="s in services" :key="s.title" class="card is-inverse">
            <h3>{{ s.title }}</h3>
            <p>{{ s.description }}</p>
            <ul>
              <li v-for="c in s.cases" :key="c">{{ c }}</li>
            </ul>
            <dl class="fields">
              <dt>{{ t('fields.deliverables') }}</dt>
              <dd>{{ s.deliverables }}</dd>
              <template v-if="s.projects.length">
                <dt>{{ t('fields.projects') }}</dt>
                <dd class="links">
                  <NuxtLink v-for="p in s.projects" :key="p.id" :to="localePath({ name: 'projets-slug', params: { slug: p.slug } })">{{ p.name }}</NuxtLink>
                </dd>
              </template>
            </dl>
          </article>
        </div>
      </div>
    </section>

    <SectionsProjectBand />
  </div>
</template>

<style scoped>
.head {
  position: relative;
  z-index: 2;
  padding-block: 40px 8px;
}

.domains {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dom {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 10px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  box-shadow: inset 0 0 0 1px var(--line);
}

.k {
  font: 400 11px/1 var(--font-data);
  color: var(--ink-muted);
}

.dom h2 {
  font: 700 20px/1.15 var(--font-display);
  letter-spacing: -0.02em;
}

.dom p {
  font-size: 14px;
  color: var(--ink-muted);
}

.matrix {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mcol {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
}

.mcol h3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.n {
  font: 400 12px/1 var(--font-data);
  color: var(--ink-muted);
}

.skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill {
  display: inline-flex;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  font: 400 12px/1.3 var(--font-data);
  text-decoration: none;
}

a.skill:hover {
  border-color: var(--ink);
}

.p {
  margin-left: 4px;
  color: var(--ink-muted);
  font-size: 10px;
}

.svc {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.card {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 22px;
  border-radius: var(--radius-lg);
}

.card h3 {
  margin: 0;
  font: 700 22px/1.15 var(--font-display);
  letter-spacing: -0.02em;
}

.card p,
.card ul {
  color: var(--ink-inverse-muted);
  font-size: 15px;
}

.card ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
}

.fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid var(--line-inverse);
  font: 400 12px/1.5 var(--font-data);
}

.fields dt {
  color: var(--ink-inverse-muted);
}

.fields dd {
  margin: 0;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 12px;
}

/* Touch targets of at least 24px high (WCAG 2.5.8). */
.links a {
  display: inline-block;
  padding-block: 4px;
}

@media (max-width: 899px) {
  .domains {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .matrix {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 759px) {
  .svc {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 559px) {
  .domains {
    grid-template-columns: 1fr;
  }
}
</style>
