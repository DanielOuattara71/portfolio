<script setup lang="ts">
import type { ProjectDoc } from '@portfolio/shared/content'

/**
 * Project list (docs/admin/07 mockup "Projets"): table, status filters, search,
 * keyboard-accessible reorder (up/down + drag), home switch, "no link" chip.
 */
useHead({ title: 'Projets · Administration' })

interface ListRow {
  id: string
  type: string
  key: string
  status: string
  featured: boolean
  position: number
  modified: boolean
  revision: number
  working: ProjectDoc
  published: ProjectDoc | null
  publishedAt: string | null
  updatedAt: string
  updatedBy: string | null
  pendingFields: string[]
}

const allowed = useCan()
const canWrite = computed(() => allowed('content.write'))

const items = ref<ListRow[]>([])
const loading = ref(true)
const q = ref('')
const filter = ref<'all' | 'published' | 'modified' | 'draft' | 'in_review' | 'archived'>('all')
const notice = ref<{ ok: boolean; text: string } | null>(null)
const busy = ref(false)
const dragId = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ items: ListRow[] }>('/api/admin/content', {
      query: { type: 'project', ...(q.value.trim() ? { q: q.value.trim() } : {}) },
    })
    items.value = res.items
  } catch {
    notice.value = { ok: false, text: "Impossible de charger les projets. Vérifie que l'API est en ligne." }
  }
  loading.value = false
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})
onMounted(load)

const visible = computed(() => {
  const all = items.value
  if (filter.value === 'all') return all
  if (filter.value === 'modified') return all.filter((i) => i.modified)
  if (filter.value === 'published') return all.filter((i) => !!i.published)
  if (filter.value === 'draft') return all.filter((i) => i.status === 'draft')
  if (filter.value === 'in_review') return all.filter((i) => i.status === 'in_review')
  return all.filter((i) => i.status === 'archived')
})

const counts = computed(() => ({
  all: items.value.length,
  published: items.value.filter((i) => !!i.published).length,
  modified: items.value.filter((i) => i.modified).length,
  draft: items.value.filter((i) => i.status === 'draft').length,
  archived: items.value.filter((i) => i.status === 'archived').length,
}))

function stateOf(i: ListRow): { text: string; cls: string } {
  if (i.status === 'archived') return { text: 'Archivé', cls: '' }
  if (i.status === 'in_review') return { text: 'En révision', cls: 'info' }
  if (!i.published) return { text: 'Brouillon', cls: 'warn' }
  if (i.modified) return { text: 'Publié · modifié', cls: 'info' }
  return { text: 'Publié', cls: 'ok' }
}

function langs(i: ListRow) {
  const w = i.working
  const okFr = !!(w.name.fr && w.slug.fr && w.kind.fr && w.tagline.fr && w.summary.fr)
  const okEn = !!(w.name.en && w.slug.en && w.kind.en && w.tagline.en && w.summary.en)
  return { fr: okFr, en: okEn }
}

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

async function createProject() {
  busy.value = true
  try {
    const res = await $fetch<ListRow & { status: string }>('/api/admin/content', { method: 'POST', body: { type: 'project' } })
    await navigateTo(`/projets/${(res as unknown as { id: string }).id}`)
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    notice.value = { ok: false, text: code === 'permission.denied' ? 'Ton rôle ne permet pas de créer un projet.' : "L'opération n'a pas abouti. Réessaie dans un instant." }
    busy.value = false
  }
}

async function duplicate(i: ListRow) {
  busy.value = true
  try {
    const res = await $fetch<{ id: string }>(`/api/admin/content/${i.id}/duplicate`, { method: 'POST' })
    notice.value = { ok: true, text: `Dupliqué : nouveau brouillon créé.` }
    await navigateTo(`/projets/${res.id}`)
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    notice.value = { ok: false, text: code === 'permission.denied' ? 'Ton rôle ne permet pas de dupliquer.' : "L'opération n'a pas abouti." }
    busy.value = false
  }
}

async function toggleFeatured(i: ListRow) {
  busy.value = true
  try {
    const res = await $fetch<{ item: ListRow; siteRefreshed: string }>(`/api/admin/content/${i.id}/featured`, { method: 'PATCH', body: { featured: !i.featured } })
    const idx = items.value.findIndex((x) => x.id === i.id)
    if (idx >= 0) items.value[idx] = { ...items.value[idx]!, featured: res.item.featured }
    notice.value = { ok: true, text: res.item.featured ? 'Affiché sur l’accueil.' : 'Retiré de l’accueil.' }
  } catch {
    notice.value = { ok: false, text: "L'opération n'a pas abouti." }
  }
  busy.value = false
}

async function move(i: ListRow, dir: -1 | 1) {
  if (!canWrite.value) return
  const all = [...items.value]
  const idx = all.findIndex((x) => x.id === i.id)
  const j = idx + dir
  if (j < 0 || j >= all.length) return
  const [moved] = all.splice(idx, 1)
  all.splice(j, 0, moved!)
  items.value = all
  busy.value = true
  try {
    await $fetch('/api/admin/content/order', { method: 'PUT', body: { type: 'project', ids: all.map((x) => x.id) } })
    notice.value = { ok: true, text: 'Ordre enregistré.' }
  } catch {
    notice.value = { ok: false, text: "Impossible d'enregistrer l'ordre." }
    await load()
  }
  busy.value = false
}

function onDragStart(e: DragEvent, id: string) {
  dragId.value = id
  e.dataTransfer?.setData('text/plain', id)
}
function onDrop(e: DragEvent, targetId: string) {
  e.preventDefault()
  const from = dragId.value
  dragId.value = null
  if (!from || from === targetId) return
  const all = [...items.value]
  const fromIdx = all.findIndex((x) => x.id === from)
  const toIdx = all.findIndex((x) => x.id === targetId)
  if (fromIdx < 0 || toIdx < 0) return
  const [moved] = all.splice(fromIdx, 1)
  all.splice(toIdx, 0, moved!)
  items.value = all
  $fetch('/api/admin/content/order', { method: 'PUT', body: { type: 'project', ids: all.map((x) => x.id) } })
    .then(() => (notice.value = { ok: true, text: 'Ordre enregistré.' }))
    .catch(() => {
      notice.value = { ok: false, text: "Impossible d'enregistrer l'ordre." }
      load()
    })
}
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Projets</h1>
      <p class="muted">Glisse les lignes (ou utilise ↑ ↓) pour changer l'ordre affiché sur le site.</p>
    </div>
    <div class="row">
      <button v-if="canWrite" class="btn" type="button" :disabled="busy" @click="createProject">Nouveau projet</button>
    </div>
  </div>

  <div class="row">
    <div class="seg" role="group" aria-label="Filtrer par statut">
      <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">Tous {{ counts.all }}</button>
      <button type="button" :aria-pressed="filter === 'published'" @click="filter = 'published'">Publiés {{ counts.published }}</button>
      <button type="button" :aria-pressed="filter === 'modified'" @click="filter = 'modified'">Modifiés {{ counts.modified }}</button>
      <button type="button" :aria-pressed="filter === 'draft'" @click="filter = 'draft'">Brouillons {{ counts.draft }}</button>
      <button type="button" :aria-pressed="filter === 'archived'" @click="filter = 'archived'">Archivés {{ counts.archived }}</button>
    </div>
    <span class="sp" />
    <label class="sr-only" for="pq">Rechercher un projet</label>
    <input id="pq" v-model="q" class="inp" type="search" placeholder="Rechercher un projet ou une technologie" style="max-width: 300px">
  </div>

  <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>

  <div class="tw">
    <table>
      <thead>
        <tr><th><span class="sr-only">Ordre</span></th><th>Projet</th><th>Statut</th><th>Langues</th><th>Liens</th><th class="hide-sm">Accueil</th><th class="hide-sm">Modifié</th><th><span class="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        <tr v-for="i in visible" :key="i.id" :data-id="i.id" draggable="true" @dragstart="onDragStart($event, i.id)" @dragover.prevent @drop="onDrop($event, i.id)">
          <td class="grip">
            <span aria-hidden="true">⋮⋮</span>
            <span class="row grip-btns">
              <button class="btn ghost" type="button" :disabled="!canWrite || busy" :aria-label="`Monter ${i.key}`" @click="move(i, -1)">↑</button>
              <button class="btn ghost" type="button" :disabled="!canWrite || busy" :aria-label="`Descendre ${i.key}`" @click="move(i, 1)">↓</button>
            </span>
          </td>
          <td>
            <div class="row" style="flex-wrap: nowrap">
              <span class="id">{{ i.key }}</span>
              <span>
                <b style="font-weight: 500">{{ i.working.name.fr || i.working.name.en || '(sans nom)' }}</b>
                <br><span class="small muted">{{ i.working.kind.fr || i.working.kind.en }}<template v-if="i.pendingFields.length"> · <span class="flag">{{ i.pendingFields.length }} à valider</span></template></span>
              </span>
            </div>
          </td>
          <td><span class="chip" :class="stateOf(i).cls">{{ stateOf(i).text }}</span></td>
          <td class="small" :class="{ err: !(langs(i).fr && langs(i).en) }">
            FR {{ langs(i).fr ? '✓' : '✕' }} · EN {{ langs(i).en ? '✓' : '✕' }}
          </td>
          <td><span v-if="i.working.links.length" class="chip">{{ i.working.links.length }}</span><span v-else class="chip crit">aucun</span></td>
          <td class="hide-sm">
            <button class="switch" type="button" role="switch" :aria-checked="i.featured" :aria-label="`Afficher ${i.key} sur l'accueil`" :disabled="!canWrite || busy" @click="toggleFeatured(i)"><span /></button>
          </td>
          <td class="hide-sm small muted">{{ fmt(i.updatedAt) }}</td>
          <td>
            <span class="row">
              <NuxtLink class="btn sec" :to="`/projets/${i.id}`">Modifier</NuxtLink>
              <button v-if="canWrite" class="btn ghost" type="button" :disabled="busy" @click="duplicate(i)">Dupliquer</button>
            </span>
          </td>
        </tr>
        <tr v-if="!loading && !visible.length"><td colspan="8" class="muted">Aucun projet.</td></tr>
        <tr v-if="loading"><td colspan="8"><span class="sk" style="height: 40px" /></td></tr>
      </tbody>
    </table>
  </div>
  <p class="small muted">Les projets importés depuis le site actuel restent en ligne. Sans lien, ils ne pourront pas être republiés (règle « au moins un lien »).</p>
</template>

<style scoped>
.sp {
  flex: 1;
}

.id {
  flex: none;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  font: 400 11px/1.4 var(--font-data);
  color: var(--ink-muted);
}

.flag {
  color: var(--warning);
  font-weight: 600;
}

.err {
  color: var(--danger);
}

.grip {
  white-space: nowrap;
  color: var(--ink-muted);
}

.grip-btns {
  gap: 0;
  margin-left: 6px;
}

.grip-btns .btn {
  padding: 2px 6px;
}

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-sunken);
  cursor: pointer;
}

.switch span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ink-muted);
  transition: transform var(--duration-fast) var(--ease-out), background var(--duration-fast);
}

.switch[aria-checked='true'] {
  background: var(--ink);
  border-color: var(--ink);
}

.switch[aria-checked='true'] span {
  transform: translateX(18px);
  background: var(--on-ink);
}

.switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .hide-sm {
    display: none;
  }
}
</style>
