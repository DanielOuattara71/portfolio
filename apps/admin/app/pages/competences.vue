<script setup lang="ts">
import type { SkillDoc } from '@portfolio/shared/content'

/**
 * Skills (docs/admin/02 §E): matrix per level, visible/ribbon switches, order,
 * computed project count, delete blocked when used, ribbon tile editor with
 * contrast ≥ 3:1. Domains (5) are edited below on the same page.
 */
useHead({ title: 'Compétences · Administration' })

const allowed = useCan()
const canWrite = computed(() => allowed('content.write'))

interface ListRow {
  id: string
  key: string
  status: string
  modified: boolean
  working: SkillDoc
  published: SkillDoc | null
  pendingFields: string[]
}
interface DomainRow {
  id: string
  key: string
  status: string
  modified: boolean
  working: { key: string; name: { fr: string; en: string }; level: string; description: { fr: string; en: string } }
  published: unknown
}

const skills = ref<ListRow[]>([])
const domains = ref<DomainRow[]>([])
const projects = ref<{ key: string; stack: string[] }[]>([])
const loading = ref(true)
const notice = ref<{ ok: boolean; text: string } | null>(null)
const busy = ref(false)

const LEVELS = ['practised', 'studied', 'exploring'] as const
const LEVEL_LABEL: Record<string, string> = { practised: 'Pratiqué', studied: 'Étudié', exploring: 'En exploration' }

async function load() {
  loading.value = true
  try {
    const [s, d, p] = await Promise.all([
      $fetch<{ items: ListRow[] }>('/api/admin/content', { query: { type: 'skill' } }),
      $fetch<{ items: DomainRow[] }>('/api/admin/content', { query: { type: 'domain' } }),
      $fetch<{ items: { key: string; working: { stack: string[] }; published: unknown }[] }>('/api/admin/content', { query: { type: 'project' } }),
    ])
    skills.value = s.items as ListRow[]
    domains.value = d.items as DomainRow[]
    // Only published projects count for the "used in N projects" chips.
    projects.value = p.items.filter((x) => !!x.published).map((x) => ({ key: x.key, stack: (x.working as unknown as { stack: string[] }).stack ?? [] }))
  } catch {
    notice.value = { ok: false, text: "Impossible de charger les compétences." }
  }
  loading.value = false
}
onMounted(load)

function countFor(key: string) {
  return projects.value.filter((p) => p.stack.includes(key)).length
}
function usersOf(key: string) {
  return projects.value.filter((p) => p.stack.includes(key)).map((p) => p.key)
}

/* Contrast (WCAG relative luminance, ≥ 3:1 for large tiles). */
function luminance(hex: string | null): number | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  const c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
function contrast(bg: string | null, fg: string | null): number | null {
  const a = luminance(bg)
  const b = luminance(fg)
  if (a === null || b === null) return null
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

const editingId = ref<string | null>(null)
const editForm = ref<SkillDoc | null>(null)
const saving = ref(false)

async function openEdit(s: ListRow) {
  editingId.value = s.id
  editForm.value = JSON.parse(JSON.stringify(s.working))
}
function closeEdit() {
  editingId.value = null
  editForm.value = null
}
async function saveEdit() {
  if (!editingId.value || !editForm.value || !canWrite.value) return
  saving.value = true
  try {
    const current = skills.value.find((x) => x.id === editingId.value)
    if (!current) return
    const res = await $fetch<{ revision: number }>('/api/admin/content/' + editingId.value + '/working', {
      method: 'PUT',
      body: { revision: (current as unknown as { revision: number }).revision ?? 1, data: editForm.value, checkpoint: true },
    })
    void res
    notice.value = { ok: true, text: 'Compétence enregistrée.' }
    closeEdit()
    await load()
  } catch (e) {
    notice.value = { ok: false, text: 'Enregistrement refusé (revise les champs).' }
  }
  saving.value = false
}

async function toggleVisible(s: ListRow) {
  if (!canWrite.value) return
  busy.value = true
  try {
    const w = JSON.parse(JSON.stringify(s.working)) as SkillDoc
    w.visible = !w.visible
    await $fetch(`/api/admin/content/${s.id}/working`, { method: 'PUT', body: { revision: (s as unknown as { revision: number }).revision ?? 1, data: w, checkpoint: false } })
    await load()
  } catch {
    notice.value = { ok: false, text: "L'opération n'a pas abouti." }
  }
  busy.value = false
}

async function createSkill() {
  busy.value = true
  try {
    const created = await $fetch<{ id: string }>('/api/admin/content', { method: 'POST', body: { type: 'skill' } })
    await load()
    const s = skills.value.find((x) => x.id === created.id)
    if (s) openEdit(s)
    notice.value = { ok: true, text: 'Nouvelle compétence créée en brouillon. Renseigne son nom puis publie.' }
  } catch {
    notice.value = { ok: false, text: "L'opération n'a pas abouti." }
  }
  busy.value = false
}

async function deleteSkill(s: ListRow) {
  if (countFor(s.key)) {
    notice.value = { ok: false, text: `Suppression refusée : utilisée par ${usersOf(s.key).join(', ')}.` }
    return
  }
  busy.value = true
  try {
    // Delete needs a fresh session (🔐): if too old the API answers 403 auth.reauth_required.
    await $fetch(`/api/admin/content/${s.id}`, { method: 'DELETE' })
    notice.value = { ok: true, text: `« ${s.working.name.fr || s.key} » supprimé.` }
    await load()
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    notice.value = { ok: false, text: code === 'auth.reauth_required' ? 'Confirme ton identité (session de moins de 10 min) pour supprimer.' : code === 'content.referenced' ? 'Suppression refusée : utilisée par un projet.' : "L'opération n'a pas abouti." }
  }
  busy.value = false
}

async function move(s: ListRow, dir: -1 | 1) {
  if (!canWrite.value) return
  const all = [...skills.value]
  const idx = all.findIndex((x) => x.id === s.id)
  const j = idx + dir
  if (j < 0 || j >= all.length) return
  const [moved] = all.splice(idx, 1)
  all.splice(j, 0, moved!)
  skills.value = all
  try {
    await $fetch('/api/admin/content/order', { method: 'PUT', body: { type: 'skill', ids: all.map((x) => x.id) } })
  } catch {
    notice.value = { ok: false, text: "Impossible d'enregistrer l'ordre." }
    await load()
  }
}

function ribbonOf(s: SkillDoc) {
  return s.ribbon
}
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Compétences</h1>
      <p class="muted">Le nombre de projets est calculé depuis les projets publiés. Supprimer une compétence utilisée est refusé.</p>
    </div>
    <button v-if="canWrite" class="btn" type="button" :disabled="busy" @click="createSkill">Nouvelle compétence</button>
  </div>

  <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>

  <div v-for="level in LEVELS" :key="level" class="panel">
    <div class="ph"><h2>{{ LEVEL_LABEL[level] }}</h2><span class="small muted">{{ skills.filter((s) => s.working.level === level).length }} compétence(s)</span></div>
    <div class="tw">
      <table>
        <thead><tr><th><span class="sr-only">Ordre</span></th><th>Nom</th><th>Projets</th><th>Ruban</th><th>Visible</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="s in skills.filter((x) => x.working.level === level)" :key="s.id">
            <td class="grip">
              <span aria-hidden="true">⋮⋮</span>
              <button class="btn ghost" type="button" :disabled="!canWrite" :aria-label="`Monter ${s.key}`" @click="move(s, -1)">↑</button>
              <button class="btn ghost" type="button" :disabled="!canWrite" :aria-label="`Descendre ${s.key}`" @click="move(s, 1)">↓</button>
            </td>
            <td><b style="font-weight: 500">{{ s.working.name.fr }} · {{ s.working.name.en }}</b><br><span class="small muted">{{ s.key }}</span></td>
            <td><span v-if="countFor(s.key)" class="chip">{{ countFor(s.key) }} projet(s)</span><span v-else class="small muted">—</span></td>
            <td><button class="switch" type="button" role="switch" :aria-checked="!!s.working.ribbon" aria-label="Dans le ruban" :disabled="!canWrite" @click="s.working.ribbon ? (s.working.ribbon = null) : (s.working.ribbon = { position: 0, label: null, path: null, bg: null, fg: null, short: s.working.name.fr.slice(0, 8) }); toggleVisible(s)"><span /></button></td>
            <td><button class="switch" type="button" role="switch" :aria-checked="s.working.visible" aria-label="Visible" :disabled="!canWrite" @click="toggleVisible(s)"><span /></button></td>
            <td>
              <span class="row">
                <button class="btn sec" type="button" @click="openEdit(s)">Modifier</button>
                <button v-if="canWrite" class="btn ghost" type="button" @click="deleteSkill(s)">Supprimer</button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <div class="ph"><h2>Domaines (5)</h2></div>
    <div class="grid g2">
      <div v-for="d in domains" :key="d.id" class="field">
        <label :for="`dom-${d.id}-fr`">{{ d.key }} — nom (FR)</label>
        <input :id="`dom-${d.id}-fr`" :value="d.working.name.fr" class="inp" @change="async (e) => {
          const w = JSON.parse(JSON.stringify(d.working))
          w.name.fr = (e.target as HTMLInputElement).value
          await $fetch(`/api/admin/content/${d.id}/working`, { method: 'PUT', body: { revision: (d as unknown as { revision: number }).revision ?? 1, data: w } })
          await load()
        }">
        <label :for="`dom-${d.id}-en`">Name (EN)</label>
        <input :id="`dom-${d.id}-en`" :value="d.working.name.en" class="inp" @change="async (e) => {
          const w = JSON.parse(JSON.stringify(d.working))
          w.name.en = (e.target as HTMLInputElement).value
          await $fetch(`/api/admin/content/${d.id}/working`, { method: 'PUT', body: { revision: (d as unknown as { revision: number }).revision ?? 1, data: w } })
          await load()
        }">
        <label :for="`dom-${d.id}-desc-fr`">Description (FR)</label>
        <textarea :id="`dom-${d.id}-desc-fr`" :value="d.working.description.fr" class="inp" rows="2" @change="async (e) => {
          const w = JSON.parse(JSON.stringify(d.working))
          w.description.fr = (e.target as HTMLTextAreaElement).value
          await $fetch(`/api/admin/content/${d.id}/working`, { method: 'PUT', body: { revision: (d as unknown as { revision: number }).revision ?? 1, data: w } })
          await load()
        }"></textarea>
        <label :for="`dom-${d.id}-desc-en`">Description (EN)</label>
        <textarea :id="`dom-${d.id}-desc-en`" :value="d.working.description.en" class="inp" rows="2" @change="async (e) => {
          const w = JSON.parse(JSON.stringify(d.working))
          w.description.en = (e.target as HTMLTextAreaElement).value
          await $fetch(`/api/admin/content/${d.id}/working`, { method: 'PUT', body: { revision: (d as unknown as { revision: number }).revision ?? 1, data: w } })
          await load()
        }"></textarea>
      </div>
    </div>
    <p class="hint">Enregistrement au changement de champ. Publie ensuite depuis le détail (via Projets → workflow générique) ou laisse les textes actuels en ligne.</p>
  </div>

  <div v-if="editingId && editForm" class="scrim" @click.self="closeEdit">
    <form class="panel modal" @submit.prevent="saveEdit">
      <div class="ph"><h2>Modifier la compétence</h2><button class="btn ghost" type="button" @click="closeEdit">Fermer</button></div>
      <div class="pair">
        <div class="field"><label for="e-name-fr">Nom (FR)</label><input id="e-name-fr" v-model="editForm.name.fr" class="inp" maxlength="80"></div>
        <div class="field"><label for="e-name-en">Name (EN)</label><input id="e-name-en" v-model="editForm.name.en" class="inp" maxlength="80"></div>
      </div>
      <div class="pair">
        <div class="field"><label for="e-level">Niveau</label>
          <select id="e-level" v-model="editForm.level" class="inp">
            <option v-for="l in LEVELS" :key="l" :value="l">{{ LEVEL_LABEL[l] }}</option>
          </select>
        </div>
        <div class="field"><span class="lab">Visible</span>
          <button class="switch" type="button" role="switch" :aria-checked="editForm.visible" aria-label="Visible" @click="editForm.visible = !editForm.visible"><span /></button>
        </div>
      </div>

      <fieldset class="fs">
        <legend>Tuile du ruban</legend>
        <button v-if="!editForm.ribbon" class="btn sec" type="button" @click="editForm.ribbon = { position: 0, label: null, path: null, bg: null, fg: null, short: null }">Ajouter une tuile</button>
        <template v-else>
          <div class="pair">
            <div class="field"><label for="r-label">Libellé (quand différent du nom)</label><input id="r-label" v-model="editForm.ribbon.label" class="inp" maxlength="40" placeholder="LLM APIs"></div>
            <div class="field"><label for="r-short">Texte court</label><input id="r-short" v-model="editForm.ribbon.short" class="inp" maxlength="16" placeholder="API REST"></div>
          </div>
          <div class="field"><label for="r-path">Tracé SVG (Simple Icons, 24×24)</label><textarea id="r-path" v-model="editForm.ribbon.path" class="inp" rows="3" placeholder="M24 4.5c0-.4-.3-.7-.7-.7h-2.3…"></textarea></div>
          <div class="pair">
            <div class="field"><label for="r-bg">Couleur de fond</label><input id="r-bg" v-model="editForm.ribbon.bg" class="inp" type="color"></div>
            <div class="field"><label for="r-fg">Couleur du logo</label><input id="r-fg" v-model="editForm.ribbon.fg" class="inp" type="color"></div>
          </div>
          <p v-if="contrast(editForm.ribbon.bg, editForm.ribbon.fg) !== null" class="small" :class="(contrast(editForm.ribbon.bg, editForm.ribbon.fg) ?? 0) >= 3 ? 'ok' : 'warn'">
            Contraste {{ (contrast(editForm.ribbon.bg, editForm.ribbon.fg) ?? 0).toFixed(1) }}:1 <template v-if="(contrast(editForm.ribbon.bg, editForm.ribbon.fg) ?? 0) < 3">· trop faible (3:1 minimum)</template>
          </p>
          <button class="btn ghost" type="button" @click="editForm.ribbon = null">Retirer la tuile</button>
        </template>
      </fieldset>

      <div class="row end"><button class="btn sec" type="button" @click="closeEdit">Annuler</button><button class="btn" type="submit" :disabled="saving">Enregistrer</button></div>
    </form>
  </div>

  <p v-if="loading" class="sk" style="height: 120px" />
</template>

<style scoped>
.sp {
  flex: 1;
}

.grip {
  white-space: nowrap;
  color: var(--ink-muted);
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
}

.fs {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: 0;
}

.fs legend {
  font-weight: 600;
  margin-bottom: 8px;
}

.ok {
  color: var(--success);
}

.warn {
  color: var(--warning);
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
  max-width: 640px;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
