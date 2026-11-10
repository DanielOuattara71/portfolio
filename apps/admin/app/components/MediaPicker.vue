<script setup lang="ts">
/**
 * Reusable media picker (module 5, reused by Projects in module 6):
 * lists the library filtered by kind (image or PDF), with search and direct import.
 * Parent listens to `select` with the chosen media id, then sets its own field.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    kind: 'image' | 'pdf'
    folder?: MediaFolder
    title?: string
  }>(),
  { folder: 'divers', title: 'Choisir dans la médiathèque' },
)
const emit = defineEmits<{ close: []; select: [id: string] }>()

const q = ref('')
const items = ref<MediaItem[]>([])
const loading = ref(false)
const selectedId = ref<string | null>(null)
const error = ref('')
const importFolder = ref<MediaFolder>(props.folder)
const importing = ref(false)
const uploadMessage = ref('')

const accept = computed(() =>
  props.kind === 'pdf' ? '.pdf,application/pdf' : '.jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif',
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ media: MediaItem[] }>('/api/admin/media', {
      query: { kind: props.kind, trash: '0', ...(q.value.trim() ? { q: q.value.trim() } : {}) },
    })
    items.value = res.media
  } catch (e) {
    error.value = mediaError(e)
  }
  loading.value = false
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedId.value = null
      error.value = ''
      uploadMessage.value = ''
      q.value = ''
      importFolder.value = props.folder
      load()
    }
  },
)
watch(
  () => props.kind,
  () => {
    if (props.open) load()
  },
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importing.value = true
  uploadMessage.value = `Envoi de ${file.name}…`
  error.value = ''
  try {
    const r = await uploadMedia(file, { folder: importFolder.value })
    uploadMessage.value = r.duplicate ? 'Déjà présent : fichier existant sélectionné.' : 'Fichier prêt.'
    await load()
    selectedId.value = r.media.id
  } catch (err) {
    uploadMessage.value = ''
    error.value = mediaError(err)
  }
  importing.value = false
}

function confirm() {
  if (selectedId.value) emit('select', selectedId.value)
}

const missingAlt = (m: MediaItem) => m.kind === 'image' && (!m.alt.fr || !m.alt.en)
</script>

<template>
  <div v-if="open" class="scrim" @click.self="emit('close')" @keydown="onKey">
    <div class="panel modal" role="dialog" aria-modal="true" :aria-label="title">
      <div class="ph">
        <h2>{{ title }}</h2>
        <button class="btn ghost" type="button" autofocus @click="emit('close')">Fermer</button>
      </div>

      <div class="row">
        <label class="sr-only" for="mp-q">Rechercher</label>
        <input id="mp-q" v-model="q" class="inp" type="search" placeholder="Rechercher un nom ou un texte alternatif" style="max-width: 320px">
        <label class="small row">Dossier :
          <select v-model="importFolder" class="inp mini">
            <option v-for="f in MEDIA_FOLDERS" :key="f.value" :value="f.value">{{ f.label }}</option>
          </select>
        </label>
        <label class="btn sec" :aria-disabled="importing">
          {{ importing ? 'Envoi…' : 'Importer' }}
          <input class="sr-only" type="file" :accept="accept" :disabled="importing" @change="onPick">
        </label>
      </div>
      <p v-if="uploadMessage" class="small muted" role="status">{{ uploadMessage }}</p>
      <p v-if="error" class="alert crit" role="alert">{{ error }}</p>

      <div v-if="loading && !items.length" class="grid-pick">
        <div v-for="n in 6" :key="n" class="sk" style="aspect-ratio: 4/3" />
      </div>
      <div v-else-if="!items.length" class="empty">
        <b>Aucun fichier</b>
        <span class="small muted">Importe un fichier pour le choisir ici.</span>
      </div>
      <div v-else class="grid-pick">
        <button
          v-for="m in items"
          :key="m.id"
          type="button"
          class="tile"
          :aria-pressed="selectedId === m.id"
          @click="selectedId = m.id"
          @dblclick="selectedId = m.id; confirm()"
        >
          <img v-if="m.kind === 'image'" :src="previewUrl(m.id)" :alt="m.alt.fr ?? ''" loading="lazy" class="thumb">
          <span v-else class="thumb pdf">PDF</span>
          <span class="tname">{{ m.name }}</span>
          <span class="small muted">{{ formatBytes(m.bytes) }}<template v-if="m.isPublic"> · public</template></span>
          <span v-if="missingAlt(m)" class="small warn">texte alternatif à compléter</span>
        </button>
      </div>

      <div class="row end">
        <button class="btn sec" type="button" @click="emit('close')">Annuler</button>
        <button class="btn" type="button" :disabled="!selectedId" @click="confirm">Sélectionner</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  max-width: 760px;
}

.mini {
  width: auto;
  padding: 4px 8px;
}

.warn {
  color: var(--warning);
}

.end {
  justify-content: flex-end;
}

.grid-pick {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  max-height: 46vh;
  overflow-y: auto;
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

.empty {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 4px;
  padding: 20px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
}
</style>
