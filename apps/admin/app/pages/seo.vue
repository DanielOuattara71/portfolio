<script setup lang="ts">
/** SEO: 5 page blocks (FR/EN, publish individually) + project SEO overview table. */
useHead({ title: 'SEO · Administration' })

const allowed = useCan()
const canWrite = computed(() => allowed('content.write'))
const canSubmit = computed(() => allowed('content.submit'))
const canPublish = computed(() => allowed('content.publish'))

const route = useRoute()

const SEO_BLOCKS = [
  { key: 'seo-home', label: 'SEO — Accueil', crumb: 'fr › accueil' },
  { key: 'seo-projects', label: 'SEO — Projets', crumb: 'fr › projets' },
  { key: 'seo-profile', label: 'SEO — Profil', crumb: 'fr › profil' },
  { key: 'seo-expertise', label: 'SEO — Expertise', crumb: 'fr › expertise' },
  { key: 'seo-contact', label: 'SEO — Contact', crumb: 'fr › contact' },
] as const

/* ---------- Page block editor (same flow as Textes) ---------- */
const selectedKey = ref<string>(
  typeof route.query.key === 'string' && SEO_BLOCKS.some((b) => b.key === route.query.key) ? (route.query.key as string) : 'seo-home',
)
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

const editorId = computed(() => blockId(selectedKey.value))
const ed = useItemEditor(() => editorId.value)
const view = ed.view
const form = ed.form as unknown as Ref<{ fr: { title: string; description: string }; en: { title: string; description: string } }>

watch(editorId, (nid, oid) => {
  if (nid && nid !== oid) ed.load()
})

const crumb = computed(() => SEO_BLOCKS.find((b) => b.key === selectedKey.value)?.crumb ?? selectedKey.value.replace('seo-', ''))
/* ---------- Project SEO overview ---------- */
interface ProjectRow {
  id: string
  key: string
  status: string
  modified: boolean
  pendingFields: string[]
  working: { name: { fr: string; en: string }; slug: { fr: string; en: string }; summary: { fr: string; en: string }; seo: { title: { fr: string | null; en: string | null }; description: { fr: string | null; en: string | null }; imageId: string | null; index: boolean } }
}
const projectsLoading = ref(true)
const projects = ref<ProjectRow[]>([])
async function loadProjects() {
  projectsLoading.value = true
  try {
    const res = await $fetch<{ items: ProjectRow[] }>('/api/admin/content', { query: { type: 'project' } })
    projects.value = res.items
  } catch {
    projects.value = []
  }
  projectsLoading.value = false
}

interface MediaItem { id: string; name: string }
const mediaList = ref<MediaItem[]>([])
async function loadMedia() {
  try {
    const res = await $fetch<{ media: MediaItem[] }>('/api/admin/media', { query: { kind: 'image', trash: '0' } })
    mediaList.value = res.media ?? []
  } catch {
    mediaList.value = []
  }
}
const mediaById = computed(() => new Map(mediaList.value.map((m) => [m.id, m])))

const projectTitle = (r: ProjectRow, lc: 'fr' | 'en') => r.working.seo.title[lc]?.trim() || `${r.working.name[lc] || r.working.name.fr} · Étude de cas`
const projectDesc = (r: ProjectRow, lc: 'fr' | 'en') => r.working.seo.description[lc]?.trim() || r.working.summary[lc]
function indexChip(r: ProjectRow) {
  return r.working.seo.index ? { text: 'Indexée', cls: 'ok' } : { text: 'Exclue', cls: 'warn' }
}
function projectStateLabel(r: ProjectRow) {
  if (r.status === 'archived') return { text: 'Archivé', cls: '' }
  if (r.status === 'in_review') return { text: 'En révision', cls: 'info' }
  if (r.modified) return { text: 'Publié · modifié', cls: 'info' }
  return { text: 'Publié', cls: 'ok' }
}

onMounted(() => {
  loadList()
  loadProjects()
  loadMedia()
})
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>SEO</h1>
      <p class="muted">Les 5 pages ont un titre et une description dans « Textes du site » ; chaque projet porte titre, description, image de partage et indexation dans son propre onglet SEO. Ici : tout SEO au même endroit, et l'aperçu Google avec.</p>
    </div>
    <div class="row" @keydown="ed.onSaveKey">
      <span class="small muted" role="status">{{ ed.saving.value ? 'Enregistrement…' : ed.savedLabel.value }}</span>
      <button class="btn sec" type="button" :disabled="ed.saving.value || !canWrite || !view" @click="ed.save(true)">Enregistrer</button>
      <button class="btn sec" type="button" :disabled="!canWrite || !view?.published" @click="ed.confirmDiscard.value = true">Abandonner</button>
      <button v-if="canPublish && view" class="btn" type="button" :disabled="!canWrite || ed.publishing.value" @click="ed.doPublish()">Publier</button>
      <button v-else-if="canSubmit && view" class="btn" type="button" :disabled="!canWrite || ed.publishing.value" @click="ed.doSubmit()">Soumettre</button>
    </div>
  </div>

  <p v-if="ed.notice.value" class="alert" :class="ed.notice.value.ok ? 'ok' : 'crit'" role="status">{{ ed.notice.value.text }}</p>

  <div class="layout">
    <nav class="panel navlist" :aria-label="'Blocs SEO des pages'">
      <p class="lab">Pages</p>
      <button v-for="b in SEO_BLOCKS" :key="b.key" class="navitem" type="button" :aria-current="selectedKey === b.key ? 'true' : undefined" @click="selectedKey = b.key">
        <span>{{ b.label }}</span>
        <span class="chip" :class="blockState(b.key).cls">{{ blockState(b.key).text }}</span>
      </button>
    </nav>

    <div class="panel formpanel">
      <p v-if="ed.loading.value" class="sk" style="height: 180px" />
      <p v-else-if="ed.loadError.value" class="alert crit" role="alert">{{ ed.loadError.value }}</p>
      <fieldset v-else :disabled="!canWrite || view?.status === 'archived'" class="fs">
        <template v-if="form && view">
          <div class="pair">
            <div class="field"><label for="f-titlefr">Titre (FR)</label><input id="f-titlefr" v-model="form.fr.title" class="inp" maxlength="120"></div>
            <div class="field"><label for="f-titleen">Title (EN)</label><input id="f-titleen" v-model="form.en.title" class="inp" maxlength="120"></div>
          </div>
          <div class="pair">
            <div class="field"><label for="f-descriptionfr">Description (FR)</label><textarea id="f-descriptionfr" v-model="form.fr.description" class="inp" rows="3" maxlength="300" /></div>
            <div class="field"><label for="f-descriptionen">Description (EN)</label><textarea id="f-descriptionen" v-model="form.en.description" class="inp" rows="3" maxlength="300" /></div>
          </div>
          <div class="panel mini-panel">
            <span class="lab">Aperçu Google · FR</span>
            <div class="serp"><span class="u">portfolio › {{ crumb }}</span><span class="ti">{{ form.fr.title }} · ONDYX</span><span class="small muted">{{ form.fr.description }}</span></div>
            <span class="hint">Titre ~60 caractères, description 50-160.</span>
          </div>
        </template>
      </fieldset>

      <div v-if="view" class="grid g2" style="margin-top: 16px">
        <section class="panel" aria-labelledby="seo-issues">
          <div class="ph"><h2 id="seo-issues">Avant publication</h2><span class="chip" :class="view.issues.length ? 'crit' : 'ok'">{{ view.issues.length ? `${view.issues.length} point(s)` : 'prêt' }}</span></div>
          <p v-if="!view.issues.length" class="small muted">Aucun blocage. Tu peux publier.</p>
          <ul v-else class="list">
            <li v-for="(issue, i) in view.issues" :key="`${issue.path}-${i}`">
              <span class="sev crit" />
              <button class="linklike" type="button" @click="ed.focusField(issue.path)">{{ issue.message }}</button>
              <code class="small muted">{{ issue.path }}</code>
            </li>
          </ul>
        </section>
        <section class="panel" aria-labelledby="seo-published">
          <div class="ph"><h2 id="seo-published">État</h2></div>
          <ul class="list">
            <li><span class="sev " :class="view.published ? 'ok' : 'warn'" /><span>{{ view.published ? 'publié' : 'jamais publié' }}</span></li>
            <li v-if="view.publishedAt"><span class="sev" /><span class="small">dernière publication : {{ formatDateTime(view.publishedAt) }}</span></li>
          </ul>
        </section>
      </div>
    </div>
  </div>

  <section class="panel" aria-labelledby="seo-projects">
    <div class="ph"><h2 id="seo-projects">SEO par projet</h2><span class="chip">{{ projects.length }} projet(s)</span></div>
    <div class="tw">
      <table>
        <thead><tr><th>Projet</th><th>Domaine</th><th>Titre FR</th><th>Titre EN</th><th>Image de partage</th><th>Indexée</th><th>État</th><th><span class="sr-only">Modifier</span></th></tr></thead>
        <tbody>
          <tr v-for="i in projects" :key="i.id">
            <td><code class="small">{{ i.key }}</code> · {{ i.working.name.fr || i.working.name.en }}</td>
            <td class="small">{{ i.working.slug.fr }} / {{ i.working.slug.en }}</td>
            <td class="small">{{ projectTitle(i, 'fr') }}</td>
            <td class="small">{{ projectTitle(i, 'en') }}</td>
            <td class="small">{{ i.working.seo.imageId ? (mediaById.get(i.working.seo.imageId)?.name ?? 'image introuvable') : 'og-image.png (par défaut)' }}</td>
            <td><span class="chip" :class="indexChip(i).cls">{{ indexChip(i).text }}</span></td>
            <td><span class="chip" :class="projectStateLabel(i).cls">{{ projectStateLabel(i).text }}</span></td>
            <td class="nowrap"><NuxtLink class="btn ghost" :to="`/projets/${i.id}`">Modifier</NuxtLink></td>
          </tr>
          <tr v-if="projectsLoading"><td colspan="8" class="small muted">Chargement…</td></tr>
          <tr v-else-if="!projects.length"><td colspan="8" class="small muted">Aucun projet.</td></tr>
        </tbody>
      </table>
    </div>
    <p class="small muted">Vide = le site calcule un titre/description à partir du projet. L'image de partage et la case « indexer » se règlent dans l'onglet SEO de chaque projet.</p>
  </section>

  <div v-if="ed.confirmDiscard.value" class="scrim" @click.self="ed.confirmDiscard.value = false">
    <div class="panel modal" role="dialog" aria-modal="true" aria-label="Abandonner les modifications">
      <div class="ph"><h2>Abandonner les modifications ?</h2></div>
      <p>La copie de travail remplacera la version publiée. Irréversible (l'historique reste disponible).</p>
      <div class="row end">
        <button class="btn sec" type="button" @click="ed.confirmDiscard.value = false">Garder</button>
        <button class="btn danger" type="button" @click="ed.doDiscard()">Abandonner</button>
      </div>
    </div>
  </div>

  <div v-if="ed.showHistory.value" class="scrim" @click.self="ed.showHistory.value = false">
    <div class="panel modal" role="dialog" aria-modal="true" aria-label="Historique des versions">
      <div class="ph"><h2>Historique</h2><button class="btn ghost" type="button" :aria-expanded="ed.showHistory.value" @click="ed.showHistory.value = false">Fermer</button></div>
      <p v-if="ed.versionsLoading.value" class="small muted">Chargement…</p>
      <ul v-else class="list">
        <li v-for="v in ed.versions.value" :key="v.number">
          <span class="sev" />
          <span><strong>Version {{ v.number }}</strong><br><span class="small muted">{{ v.kind }} · {{ formatDateTime(v.createdAt) }}</span></span>
          <button class="btn ghost" type="button" @click="ed.doRestore(v.number)">Restaurer</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.lab {
  display: block;
  margin-bottom: 8px;
  font: 400 11px/1.4 var(--font-data);
  color: var(--ink-muted);
  text-transform: uppercase;
}

.navlist {
  display: grid;
  gap: 4px;
  align-content: start;
}

.navitem {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.navitem:hover {
  background: var(--surface-sunken);
}

.navitem[aria-current='true'] {
  background: var(--ink);
  color: var(--on-ink);
}

.formpanel {
  display: grid;
  gap: 14px;
}

.fs {
  display: grid;
  gap: 14px;
  border: 0;
  padding: 0;
  margin: 0;
}

.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.field {
  display: grid;
  gap: 4px;
}

.serp {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}

.serp .u {
  font: 400 12px/1.4 var(--font-data);
  color: var(--success);
}

.serp .ti {
  color: var(--info);
  font-size: 18px;
}

.mini-panel {
  padding: 12px;
}

.linklike {
  border: 0;
  background: transparent;
  color: var(--info);
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--ink) 40%, transparent);
}

.modal {
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
}

.end {
  justify-content: end;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
