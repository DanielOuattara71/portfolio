<script setup lang="ts">
import type { TextSegment } from '@portfolio/shared/content'

/**
 * Site texts (docs/admin/02 §C): block list left, FR | EN form right,
 * accent words (2 max per sentence), hero preview.
 */
useHead({ title: 'Textes du site · Administration' })

const allowed = useCan()
const canWrite = computed(() => allowed('content.write'))
const canSubmit = computed(() => allowed('content.submit'))
const canPublish = computed(() => allowed('content.publish'))

const BLOCKS: { key: string; label: string; hint?: string }[] = [
  { key: 'hero', label: 'Hero (accueil)' },
  { key: 'profile', label: 'Profil' },
  { key: 'intro-projects', label: 'Introduction — Projets' },
  { key: 'intro-profile', label: 'Introduction — Profil' },
  { key: 'intro-services', label: 'Introduction — Services' },
  { key: 'intro-background', label: 'Introduction — Parcours' },
  { key: 'intro-approach', label: 'Introduction — Méthode' },
  { key: 'intro-expertise', label: 'Introduction — Expertise' },
  { key: 'intro-contact', label: 'Introduction — Contact' },
  { key: 'band', label: 'Bandeau « Vous avez un projet ? »' },
  { key: 'footer', label: 'Pied de page' },
  { key: 'seo-home', label: 'SEO — Accueil' },
  { key: 'seo-projects', label: 'SEO — Projets' },
  { key: 'seo-profile', label: 'SEO — Profil' },
  { key: 'seo-expertise', label: 'SEO — Expertise' },
  { key: 'seo-contact', label: 'SEO — Contact' },
  { key: 'legal', label: 'Mentions légales', hint: 'Modèle à compléter' },
  { key: 'privacy', label: 'Confidentialité', hint: 'Modèle à compléter' },
]

const selectedKey = ref('intro-projects')
const items = ref<{ id: string; key: string; status: string; modified: boolean; published: unknown }[]>([])
const listLoading = ref(true)

async function loadList() {
  listLoading.value = true
  try {
    const res = await $fetch<{ items: { id: string; key: string; status: string; modified: boolean; published: unknown }[] }>('/api/admin/content', { query: { type: 'block' } })
    items.value = res.items
  } catch {
    items.value = []
  }
  listLoading.value = false
}
onMounted(loadList)

function blockState(key: string): { text: string; cls: string } {
  const i = items.value.find((x) => x.key === key)
  if (!i) return { text: '—', cls: '' }
  if (i.status === 'archived') return { text: 'Archivé', cls: '' }
  if (i.status === 'in_review') return { text: 'En révision', cls: 'info' }
  if (!i.published) return { text: 'Brouillon', cls: 'warn' }
  if (i.modified) return { text: 'Publié · modifié', cls: 'info' }
  return { text: 'Publié', cls: 'ok' }
}
function blockId(key: string) {
  return items.value.find((x) => x.key === key)?.id ?? ''
}

function textFromSegments(segs: TextSegment[] | undefined): string {
  return (segs ?? []).map((s) => s.text).join('')
}
function accentsFromSegments(segs: TextSegment[] | undefined): string[] {
  return (segs ?? []).filter((s) => s.accent).map((s) => s.text)
}
function segmentsFromText(text: string, accents: string[]): TextSegment[] {
  const accs = accents.map((a) => a.trim()).filter(Boolean).slice(0, 2)
  if (!accs.length) return text ? [{ text }] : []
  let segs: TextSegment[] = [{ text }]
  for (const acc of accs) {
    if (!acc) continue
    const next: TextSegment[] = []
    for (const s of segs) {
      if (s.accent) {
        next.push(s)
        continue
      }
      const idx = s.text.indexOf(acc)
      if (idx < 0) {
        next.push(s)
        continue
      }
      if (idx > 0) next.push({ text: s.text.slice(0, idx) })
      next.push({ text: acc, accent: true })
      const rest = s.text.slice(idx + acc.length)
      if (rest) next.push({ text: rest })
    }
    segs = next
  }
  return segs.filter((s) => s.text)
}

/* Editor for the selected block (loaded by id). */
const editorId = computed(() => blockId(selectedKey.value))
const ed = useItemEditor(() => editorId.value)
const view = ed.view
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const form = ed.form as unknown as Ref<any>

const accentInputs = ref<Record<string, string>>({})
watch(editorId, (nid, oid) => {
  if (nid && nid !== oid) ed.load()
})
function syncAccents() {
  accentInputs.value = {}
  if (!form.value) return
  for (const lc of ['fr', 'en'] as const) {
    const L = (form.value[lc] ?? {}) as Record<string, unknown>
    for (const [field, val] of Object.entries(L)) {
      if (Array.isArray(val) && val.length && typeof (val[0] as { text?: string })?.text === 'string') {
        accentInputs.value[`${field}.${lc}`] = accentsFromSegments(val as TextSegment[]).join(', ')
      }
    }
  }
}
watch(view, (v) => {
  if (v) nextTick(syncAccents)
})
function setSeg(field: string, lc: 'fr' | 'en', text: string) {
  if (!form.value) return
  const L = form.value[lc] as Record<string, unknown>
  const key = `${field}.${lc}`
  L[field] = segmentsFromText(text, (accentInputs.value[key] ?? '').split(','))
}
function setAccents(field: string, lc: 'fr' | 'en', raw: string) {
  accentInputs.value[`${field}.${lc}`] = raw
  if (!form.value) return
  const L = form.value[lc] as Record<string, unknown>
  const current = textFromSegments(L[field] as TextSegment[] | undefined)
  if (current) L[field] = segmentsFromText(current, raw.split(','))
}
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const heroPreviewWords = computed(() => {
  if (selectedKey.value !== 'hero' || !form.value) return [] as string[]
  const name = (form.value as unknown as { fr?: { eyebrow?: string } }).fr?.eyebrow ?? 'ONDYX'
  return String(name).split(' ').filter(Boolean)
})
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Textes du site</h1>
      <p class="muted">Chaque bloc se publie séparément. Les libellés des boutons restent dans le code.</p>
    </div>
    <div class="row" @keydown="ed.onSaveKey">
      <span class="small muted" role="status">{{ ed.saving.value ? 'Enregistrement…' : ed.savedLabel.value }}</span>
      <button class="btn sec" type="button" :disabled="ed.saving.value || !canWrite" @click="ed.save(true)">Enregistrer</button>
      <button class="btn sec" type="button" :disabled="!canWrite || !view?.published" @click="ed.confirmDiscard.value = true">Abandonner</button>
      <button class="btn sec" type="button" @click="ed.openHistory()">Historique</button>
      <button v-if="canSubmit && !canPublish" class="btn sec" type="button" @click="ed.doSubmit()">Soumettre en révision</button>
      <button v-if="canPublish" class="btn" type="button" :disabled="ed.publishing.value" @click="ed.doPublish()">{{ ed.publishing.value ? 'Publication…' : 'Publier' }}</button>
    </div>
  </div>

  <p v-if="ed.notice.value" class="alert" :class="ed.notice.value.ok ? 'info' : 'crit'" role="status">{{ ed.notice.value.text }}</p>

  <div class="layout">
    <nav class="panel navlist" aria-label="Blocs">
      <p v-if="listLoading" class="small muted">Chargement…</p>
      <button v-for="b in BLOCKS" :key="b.key" type="button" class="navitem" :aria-current="selectedKey === b.key ? 'page' : undefined" @click="selectedKey = b.key">
        <span>{{ b.label }}</span><span v-if="b.hint" class="small muted">{{ b.hint }}</span>
        <span class="chip" :class="blockState(b.key).cls">{{ blockState(b.key).text }}</span>
      </button>
    </nav>

    <div class="panel formpanel">
      <p v-if="ed.loading.value" class="sk" style="height: 320px" />
      <p v-else-if="ed.loadError.value" class="alert crit" role="alert">{{ ed.loadError.value }}</p>
      <template v-else-if="view && form">
        <p v-if="!canWrite" class="alert warn">Lecture seule.</p>
        <p v-if="ed.conflict.value" class="alert crit" role="alert">Conflit : <button class="btn sec" type="button" @click="ed.reloadServer()">Recharger la copie serveur</button></p>
        <div v-if="ed.confirmDiscard.value" class="alert warn confirm">
          <span>Abandonner les modifications ?</span>
          <span class="row"><button class="btn sec" type="button" @click="ed.confirmDiscard.value = false">Annuler</button><button class="btn danger" type="button" @click="ed.doDiscard()">Abandonner</button></span>
        </div>

        <fieldset :disabled="!canWrite || view.status === 'archived'" class="fs">
          <!-- HERO -->
          <template v-if="selectedKey === 'hero'">
            <div class="pair">
              <div class="field"><label :for="`f-eyebrow-fr`">Sur-titre (FR)</label><input id="f-eyebrow-fr" v-model="form.fr.eyebrow" class="inp" maxlength="80"></div>
              <div class="field"><label :for="`f-eyebrow-en`">Eyebrow (EN)</label><input id="f-eyebrow-en" v-model="form.en.eyebrow" class="inp" maxlength="80"></div>
            </div>
            <div class="pair">
              <div class="field"><label :for="`f-lead-fr`">Accroche (FR)</label><input id="f-lead-fr" v-model="form.fr.lead" class="inp" maxlength="120"></div>
              <div class="field"><label :for="`f-lead-en`">Lead (EN)</label><input id="f-lead-en" v-model="form.en.lead" class="inp" maxlength="120"></div>
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`value-${lc}`" class="field">
              <label :for="`f-value-${lc}`">Phrase de valeur ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-value-${lc}`" class="inp" rows="3" :value="textFromSegments((form[lc].value) as TextSegment[])" @input="setSeg('value', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <label :for="`f-value-acc-${lc}`" class="hint">Mots en valeur (2 max, séparés par virgules)</label>
              <input :id="`f-value-acc-${lc}`" class="inp" :value="accentInputs[`value.${lc}`] ?? ''" @input="setAccents('value', lc, ($event.target as HTMLInputElement).value)">
            </div>
            <div class="field"><label :for="`f-badge-fr`">Badge (FR)</label><input id="f-badge-fr" v-model="form.fr.badge" class="inp" maxlength="120"></div>
            <div class="field"><label :for="`f-badge-en`">Badge (EN)</label><input id="f-badge-en" v-model="form.en.badge" class="inp" maxlength="120"></div>
          </template>

          <!-- PROFILE -->
          <template v-else-if="selectedKey === 'profile'">
            <div v-for="lc in (['fr', 'en'] as const)" :key="`vision-${lc}`" class="field">
              <label :for="`f-vision-${lc}`">Vision ({{ lc.toUpperCase() }})</label>
              <input :id="`f-vision-${lc}`" v-model="form[lc].vision" class="inp" maxlength="300">
            </div>
            <p class="hint">Les présentations (courte/longue) et les faits restent dans le formulaire Profil existant (docs/07-contenus) — seule la Vision est ici pour ne pas casser l’éditeur actuel.</p>
          </template>

          <!-- INTRO-PROJECTS -->
          <template v-else-if="selectedKey === 'intro-projects'">
            <div class="pair">
              <div class="field"><label for="f-homeTitle-fr">Titre accueil (FR)</label><input id="f-homeTitle-fr" v-model="form.fr.homeTitle" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-homeTitle-en">Home title (EN)</label><input id="f-homeTitle-en" v-model="form.en.homeTitle" class="inp" maxlength="120"></div>
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`homeLead-${lc}`" class="field">
              <label :for="`f-homeLead-${lc}`">Accueil — phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-homeLead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].homeLead) as TextSegment[])" @input="setSeg('homeLead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <input :id="`f-homeLead-acc-${lc}`" class="inp" placeholder="Mots en valeur (2 max)" :value="accentInputs[`homeLead.${lc}`] ?? ''" @input="setAccents('homeLead', lc, ($event.target as HTMLInputElement).value)">
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`pageLead-${lc}`" class="field">
              <label :for="`f-pageLead-${lc}`">Page Projets — phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-pageLead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].pageLead) as TextSegment[])" @input="setSeg('pageLead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <input :id="`f-pageLead-acc-${lc}`" class="inp" placeholder="Mots en valeur (2 max)" :value="accentInputs[`pageLead.${lc}`] ?? ''" @input="setAccents('pageLead', lc, ($event.target as HTMLInputElement).value)">
            </div>
          </template>

          <!-- INTRO-PROFILE -->
          <template v-else-if="selectedKey === 'intro-profile'">
            <div class="pair">
              <div class="field"><label for="f-homeTitle-fr">Titre accueil (FR)</label><input id="f-homeTitle-fr" v-model="form.fr.homeTitle" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-homeTitle-en">Home title (EN)</label><input id="f-homeTitle-en" v-model="form.en.homeTitle" class="inp" maxlength="120"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-pageTitle-fr">Titre page (FR)</label><input id="f-pageTitle-fr" v-model="form.fr.pageTitle" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-pageTitle-en">Page title (EN)</label><input id="f-pageTitle-en" v-model="form.en.pageTitle" class="inp" maxlength="120"></div>
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`pLead-${lc}`" class="field">
              <label :for="`f-pageLead-${lc}`">Parcours — phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-pageLead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].pageLead) as TextSegment[])" @input="setSeg('pageLead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <input :id="`f-pageLead-acc-${lc}`" class="inp" placeholder="Mots en valeur (2 max)" :value="accentInputs[`pageLead.${lc}`] ?? ''" @input="setAccents('pageLead', lc, ($event.target as HTMLInputElement).value)">
            </div>
          </template>

          <!-- INTRO-SERVICES -->
          <template v-else-if="selectedKey === 'intro-services'">
            <div class="pair">
              <div class="field"><label for="f-homeTitle-fr">Titre accueil (FR)</label><input id="f-homeTitle-fr" v-model="form.fr.homeTitle" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-homeTitle-en">Home title (EN)</label><input id="f-homeTitle-en" v-model="form.en.homeTitle" class="inp" maxlength="120"></div>
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`hLead-${lc}`" class="field">
              <label :for="`f-homeLead-${lc}`">Accueil — phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-homeLead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].homeLead) as TextSegment[])" @input="setSeg('homeLead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <input :id="`f-hLead-acc-${lc}`" class="inp" placeholder="Mots en valeur (2 max)" :value="accentInputs[`homeLead.${lc}`] ?? ''" @input="setAccents('homeLead', lc, ($event.target as HTMLInputElement).value)">
            </div>
            <div class="pair">
              <div class="field"><label for="f-svcTitle-fr">Titre services (FR)</label><input id="f-svcTitle-fr" v-model="form.fr.servicesTitle" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-svcTitle-en">Services title (EN)</label><input id="f-svcTitle-en" v-model="form.en.servicesTitle" class="inp" maxlength="120"></div>
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`svcLead-${lc}`" class="field">
              <label :for="`f-servicesLead-${lc}`">Expertise — services ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-servicesLead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].servicesLead) as TextSegment[])" @input="setSeg('servicesLead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
            </div>
          </template>

          <!-- INTRO-BACKGROUND / APPROACH / CONTACT (title + lead) -->
          <template v-else-if="['intro-background', 'intro-approach', 'intro-contact'].includes(selectedKey)">
            <div class="pair">
              <div class="field"><label for="f-title-fr">Titre (FR)</label><input id="f-title-fr" v-model="form.fr.title" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-title-en">Title (EN)</label><input id="f-title-en" v-model="form.en.title" class="inp" maxlength="120"></div>
            </div>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`lead-${lc}`" class="field">
              <label :for="`f-lead-${lc}`">Phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-lead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].lead) as TextSegment[])" @input="setSeg('lead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <input :id="`f-lead-acc-${lc}`" class="inp" placeholder="Mots en valeur (2 max)" :value="accentInputs[`lead.${lc}`] ?? ''" @input="setAccents('lead', lc, ($event.target as HTMLInputElement).value)">
            </div>
          </template>

          <!-- INTRO-EXPERTISE -->
          <template v-else-if="selectedKey === 'intro-expertise'">
            <div v-for="lc in (['fr', 'en'] as const)" :key="`exp-${lc}`" class="field">
              <label :for="`f-lead-${lc}`">Page — phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-lead-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].lead) as TextSegment[])" @input="setSeg('lead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
              <label :for="`f-skills-${lc}`">Compétences — phrase ({{ lc.toUpperCase() }})</label>
              <textarea :id="`f-skills-${lc}`" class="inp" rows="2" :value="textFromSegments((form[lc].skillsLead) as TextSegment[])" @input="setSeg('skillsLead', lc, ($event.target as HTMLTextAreaElement).value)"></textarea>
            </div>
          </template>

          <!-- BAND -->
          <template v-else-if="selectedKey === 'band'">
            <div class="pair">
              <div class="field"><label for="f-btitle-fr">Titre (FR)</label><input id="f-btitle-fr" v-model="form.fr.title" class="inp" maxlength="160"></div>
              <div class="field"><label for="f-btitle-en">Title (EN)</label><input id="f-btitle-en" v-model="form.en.title" class="inp" maxlength="160"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-baccent-fr">Mot en valeur (FR)</label><input id="f-baccent-fr" v-model="form.fr.accent" class="inp" maxlength="80"></div>
              <div class="field"><label for="f-baccent-en">Highlighted word (EN)</label><input id="f-baccent-en" v-model="form.en.accent" class="inp" maxlength="80"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-btext-fr">Texte (FR)</label><textarea id="f-btext-fr" v-model="form.fr.text" class="inp" rows="2" maxlength="400"></textarea></div>
              <div class="field"><label for="f-btext-en">Text (EN)</label><textarea id="f-btext-en" v-model="form.en.text" class="inp" rows="2" maxlength="400"></textarea></div>
            </div>
            <div class="field"><span class="lab">Libellés des types</span></div>
            <div v-for="k in (['web', 'mobile', 'api', 'ai', 'data', 'other'] as const)" :key="k" class="pair">
              <div class="field"><label :for="`f-type-${k}-fr`">{{ k }} (FR)</label><input :id="`f-type-${k}-fr`" v-model="form.fr.types[k]" class="inp" maxlength="60"></div>
              <div class="field"><label :for="`f-type-${k}-en`">{{ k }} (EN)</label><input :id="`f-type-${k}-en`" v-model="form.en.types[k]" class="inp" maxlength="60"></div>
            </div>
          </template>

          <!-- FOOTER -->
          <template v-else-if="selectedKey === 'footer'">
            <div class="pair">
              <div class="field"><label for="f-ftitle-fr">Phrase (FR)</label><input id="f-ftitle-fr" v-model="form.fr.title" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-ftitle-en">Phrase (EN)</label><input id="f-ftitle-en" v-model="form.en.title" class="inp" maxlength="120"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-faccent-fr">Mot en valeur (FR)</label><input id="f-faccent-fr" v-model="form.fr.accent" class="inp" maxlength="80"></div>
              <div class="field"><label for="f-faccent-en">Highlighted (EN)</label><input id="f-faccent-en" v-model="form.en.accent" class="inp" maxlength="80"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-frole-fr">Rôle (FR)</label><input id="f-frole-fr" v-model="form.fr.role" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-frole-en">Role (EN)</label><input id="f-frole-en" v-model="form.en.role" class="inp" maxlength="120"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-fmodes-fr">Modes (FR)</label><input id="f-fmodes-fr" v-model="form.fr.modes" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-fmodes-en">Modes (EN)</label><input id="f-fmodes-en" v-model="form.en.modes" class="inp" maxlength="120"></div>
            </div>
            <div class="panel mini-panel">
              <span class="lab">Aperçu pied de page</span>
              <p class="prev-foot">{{ form.fr.title }} <span class="acc">{{ form.fr.accent }}</span>.</p>
              <p class="small muted">© {{ new Date().getFullYear() }} · {{ form.fr.role }} · {{ form.fr.modes }}</p>
            </div>
          </template>

          <!-- SEO PAGES -->
          <template v-else-if="selectedKey.startsWith('seo-')">
            <div class="pair">
              <div class="field"><label for="f-seot-fr">Titre (FR)</label><input id="f-seot-fr" v-model="form.fr.title" class="inp" maxlength="120"></div>
              <div class="field"><label for="f-seot-en">Title (EN)</label><input id="f-seot-en" v-model="form.en.title" class="inp" maxlength="120"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-seod-fr">Description (FR)</label><textarea id="f-seod-fr" v-model="form.fr.description" class="inp" rows="3" maxlength="300"></textarea></div>
              <div class="field"><label for="f-seod-en">Description (EN)</label><textarea id="f-seod-en" v-model="form.en.description" class="inp" rows="3" maxlength="300"></textarea></div>
            </div>
            <div class="panel mini-panel">
              <span class="lab">Aperçu Google · FR / LinkedIn · FR</span>
              <div class="serp"><span class="u">portfolio › fr › {{ selectedKey.replace('seo-', '') }}</span><span class="ti">{{ form.fr.title }} · ONDYX</span><span class="small muted">{{ form.fr.description }}</span></div>
              <div class="serp" style="margin-top: 8px"><span class="u">portfolio › fr › {{ selectedKey.replace('seo-', '') }}</span><span class="ti">{{ form.fr.title }} · ONDYX</span><span class="small muted">{{ form.fr.description }} (LinkedIn : même og:title/description + image /og-image.png)</span></div>
              <span class="hint">Titre 60 caractères conseillés, description 50-160.</span>
            </div>
          </template>

          <!-- LEGAL / PRIVACY -->
          <template v-else>
            <p class="hint">Modèle avec [À COMPLÉTER] : remplis tout avant de publier. Les champs [À COMPLÉTER] bloquent la publication.</p>
            <div v-for="lc in (['fr', 'en'] as const)" :key="`legal-${lc}`" class="field">
              <span class="lab">Sections ({{ lc.toUpperCase() }})</span>
              <div v-for="(s, i) in (form[lc].sections) as { kind: string; text: string }[]" :key="i" class="sectionrow">
                <select v-model="s.kind" class="inp mini" aria-label="Type de section">
                  <option value="h2">Titre</option>
                  <option value="p">Paragraphe</option>
                </select>
                <textarea v-model="s.text" class="inp" rows="3" :aria-label="`Section ${i + 1} ${lc}`"></textarea>
                <button class="btn ghost" type="button" :aria-label="`Retirer la section ${i + 1}`" @click="(form[lc].sections).splice(i, 1)">✕</button>
              </div>
              <div><button class="btn ghost" type="button" @click="(form[lc].sections).push({ kind: 'p', text: '' })">+ Ajouter une section</button></div>
            </div>
          </template>
        </fieldset>

        <div class="grid g2" style="margin-top: 16px">
          <section class="panel" aria-labelledby="t-next">
            <div class="ph"><h2 id="t-next">Avant publication</h2><span class="chip" :class="view.issues.length ? 'crit' : 'ok'">{{ view.issues.length ? `${view.issues.length} point(s)` : 'prêt' }}</span></div>
            <p v-if="!view.issues.length" class="small muted">Aucun blocage. Tu peux publier.</p>
            <ul v-else class="list">
              <li v-for="(issue, i) in view.issues" :key="`${issue.path}-${i}`">
                <span class="sev crit" />
                <button class="linklike" type="button" @click="ed.focusField(issue.path)">{{ issue.message }}</button>
                <code class="small muted">{{ issue.path }}</code>
              </li>
            </ul>
          </section>
          <section v-if="selectedKey === 'hero'" class="panel" aria-labelledby="t-prev">
            <div class="ph"><h2 id="t-prev">Aperçu Hero</h2></div>
            <p class="hero-name" aria-hidden="true"><span class="outline-text">{{ heroPreviewWords[0] ?? '' }}</span> {{ heroPreviewWords.slice(1).join(' ') }}</p>
            <p class="small muted">Grand nom (mêmes règles que le site : nom publié ou « ONDYX »).</p>
          </section>
        </div>
      </template>
    </div>
  </div>

  <div v-if="ed.showHistory.value" class="scrim" @click.self="ed.showHistory.value = false">
    <div class="panel modal" role="dialog" aria-modal="true" aria-label="Historique">
      <div class="ph"><h2>Historique</h2><button class="btn ghost" type="button" @click="ed.showHistory.value = false">Fermer</button></div>
      <p v-if="ed.versionsLoading.value" class="small muted">Chargement…</p>
      <ul v-else class="list">
        <li v-for="v in ed.versions.value" :key="v.number">
          <span class="sev" :class="v.kind === 'published' ? 'ok' : ''" />
          <span><b>Version {{ v.number }}</b> · {{ { import: 'import', checkpoint: 'point de sauvegarde', published: 'publiée', restored: 'restaurée' }[v.kind] }}<br><span class="small muted">{{ fmt(v.createdAt) }}</span></span>
          <button class="btn sec" type="button" @click="ed.doRestore(v.number)">Restaurer</button>
        </li>
      </ul>
      <p class="small muted">Restaurer crée une copie de travail. Rien n’est publié.</p>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.navlist {
  padding: 8px;
}

.navitem {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
}

.navitem[aria-current='page'] {
  background: var(--ink);
  color: var(--on-ink);
}

.navitem .chip {
  margin-left: auto;
}

.formpanel {
  min-width: 0;
}

.fs {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  border: 0;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.linklike {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.hero-name {
  font: 800 clamp(22px, 3vw, 32px) / 1 var(--font-display);
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

.prev-foot {
  font-size: 16px;
}

.sectionrow {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  margin-bottom: 8px;
}

.mini {
  width: auto;
  padding: 4px 8px;
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: start center;
  overflow-y: auto;
  padding: 24px 16px;
  background: color-mix(in srgb, var(--ink) 45%, transparent);
}

.modal {
  width: 100%;
  max-width: 560px;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .pair,
  .sectionrow {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
