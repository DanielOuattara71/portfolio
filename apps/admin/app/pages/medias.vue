<script setup lang="ts">
/**
 * Media library (docs/admin/02 §G, mockup 07 "Médiathèque"): import, describe, search, see usages,
 * replace, trash. A file used by a content cannot be deleted.
 */
useHead({ title: 'Médiathèque · Administration' })

const allowed = useCan()
const canWrite = computed(() => allowed('media.write'))

const folder = ref<MediaFolder | ''>('')
const q = ref('')
const trash = ref(false)
const items = ref<MediaItem[]>([])
const loading = ref(false)
const selectedId = ref<string | null>(null)
interface MediaDetail { media: MediaItem; usages: { type: string; key: string; status: string; field: string; published: boolean }[] }
const detail = ref<MediaDetail | null>(null)
const notice = ref<{ ok: boolean; text: string } | null>(null)

async function load() {
  loading.value = true
  const res = await $fetch<{ media: MediaItem[] }>('/api/admin/media', {
    query: { ...(folder.value ? { folder: folder.value } : {}), ...(q.value.trim() ? { q: q.value.trim() } : {}), trash: trash.value ? '1' : '0' },
  })
  items.value = res.media
  loading.value = false
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})
watch([folder, trash], () => {
  selectedId.value = null
  load()
})
onMounted(load)

async function select(id: string) {
  selectedId.value = id
  const d = await $fetch<MediaDetail>(`/api/admin/media/${id}`)
  detail.value = d
  // Edited copy, taken from the plain response (reactive proxies cannot be structured-cloned).
  form.value = { name: d.media.name, folder: d.media.folder, alt: { ...d.media.alt }, caption: { ...d.media.caption }, credit: d.media.credit }
  confirmDelete.value = false
}

/* ---------- Upload queue ---------- */
interface Job { key: number; name: string; stage: 'waiting' | 'sending' | 'checking' | 'done' | 'error'; progress: number; message?: string }
const jobs = ref<Job[]>([])
let seq = 0
const uploadFolder = ref<MediaFolder>('projets')
const dragging = ref(false)

async function upload(files: FileList | File[]) {
  const list = [...files]
  const queued = list.map((f) => ({ file: f, job: reactive<Job>({ key: ++seq, name: f.name, stage: 'waiting', progress: 0 }) }))
  jobs.value.unshift(...queued.map((x) => x.job))
  for (const { file, job } of queued) {
    try {
      const r = await uploadMedia(file, {
        folder: uploadFolder.value,
        onStage: (s) => (job.stage = s),
        onProgress: (p) => (job.progress = p),
      })
      job.stage = 'done'
      job.message = r.duplicate ? 'Déjà présent : fichier existant conservé.' : 'Prêt. Ajoute un texte alternatif.'
    } catch (e) {
      job.stage = 'error'
      job.message = mediaError(e)
    }
  }
  await load()
}
function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) upload(input.files)
  input.value = ''
}
function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files.length && canWrite.value) upload(e.dataTransfer.files)
}

/* ---------- Detail ---------- */
const form = ref<{ name: string; folder: MediaFolder; alt: { fr: string | null; en: string | null }; caption: { fr: string | null; en: string | null }; credit: string | null } | null>(null)
const saving = ref(false)
async function save() {
  if (!detail.value || !form.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/media/${detail.value.media.id}`, { method: 'PATCH', body: form.value })
    notice.value = { ok: true, text: 'Informations enregistrées.' }
    await Promise.all([load(), select(detail.value.media.id)])
  } catch (e) {
    notice.value = { ok: false, text: mediaError(e) }
  }
  saving.value = false
}

async function replace(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !detail.value) return
  try {
    await uploadMedia(file, { folder: detail.value.media.folder, replaceOf: detail.value.media.id })
    notice.value = { ok: true, text: 'Fichier remplacé. Les contenus qui l’utilisent affichent la nouvelle version.' }
    await Promise.all([load(), select(detail.value.media.id)])
  } catch (err) {
    notice.value = { ok: false, text: mediaError(err) }
  }
}

const confirmDelete = ref(false)
async function remove() {
  if (!detail.value) return
  try {
    await $fetch(`/api/admin/media/${detail.value.media.id}`, { method: 'DELETE' })
    notice.value = { ok: true, text: 'Fichier placé dans la corbeille (30 jours).' }
    selectedId.value = null
    detail.value = null
    await load()
  } catch (e) {
    notice.value = { ok: false, text: mediaError(e) }
  }
  confirmDelete.value = false
}
async function restore() {
  if (!detail.value) return
  try {
    await $fetch(`/api/admin/media/${detail.value.media.id}/restore`, { method: 'POST' })
    notice.value = { ok: true, text: 'Fichier restauré.' }
    selectedId.value = null
    detail.value = null
    await load()
  } catch (e) {
    notice.value = { ok: false, text: mediaError(e) }
  }
}

const missingAlt = (m: MediaItem) => m.kind === 'image' && (!m.alt.fr || !m.alt.en)
const stageLabel: Record<Job['stage'], string> = { waiting: 'en attente', sending: 'envoi', checking: 'vérification', done: 'prêt', error: 'refusé' }
const typeLabel = (m: MediaItem) => (m.kind === 'pdf' ? 'PDF' : m.mime.replace('image/', '').toUpperCase())
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Médiathèque</h1>
      <p class="muted">Images optimisées automatiquement (WebP, métadonnées et position GPS retirées). Un fichier n'est public que s'il est utilisé par un contenu publié.</p>
    </div>
    <label v-if="canWrite && !trash" class="btn">
      Importer
      <input class="sr-only" type="file" multiple :accept="ACCEPT" @change="onPick">
    </label>
  </div>

  <div
    v-if="canWrite && !trash"
    class="drop"
    :class="{ on: dragging }"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <span>Glisse des images ou des PDF ici · JPEG, PNG, WebP, AVIF, PDF · 10 Mo par image, 15 Mo par PDF</span>
    <label class="row small">Dossier :
      <select v-model="uploadFolder" class="inp mini">
        <option v-for="f in MEDIA_FOLDERS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </label>
  </div>

  <ul v-if="jobs.length" class="jobs" aria-live="polite">
    <li v-for="j in jobs.slice(0, 6)" :key="j.key">
      <span class="name">{{ j.name }}</span>
      <span class="chip" :class="{ ok: j.stage === 'done', crit: j.stage === 'error', info: j.stage === 'sending' || j.stage === 'checking' }">
        {{ stageLabel[j.stage] }}<template v-if="j.stage === 'sending'"> · {{ j.progress }} %</template>
      </span>
      <span v-if="j.message" class="small" :class="j.stage === 'error' ? 'err' : 'muted'">{{ j.message }}</span>
    </li>
  </ul>

  <div class="row">
    <div class="seg" role="group" aria-label="Dossier">
      <button type="button" :aria-pressed="folder === ''" @click="folder = ''">Tous</button>
      <button v-for="f in MEDIA_FOLDERS" :key="f.value" type="button" :aria-pressed="folder === f.value" @click="folder = f.value">{{ f.label }}</button>
    </div>
    <label class="sr-only" for="mq">Rechercher</label>
    <input id="mq" v-model="q" class="inp" type="search" placeholder="Rechercher un nom ou un texte alternatif" style="max-width: 280px">
    <span class="sp" />
    <button class="btn ghost" type="button" :aria-pressed="trash" @click="trash = !trash">{{ trash ? '← Retour à la médiathèque' : 'Corbeille' }}</button>
  </div>

  <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>

  <div class="layout">
    <div>
      <div v-if="loading && !items.length" class="grid-media"><div v-for="n in 6" :key="n" class="sk" style="aspect-ratio: 4/3" /></div>
      <div v-else-if="!items.length" class="panel empty">
        <b>{{ trash ? 'Corbeille vide' : 'Aucun fichier' }}</b>
        <span class="small muted">{{ trash ? 'Les fichiers supprimés y restent 30 jours.' : 'Importe tes premières images : photo de profil, captures de projets, CV.' }}</span>
      </div>
      <div v-else class="grid-media">
        <button v-for="m in items" :key="m.id" type="button" class="tile" :aria-pressed="selectedId === m.id" @click="select(m.id)">
          <img v-if="m.kind === 'image'" :src="previewUrl(m.id)" :alt="m.alt.fr ?? ''" loading="lazy" class="thumb">
          <span v-else class="thumb pdf">PDF</span>
          <span class="tname">{{ m.name }}</span>
          <span class="small muted">
            {{ m.usageCount ? `utilisé ${m.usageCount}×` : 'non utilisé' }}<template v-if="m.isPublic"> · public</template>
          </span>
          <span v-if="missingAlt(m)" class="small warn">texte alternatif à compléter</span>
        </button>
      </div>
    </div>

    <aside v-if="detail && form" class="panel side" aria-label="Détails du fichier">
      <h2 class="dname">{{ detail.media.name }}</h2>
      <img v-if="detail.media.kind === 'image'" :src="previewUrl(detail.media.id, 960)" :alt="detail.media.alt.fr ?? ''" class="big">
      <a v-else class="btn sec" :href="previewUrl(detail.media.id)" target="_blank" rel="noopener">Ouvrir le PDF<span class="sr-only"> (nouvel onglet)</span></a>
      <p class="small muted">
        {{ typeLabel(detail.media) }} · {{ formatBytes(detail.media.bytes) }}
        <template v-if="detail.media.width"> · {{ detail.media.width }} × {{ detail.media.height }} px · {{ detail.media.variants.length }} tailles</template>
        <br>Importé le {{ formatDateTime(detail.media.createdAt) }}<template v-if="detail.media.uploadedBy"> par {{ detail.media.uploadedBy }}</template>
      </p>

      <form class="grid" style="gap: 12px" novalidate @submit.prevent="save">
        <fieldset :disabled="!canWrite || trash" class="fs">
          <div class="field"><label for="m-name">Nom</label><input id="m-name" v-model="form.name" class="inp" maxlength="160"></div>
          <div class="field">
            <label for="m-folder">Dossier</label>
            <select id="m-folder" v-model="form.folder" class="inp">
              <option v-for="f in MEDIA_FOLDERS" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
          <template v-if="detail.media.kind === 'image'">
            <div class="field">
              <label for="m-alt-fr">Texte alternatif FR</label>
              <input id="m-alt-fr" v-model="form.alt.fr" class="inp" maxlength="300" aria-describedby="alt-hint">
            </div>
            <div class="field">
              <label for="m-alt-en">Texte alternatif EN</label>
              <input id="m-alt-en" v-model="form.alt.en" class="inp" maxlength="300" aria-describedby="alt-hint">
              <span id="alt-hint" class="hint">Décris ce que montre l'image. Obligatoire dans les deux langues pour publier un contenu qui l'utilise.</span>
            </div>
            <div class="field"><label for="m-cap-fr">Légende FR (facultative)</label><input id="m-cap-fr" v-model="form.caption.fr" class="inp" maxlength="300"></div>
            <div class="field"><label for="m-cap-en">Légende EN (facultative)</label><input id="m-cap-en" v-model="form.caption.en" class="inp" maxlength="300"></div>
          </template>
          <div class="field"><label for="m-credit">Crédit (facultatif)</label><input id="m-credit" v-model="form.credit" class="inp" maxlength="160"></div>
          <div v-if="canWrite && !trash"><button class="btn" type="submit" :disabled="saving">Enregistrer</button></div>
        </fieldset>
      </form>

      <div class="field">
        <span class="lab">Utilisé par</span>
        <p v-if="!detail.usages.length" class="small muted">Aucun contenu.</p>
        <ul v-else class="list">
          <li v-for="(u, i) in detail.usages" :key="i"><span class="sev" :class="u.published ? 'ok' : ''" /><span>{{ u.type }} {{ u.key }} · {{ u.field }}</span><span class="small muted">{{ u.published ? 'publié' : 'brouillon' }}</span></li>
        </ul>
      </div>

      <div v-if="canWrite" class="row">
        <template v-if="!trash">
          <label class="btn sec">Remplacer<input class="sr-only" type="file" :accept="ACCEPT" @change="replace"></label>
          <button
            class="btn sec"
            type="button"
            :aria-disabled="detail.usages.length > 0"
            :title="detail.usages.length ? 'Utilisé par un contenu' : undefined"
            @click="detail.usages.length ? (notice = { ok: false, text: 'Utilisé par un contenu : retire-le d’abord de ce contenu.' }) : (confirmDelete = true)"
          >Supprimer</button>
        </template>
        <button v-else class="btn" type="button" @click="restore">Restaurer</button>
      </div>
      <div v-if="confirmDelete" class="alert warn confirm" role="alertdialog" aria-labelledby="del-t">
        <span id="del-t">Le fichier part dans la corbeille 30 jours, puis il est supprimé définitivement.</span>
        <span class="row"><button class="btn sec" type="button" @click="confirmDelete = false">Annuler</button><button class="btn danger" type="button" @click="remove">Supprimer</button></span>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.drop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px;
  border: 1.5px dashed var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  color: var(--ink-muted);
  font-size: 13px;
}

.drop.on {
  border-color: var(--marker);
}

.mini {
  width: auto;
  padding: 4px 8px;
}

.jobs {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.jobs li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.jobs .name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

.err {
  color: var(--danger);
}

.warn {
  color: var(--warning);
}

.sp {
  flex: 1;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.grid-media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.tile {
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  text-align: left;
  cursor: pointer;
}

.tile[aria-pressed='true'] {
  outline: 2px solid var(--marker);
}

.thumb {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
}

.thumb.pdf {
  display: grid;
  place-items: center;
  font-weight: 600;
  color: var(--ink-muted);
}

.tname {
  overflow: hidden;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side {
  position: sticky;
  top: 76px;
  max-height: calc(100vh - 92px);
  overflow-y: auto;
}

.dname {
  overflow-wrap: anywhere;
}

.big {
  width: 100%;
  max-width: 100%;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}

.fs {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.empty {
  justify-items: center;
  text-align: center;
}

.confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    position: static;
    max-height: none;
  }
}
</style>
