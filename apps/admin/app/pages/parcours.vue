<script setup lang="ts">
/**
 * Background (docs/admin/02 §F): experiences, educations, certifications,
 * services and method steps. Proofs are private by default.
 */
useHead({ title: 'Parcours · Administration' })

const allowed = useCan()
const canWrite = computed(() => allowed('content.write'))

interface ListRow {
  id: string
  key: string
  status: string
  modified: boolean
  working: Record<string, unknown> & { org?: string; name?: { fr: string; en: string }; title?: { fr: string; en: string } }
  published: unknown
}
const tab = ref<'experience' | 'education' | 'certification' | 'service' | 'step'>('experience')
const items = ref<ListRow[]>([])
const projects = ref<{ id: string; key: string; name: string }[]>([])
const loading = ref(true)
const notice = ref<{ ok: boolean; text: string } | null>(null)
const busy = ref(false)

const editingId = ref<string | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editForm = ref<any>(null)
const saving = ref(false)
const pickerOpen = ref(false)

async function load() {
  loading.value = true
  try {
    const [a, b] = await Promise.all([
      $fetch<{ items: ListRow[] }>('/api/admin/content', { query: { type: tab.value } }),
      tab.value === 'experience' || tab.value === 'education' || tab.value === 'service'
        ? $fetch<{ items: { id: string; key: string; working: { name: { fr: string; en: string } } }[] }>('/api/admin/content', { query: { type: 'project' } })
        : Promise.resolve({ items: [] }),
    ])
    items.value = a.items as ListRow[]
    projects.value = (b.items as { id: string; key: string; working: { name: { fr: string; en: string } } }[]).map((p) => ({ id: p.id, key: p.key, name: p.working.name.fr || p.working.name.en || p.key }))
  } catch {
    notice.value = { ok: false, text: 'Chargement impossible.' }
  }
  loading.value = false
}
onMounted(load)
watch(tab, load)

function openEdit(r: ListRow) {
  editingId.value = r.id
  editForm.value = JSON.parse(JSON.stringify(r.working))
}
function closeEdit() {
  editingId.value = null
  editForm.value = null
  pickerOpen.value = false
}
async function saveEdit() {
  if (!editingId.value || !editForm.value) return
  saving.value = true
  try {
    const current = items.value.find((x) => x.id === editingId.value)
    await $fetch(`/api/admin/content/${editingId.value}/working`, {
      method: 'PUT',
      body: { revision: (current as unknown as { revision: number })?.revision ?? 1, data: editForm.value, checkpoint: true },
    })
    notice.value = { ok: true, text: 'Enregistré.' }
    closeEdit()
    await load()
  } catch {
    notice.value = { ok: false, text: 'Enregistrement refusé (revise les champs).' }
  }
  saving.value = false
}
async function createOne() {
  busy.value = true
  try {
    const created = await $fetch<{ id: string }>('/api/admin/content', { method: 'POST', body: { type: tab.value } })
    await load()
    const r = items.value.find((x) => x.id === created.id)
    if (r) openEdit(r)
  } catch {
    notice.value = { ok: false, text: "L'opération n'a pas abouti." }
  }
  busy.value = false
}
async function deleteOne(r: ListRow) {
  busy.value = true
  try {
    await $fetch(`/api/admin/content/${r.id}`, { method: 'DELETE' })
    notice.value = { ok: true, text: 'Supprimé.' }
    await load()
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    notice.value = { ok: false, text: code === 'auth.reauth_required' ? 'Confirme ton identité (session de moins de 10 min) pour supprimer.' : code === 'content.referenced' ? 'Suppression refusée : utilisé ailleurs.' : "L'opération n'a pas abouti." }
  }
  busy.value = false
}
async function move(r: ListRow, dir: -1 | 1) {
  const all = [...items.value]
  const idx = all.findIndex((x) => x.id === r.id)
  const j = idx + dir
  if (j < 0 || j >= all.length) return
  const [moved] = all.splice(idx, 1)
  all.splice(j, 0, moved!)
  items.value = all
  try {
    await $fetch('/api/admin/content/order', { method: 'PUT', body: { type: tab.value, ids: all.map((x) => x.id) } })
  } catch {
    await load()
  }
}
function onPick(mediaId: string) {
  if (editForm.value) editForm.value.justificatifId = mediaId
  pickerOpen.value = false
}
function labelOf(r: ListRow): string {
  const w = r.working as Record<string, unknown>
  if (w.org) return String(w.org)
  if (w.title) return (w.title as { fr: string; en: string }).fr || (w.title as { fr: string; en: string }).en || r.key
  if (w.name) return (w.name as { fr: string; en: string }).fr || (w.name as { fr: string; en: string }).en || r.key
  return r.key
}
const stateOf = (r: ListRow) => (!r.published ? { text: 'Brouillon', cls: 'warn' } : r.modified ? { text: 'Publié · modifié', cls: 'info' } : { text: 'Publié', cls: 'ok' })
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Parcours</h1>
      <p class="muted">Expériences, formations, certifications, services et méthode. Justificatifs privés par défaut.</p>
    </div>
    <button v-if="canWrite && tab !== 'certification' || canWrite" class="btn" type="button" :disabled="busy" @click="createOne">Nouveau</button>
  </div>

  <div class="seg" role="tablist" aria-label="Type">
    <button v-for="t in (['experience', 'education', 'certification', 'service', 'step'] as const)" :key="t" type="button" role="tab" :aria-selected="tab === t" @click="tab = t">
      {{ { experience: 'Expériences', education: 'Formations', certification: 'Certifications', service: 'Services', step: 'Méthode' }[t] }}
    </button>
  </div>

  <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>

  <div class="tw">
    <table>
      <thead><tr><th><span class="sr-only">Ordre</span></th><th>Élément</th><th>Statut</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>
        <tr v-for="r in items" :key="r.id">
          <td class="grip">
            <span aria-hidden="true">⋮⋮</span>
            <button class="btn ghost" type="button" :disabled="!canWrite" :aria-label="`Monter ${r.key}`" @click="move(r, -1)">↑</button>
            <button class="btn ghost" type="button" :disabled="!canWrite" :aria-label="`Descendre ${r.key}`" @click="move(r, 1)">↓</button>
          </td>
          <td><b style="font-weight: 500">{{ labelOf(r) }}</b><br><span class="small muted">{{ r.key }}</span></td>
          <td><span class="chip" :class="stateOf(r).cls">{{ stateOf(r).text }}</span></td>
          <td>
            <span class="row">
              <button class="btn sec" type="button" @click="openEdit(r)">Modifier</button>
              <button v-if="canWrite" class="btn ghost" type="button" :disabled="busy" @click="deleteOne(r)">Supprimer</button>
            </span>
          </td>
        </tr>
        <tr v-if="!loading && !items.length"><td colspan="4" class="muted">Aucun élément. Crée-en un avec « Nouveau ».</td></tr>
      </tbody>
    </table>
  </div>

  <div v-if="editingId && editForm" class="scrim" @click.self="closeEdit">
    <form class="panel modal" @submit.prevent="saveEdit">
      <div class="ph"><h2>Modifier</h2><button class="btn ghost" type="button" @click="closeEdit">Fermer</button></div>

      <template v-if="tab === 'experience' || tab === 'education'">
        <div class="field"><label for="p-org">Organisation</label><input id="p-org" v-model="editForm.org" class="inp" maxlength="120"></div>
        <div class="pair">
          <div class="field"><label for="p-kind-fr">Type (FR)</label><input id="p-kind-fr" v-model="editForm.kind.fr" class="inp" maxlength="60"></div>
          <div class="field"><label for="p-kind-en">Kind (EN)</label><input id="p-kind-en" v-model="editForm.kind.en" class="inp" maxlength="60"></div>
        </div>
        <div class="pair">
          <div class="field"><label for="p-role-fr">Poste (FR)</label><input id="p-role-fr" v-model="editForm.role.fr" class="inp" maxlength="240"></div>
          <div class="field"><label for="p-role-en">Role (EN)</label><input id="p-role-en" v-model="editForm.role.en" class="inp" maxlength="240"></div>
        </div>
        <div class="pair">
          <div class="field"><label for="p-period-fr">Période (FR)</label><input id="p-period-fr" v-model="editForm.period.fr" class="inp" maxlength="80"></div>
          <div class="field"><label for="p-period-en">Period (EN)</label><input id="p-period-en" v-model="editForm.period.en" class="inp" maxlength="80"></div>
        </div>
        <div class="pair">
          <div class="field"><label for="p-details-fr">Détails (FR)</label><textarea id="p-details-fr" v-model="editForm.details.fr" class="inp" rows="3" maxlength="1000"></textarea></div>
          <div class="field"><label for="p-details-en">Details (EN)</label><textarea id="p-details-en" v-model="editForm.details.en" class="inp" rows="3" maxlength="1000"></textarea></div>
        </div>
        <div class="field"><label for="p-project">Projet lié (étude de cas)</label>
          <select id="p-project" v-model="editForm.project" class="inp">
            <option :value="null">— aucun —</option>
            <option v-for="p in projects" :key="p.key" :value="p.key">{{ p.key }} — {{ p.name }}</option>
          </select>
        </div>
        <div class="field">
          <span class="lab">Justificatif (privé, jamais publié)</span>
          <div class="row">
            <span class="small muted" v-if="!editForm.justificatifId">Aucun ()</span>
            <button class="btn sec" type="button" @click="pickerOpen = true">Choisir PDF / image</button>
            <button v-if="editForm.justificatifId" class="btn ghost" type="button" @click="editForm.justificatifId = null">Retirer</button>
          </div>
          <span class="hint">Diplôme, attestation… Privé par défaut : le fichier ne devient jamais public.</span>
        </div>
      </template>

      <template v-else-if="tab === 'certification'">
        <div class="pair">
          <div class="field"><label for="c-name-fr">Nom (FR)</label><input id="c-name-fr" v-model="editForm.name.fr" class="inp" maxlength="160"></div>
          <div class="field"><label for="c-name-en">Name (EN)</label><input id="c-name-en" v-model="editForm.name.en" class="inp" maxlength="160"></div>
        </div>
        <div class="field"><label for="c-issuer">Organisme</label><input id="c-issuer" v-model="editForm.issuer" class="inp" maxlength="120"></div>
        <div class="pair">
          <div class="field"><label for="c-issued">Obtenue le</label><input id="c-issued" v-model="editForm.issuedOn" class="inp" type="date"></div>
          <div class="field"><label for="c-expires">Expire le (facultatif)</label><input id="c-expires" v-model="editForm.expiresOn" class="inp" type="date"></div>
        </div>
        <div class="field"><label for="c-url">Lien de vérification</label><input id="c-url" v-model="editForm.credentialUrl" class="inp" type="url" placeholder="https://…"></div>
      </template>

      <template v-else-if="tab === 'service'">
        <div class="pair">
          <div class="field"><label for="s-title-fr">Titre (FR)</label><input id="s-title-fr" v-model="editForm.title.fr" class="inp" maxlength="80"></div>
          <div class="field"><label for="s-title-en">Title (EN)</label><input id="s-title-en" v-model="editForm.title.en" class="inp" maxlength="80"></div>
        </div>
        <div class="pair">
          <div class="field"><label for="s-desc-fr">Description (FR)</label><textarea id="s-desc-fr" v-model="editForm.description.fr" class="inp" rows="2" maxlength="300"></textarea></div>
          <div class="field"><label for="s-desc-en">Description (EN)</label><textarea id="s-desc-en" v-model="editForm.description.en" class="inp" rows="2" maxlength="300"></textarea></div>
        </div>
        <div class="field"><span class="lab">Cas d’usage (FR, 1 par ligne)</span>
          <textarea class="inp" rows="3" :value="(editForm.cases.fr ?? []).join('\n')" @input="editForm.cases.fr = ($event.target as HTMLTextAreaElement).value.split('\n').map((x) => x.trim()).filter(Boolean)"></textarea>
        </div>
        <div class="field"><span class="lab">Use cases (EN, 1 per line)</span>
          <textarea class="inp" rows="3" :value="(editForm.cases.en ?? []).join('\n')" @input="editForm.cases.en = ($event.target as HTMLTextAreaElement).value.split('\n').map((x) => x.trim()).filter(Boolean)"></textarea>
        </div>
        <div class="pair">
          <div class="field"><label for="s-del-fr">Livrables (FR)</label><input id="s-del-fr" v-model="editForm.deliverables.fr" class="inp" maxlength="300"></div>
          <div class="field"><label for="s-del-en">Deliverables (EN)</label><input id="s-del-en" v-model="editForm.deliverables.en" class="inp" maxlength="300"></div>
        </div>
        <div class="field"><span class="lab">Projets liés (projets publiés)</span>
          <div class="row">
            <button v-for="p in projects" :key="p.key" type="button" class="tag" :aria-pressed="(editForm.projects ?? []).includes(p.key)" @click="(() => { const a = (editForm.projects ?? []) as string[]; const i = a.indexOf(p.key); i >= 0 ? a.splice(i, 1) : a.push(p.key) })()">{{ p.name }}</button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="pair">
          <div class="field"><label for="st-title-fr">Titre (FR)</label><input id="st-title-fr" v-model="editForm.title.fr" class="inp" maxlength="60"></div>
          <div class="field"><label for="st-title-en">Title (EN)</label><input id="st-title-en" v-model="editForm.title.en" class="inp" maxlength="60"></div>
        </div>
        <div class="pair">
          <div class="field"><label for="st-text-fr">Texte (FR)</label><textarea id="st-text-fr" v-model="editForm.text.fr" class="inp" rows="3" maxlength="300"></textarea></div>
          <div class="field"><label for="st-text-en">Text (EN)</label><textarea id="st-text-en" v-model="editForm.text.en" class="inp" rows="3" maxlength="300"></textarea></div>
        </div>
      </template>

      <div class="row end"><button class="btn sec" type="button" @click="closeEdit">Annuler</button><button class="btn" type="submit" :disabled="saving">Enregistrer</button></div>
    </form>
  </div>

  <MediaPicker :open="pickerOpen" kind="image" folder="divers" title="Choisir un justificatif" @close="pickerOpen = false" @select="onPick" />
</template>

<style scoped>
.grip {
  white-space: nowrap;
  color: var(--ink-muted);
}

.tag {
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  font-size: 12px;
  cursor: pointer;
}

.tag[aria-pressed='true'] {
  background: var(--ink);
  color: var(--on-ink);
  border-color: var(--ink);
}

.end {
  justify-content: flex-end;
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
  max-width: 680px;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 640px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
