<script setup lang="ts">
import { CONTACT_PROFILES, PROJECT_TYPES, contactSchema } from '@portfolio/shared/contact'

/**
 * Contact page (docs/10-maquettes.md §8, interactions I-14). Adapts to the visitor profile,
 * reads ?profile= and ?types= from the yellow band, validates on blur and on submit,
 * keeps a draft in the browser and sends to the API (POST /public/contact).
 */
type Profile = (typeof CONTACT_PROFILES)[number]
type ProjectType = (typeof PROJECT_TYPES)[number]
type FieldKey = 'name' | 'email' | 'message' | 'consent'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const site = useSite()
const lc = useLocaleCode()
const config = useRuntimeConfig()
const blocks = useTextBlocks()
const contactLead = computed(() => blocks.value.introContact?.lead ?? null)

const queryProfile = String(route.query.profile ?? '')
const profile = ref<Profile>((CONTACT_PROFILES as readonly string[]).includes(queryProfile) ? (queryProfile as Profile) : 'client')
const queryTypes = String(route.query.types ?? '').split(',').filter((v): v is ProjectType => (PROJECT_TYPES as readonly string[]).includes(v))

const form = reactive({
  name: '',
  email: '',
  company: '',
  role: '',
  projectTypes: queryTypes as ProjectType[],
  timeline: '',
  message: '',
  consent: false,
  website: '',
})
const errors = reactive<Partial<Record<FieldKey, string>>>({})
const status = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const serverError = ref('')
const success = ref<HTMLElement | null>(null)
const summary = ref<HTMLElement | null>(null)
const summaryItems = ref<{ id: string; message: string }[]>([])

const profileOptions = computed(() => CONTACT_PROFILES.map((p) => ({ value: p, label: t(`contactPage.profiles.${p}`) })))

function toggleType(type: ProjectType) {
  form.projectTypes = form.projectTypes.includes(type) ? form.projectTypes.filter((x) => x !== type) : [...form.projectTypes, type]
}

// Per-field checks, same limits as the shared schema.
function check(field: FieldKey): boolean {
  let msg = ''
  if (field === 'name' && form.name.trim().length < 2) msg = t('contactPage.errors.name')
  if (field === 'email' && !contactSchema.shape.email.safeParse(form.email).success) msg = t('contactPage.errors.email')
  if (field === 'message' && form.message.trim().length < 20) msg = t('contactPage.errors.message')
  if (field === 'consent' && !form.consent) msg = t('contactPage.errors.consent')
  if (msg) errors[field] = msg
  else delete errors[field]
  return !msg
}

const FIELD_IDS: Record<FieldKey, string> = { name: 'c-name', email: 'c-email', message: 'c-message', consent: 'c-consent' }

async function submit() {
  serverError.value = ''
  summaryItems.value = []
  const order: FieldKey[] = ['name', 'email', 'message', 'consent']
  const invalid = order.filter((f) => !check(f))
  if (invalid.length) {
    summaryItems.value = invalid.map((f) => ({ id: FIELD_IDS[f], message: errors[f]! }))
    await nextTick()
    summary.value?.focus()
    return
  }
  status.value = 'sending'
  const payload = {
    profile: profile.value,
    name: form.name,
    email: form.email,
    company: profile.value !== 'other' && form.company ? form.company : undefined,
    role: profile.value === 'recruiter' && form.role ? form.role : undefined,
    projectTypes: profile.value === 'client' ? form.projectTypes : [],
    timeline: profile.value === 'client' && form.timeline ? form.timeline : undefined,
    message: form.message,
    consent: form.consent as true,
    locale: lc.value,
    website: form.website || undefined,
  }
  try {
    await $fetch('/public/contact', { baseURL: config.public.apiBase, method: 'POST', body: payload })
    status.value = 'sent'
    try {
      localStorage.removeItem('contact-draft')
    } catch {
      /* storage blocked */
    }
    await nextTick()
    success.value?.focus()
  } catch (e: unknown) {
    status.value = 'error'
    const statusCode = (e as { statusCode?: number }).statusCode
    const data = (e as { data?: { error?: string } }).data
    serverError.value = data?.error === 'closed' ? t('contactPage.closed.text') : statusCode === 429 ? t('contactPage.errors.rate') : t('contactPage.errors.server')
  }
}

// Draft kept in this browser only (name, email and message), cleared after sending.
onMounted(() => {
  try {
    const draft = JSON.parse(localStorage.getItem('contact-draft') ?? 'null')
    if (draft) Object.assign(form, { name: draft.name ?? '', email: draft.email ?? '', message: draft.message ?? '' })
  } catch {
    /* no draft */
  }
})
watch(
  () => [form.name, form.email, form.message],
  ([name, email, message]) => {
    if (status.value === 'sent') return
    try {
      localStorage.setItem('contact-draft', JSON.stringify({ name, email, message }))
    } catch {
      /* storage blocked */
    }
  },
)

usePageSeo({ title: () => blocks.value.seoContact?.title ?? t('pages.contact.title'), description: () => blocks.value.seoContact?.description ?? t('pages.contact.description') })
</script>

<template>
  <section class="wrap page">
    <UiSectionTitle tag="h1" :title="t('pages.contact.route')" ghost="Contact">
      <template v-if="contactLead"><template v-for="(seg, i) in contactLead" :key="i"><span v-if="seg.accent" class="acc">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template></template>
      <template v-else>{{ t('contactPage.lead') }}</template>
    </UiSectionTitle>

    <div class="layout">
      <div>
        <div v-if="!site.contactOpen" ref="success" class="ok" tabindex="-1" role="status">
          <h2>{{ t('contactPage.closed.title') }}</h2>
          <p>{{ t('contactPage.closed.text') }}</p>
        </div>
        <div v-else-if="status === 'sent'" ref="success" class="ok" tabindex="-1" role="status">
          <h2>{{ t('contactPage.success.title') }}</h2>
          <p>{{ t('contactPage.success.text') }}</p>
        </div>

        <form v-else novalidate @submit.prevent="submit">
          <div
            v-if="summaryItems.length"
            id="error-summary"
            ref="summary"
            class="summary"
            role="alert"
            tabindex="-1"
            aria-labelledby="error-summary-title"
          >
            <h2 id="error-summary-title">{{ t('contactPage.errors.summaryTitle') }}</h2>
            <p>{{ t('contactPage.errors.summaryHint') }}</p>
            <ul>
              <li v-for="item in summaryItems" :key="item.id">
                <a :href="`#${item.id}`">{{ item.message }}</a>
              </li>
            </ul>
          </div>
          <fieldset class="who">
            <legend>{{ t('contactPage.youAre') }}</legend>
            <UiFilterChips v-model="profile" :label="t('contactPage.youAre')" :options="profileOptions" class="seg" />
            <p class="help">{{ t(`contactPage.profileHelp.${profile}`) }}</p>
          </fieldset>

          <div class="row">
            <div class="fld">
              <label for="c-name">{{ t('contactPage.fields.name') }}</label>
              <input id="c-name" v-model="form.name" autocomplete="name" required :aria-invalid="!!errors.name" :aria-describedby="errors.name ? 'c-name-err' : undefined" @blur="check('name')" />
              <span v-if="errors.name" id="c-name-err" class="err">{{ errors.name }}</span>
            </div>
            <div class="fld">
              <label for="c-email">{{ t('contactPage.fields.email') }}</label>
              <input id="c-email" v-model="form.email" type="email" autocomplete="email" required :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'c-email-err' : undefined" @blur="check('email')" />
              <span v-if="errors.email" id="c-email-err" class="err">{{ errors.email }}</span>
            </div>
          </div>

          <div v-if="profile === 'recruiter'" class="row">
            <div class="fld">
              <label for="c-company">{{ t('contactPage.fields.company') }}</label>
              <input id="c-company" v-model="form.company" autocomplete="organization" />
            </div>
            <div class="fld">
              <label for="c-role">{{ t('contactPage.fields.role') }}</label>
              <input id="c-role" v-model="form.role" />
            </div>
          </div>

          <template v-if="profile === 'client'">
            <div class="fld">
              <span id="c-types" class="lab">{{ t('contactPage.fields.types') }}</span>
              <div class="types" role="group" aria-labelledby="c-types">
                <button
                  v-for="type in PROJECT_TYPES"
                  :key="type"
                  type="button"
                  :aria-pressed="form.projectTypes.includes(type)"
                  @click="toggleType(type)"
                >
                  {{ t(`home.band.types.${type}`) }}
                </button>
              </div>
            </div>
            <div class="row">
              <div class="fld">
                <label for="c-company">{{ t('contactPage.fields.companyOptional') }}</label>
                <input id="c-company" v-model="form.company" autocomplete="organization" />
              </div>
              <div class="fld">
                <label for="c-timeline">{{ t('contactPage.fields.timeline') }}</label>
                <input id="c-timeline" v-model="form.timeline" />
              </div>
            </div>
          </template>

          <div class="fld">
            <label for="c-message">{{ t('contactPage.fields.message') }}</label>
            <textarea id="c-message" v-model="form.message" rows="6" required :aria-invalid="!!errors.message" :aria-describedby="errors.message ? 'c-message-err' : undefined" @blur="check('message')" />
            <span v-if="errors.message" id="c-message-err" class="err">{{ errors.message }}</span>
          </div>

          <!-- Honeypot: hidden from people and assistive tech, visible to naive bots -->
          <div class="hp" aria-hidden="true">
            <label for="c-website">{{ t('contactPage.fields.website') }}</label>
            <input id="c-website" v-model="form.website" tabindex="-1" autocomplete="off" />
          </div>

          <div class="fld">
            <label class="consent">
              <input id="c-consent" v-model="form.consent" type="checkbox" :aria-invalid="!!errors.consent" :aria-describedby="errors.consent ? 'c-consent-err' : undefined" @change="check('consent')" />
              <span>
                {{ t('contactPage.fields.consent') }}
                <NuxtLink :to="localePath('confidentialite')">{{ t('contactPage.fields.privacy') }}</NuxtLink>
              </span>
            </label>
            <span v-if="errors.consent" id="c-consent-err" class="err">{{ errors.consent }}</span>
          </div>

          <p v-if="serverError" class="err server" role="alert">{{ serverError }}</p>

          <div>
            <UiButton type="submit" :label="status === 'sending' ? t('contactPage.sending') : t('contactPage.send')" icon="→" :aria-disabled="status === 'sending'" />
          </div>
        </form>
      </div>

      <aside class="side">
        <div v-if="site.email" class="box is-inverse">
          <span class="lab">{{ t('contactPage.aside.email') }}</span>
          <span class="em">{{ site.email }}</span>
        </div>
        <div v-if="site.links.length || site.cvUrl" class="box is-inverse">
          <span class="lab">{{ t('contactPage.aside.links') }}</span>
          <div class="links">
            <a v-for="l in site.links" :key="l.href" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
            <a v-if="site.cvUrl" :href="site.cvUrl">{{ t('cta.cv') }}</a>
          </div>
        </div>
        <div class="box is-inverse">
          <span class="lab">{{ t('contactPage.aside.availability') }}</span>
          <span>{{ site.availability }}</span>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 2;
  padding-block: 40px 64px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

form {
  display: grid;
  gap: 18px;
}

.who {
  margin: 0;
  padding: 0;
  border: 0;
}

.who legend {
  margin-bottom: 10px;
  font: 400 12px/1.3 var(--font-data);
  color: var(--ink-muted);
}

.help {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ink-muted);
}

.row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.fld {
  display: grid;
  gap: 6px;
}

.fld label,
.lab {
  font: 400 12px/1.3 var(--font-data);
  color: var(--ink-muted);
}

input:not([type='checkbox']),
textarea {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--ink);
  font-size: 16px;
}

textarea {
  resize: vertical;
  min-height: 140px;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 35%, transparent);
}

[aria-invalid='true'] {
  border-color: #b42318 !important;
}

.err {
  font: 400 12px/1.4 var(--font-data);
  color: #b42318;
}

:root[data-theme='dark'] .err {
  color: #ff8a80;
}

.server {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}

.summary {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid #b42318;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  color: var(--ink);
}

.summary:focus {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.summary h2 {
  margin: 0;
  font: 600 16px/1.3 var(--font-display);
}

.summary p {
  margin: 0;
  font-size: 14px;
  color: var(--ink-muted);
}

.summary ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}

.summary a {
  color: #b42318;
  font-size: 14px;
}

:root[data-theme='dark'] .summary {
  border-color: #ff8a80;
}

:root[data-theme='dark'] .summary a {
  color: #ff8a80;
}

.types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.types button {
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  font: 400 12px/1 var(--font-data);
  cursor: pointer;
}

.types button[aria-pressed='true'] {
  border-color: var(--on-marker);
  background: var(--marker);
  color: var(--on-marker);
}

.consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: var(--ink-muted);
}

.consent input {
  flex: none;
  width: 20px;
  height: 20px;
  margin-top: 3px;
  accent-color: var(--ink);
}

.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.ok {
  display: grid;
  gap: 10px;
  padding: 28px;
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
}

.ok h2 {
  font: 700 24px/1.2 var(--font-display);
}

.side {
  display: grid;
  gap: 12px;
}

.box {
  display: grid;
  gap: 10px;
  padding: 20px;
  border-radius: var(--radius-lg);
}

.box .lab {
  color: var(--ink-inverse-muted);
}

.em {
  font: 500 15px/1.3 var(--font-data);
  word-break: break-all;
  user-select: all;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

@media (max-width: 859px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 559px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
