<script setup lang="ts">
import type { PublishIssue, SettingsDoc } from '@portfolio/shared/content'

/**
 * Settings (docs/admin/02 §J, mockup "Paramètres"): name, initials, photo, email, social links,
 * CVs, availability. Reserved to administrators. Everything goes through draft → preview → publish,
 * like every content (docs/admin/03). The autosave writes to the server every 3 s after the last keystroke.
 */
useHead({ title: 'Paramètres · Administration' })

interface ItemView {
  id: string
  type: string
  key: string
  status: string
  modified: boolean
  revision: number
  working: SettingsDoc
  published: SettingsDoc | null
  publishedAt: string | null
  updatedAt: string
  updatedBy: string | null
  pendingFields: string[]
  issues: PublishIssue[]
}
interface VersionRow {
  number: number
  kind: 'import' | 'checkpoint' | 'published' | 'restored'
  createdAt: string
  createdBy: string | null
  id: string
}

const allowed = useCan()
const canUpdate = computed(() => allowed('settings.update'))
const me = useMe()
const auth = useAuthClient()

const view = ref<ItemView | null>(null)
const form = ref<SettingsDoc | null>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const publishing = ref(false)
const notice = ref<{ ok: boolean; text: string } | null>(null)
const lastSavedAt = ref<number | null>(null)
const nowTick = ref(Date.now())
const conflict = ref<{ server: ItemView; diff: string[] } | null>(null)

const showHistory = ref(false)
const versions = ref<VersionRow[]>([])
const versionsLoading = ref(false)
const confirmDiscard = ref(false)

const picker = ref<{ open: boolean; kind: 'image' | 'pdf'; target: 'photo' | 'cvFr' | 'cvEn' }>({ open: false, kind: 'image', target: 'photo' })

const showReauth = ref(false)
const reauthPw = ref('')
const reauthCode = ref('')
const reauthBusy = ref(false)
const reauthError = ref('')

const timezones = ['UTC', 'Africa/Abidjan', 'Europe/Paris', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney']

// Plain clones only: never structuredClone a reactive Vue object (docs/admin/09-development gotchas).
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
function stable(v: unknown): string {
  const norm = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(norm) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, norm((x as Record<string, unknown>)[k])])) : x
  return JSON.stringify(norm(v))
}
function diffKeys(a: unknown, b: unknown, prefix = ''): string[] {
  if (stable(a) === stable(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a as Record<string, unknown>), ...Object.keys(b as Record<string, unknown>)])
    return [...keys].flatMap((k) => diffKeys((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k))
  }
  return [prefix || '(document)']
}

const isDirty = computed(() => !!view.value && !!form.value && stable(form.value) !== stable(view.value.working))
const stateChip = computed(() => {
  if (!view.value) return { text: '…', cls: '' }
  if (!view.value.published) return { text: 'Brouillon', cls: 'warn' }
  if (view.value.modified) return { text: 'Publié · modifié', cls: 'info' }
  return { text: 'Publié', cls: 'ok' }
})
const savedLabel = computed(() => {
  if (!lastSavedAt.value) return 'Enregistrement…'
  const s = Math.max(0, Math.floor((nowTick.value - lastSavedAt.value) / 1000))
  if (s < 5) return "Enregistré à l'instant"
  if (s < 60) return `Enregistré il y a ${s} s`
  if (s < 3600) return `Enregistré il y a ${Math.floor(s / 60)} min`
  return `Enregistré il y a ${Math.floor(s / 3600)} h`
})

const displayText = computed(() => (form.value?.name?.trim() ? form.value!.name!.trim() : 'ONDYX'))
const displayMark = computed(() => (form.value?.initials?.trim() ? form.value!.initials!.trim() : '/'))
const displayWords = computed(() => displayText.value.split(' ').filter(Boolean))

function contentError(e: unknown): string {
  const code = (e as { data?: { code?: string } })?.data?.code
  if (code === 'content.conflict') return 'Un autre onglet a enregistré entre-temps. Recharge la copie serveur avant de continuer.'
  if (code === 'content.invalid') return 'Certaines données sont invalides (voir « Avant publication »).'
  if (code === 'permission.denied') return 'Ton rôle ne permet pas de modifier les paramètres.'
  if (code === 'auth.reauth_required') return 'Confirme ton identité pour continuer.'
  if (code === 'publish.blocked') return 'Publication impossible : corrige les points listés ci-dessous.'
  return "L'opération n'a pas abouti. Réessaie dans un instant."
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const v = await $fetch<ItemView>('/api/admin/content/by-key/settings/site')
    view.value = v
    form.value = clone(v.working)
    lastSavedAt.value = new Date(v.updatedAt).getTime()
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    loadError.value = code === 'permission.denied' ? 'Réservé à l’administrateur.' : "Impossible de charger les paramètres. Vérifie que l'API est en ligne."
    view.value = null
    form.value = null
  }
  loading.value = false
}

async function save(checkpoint: boolean) {
  if (!view.value || !form.value || saving.value || conflict.value || !canUpdate.value) return
  if (!isDirty.value) {
    if (checkpoint) notice.value = { ok: true, text: 'Aucune modification à enregistrer.' }
    return
  }
  saving.value = true
  try {
    const res = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/working`, {
      method: 'PUT',
      body: { revision: view.value.revision, data: form.value, checkpoint },
    })
    view.value = res
    lastSavedAt.value = Date.now()
    if (checkpoint) notice.value = { ok: true, text: 'Enregistré. Point de sauvegarde créé.' }
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    if (code === 'content.conflict' && view.value) {
      try {
        const server = await $fetch<ItemView>(`/api/admin/content/${view.value.id}`)
        view.value = server
        conflict.value = { server, diff: diffKeys(form.value as unknown, server.working as unknown) }
        notice.value = { ok: false, text: 'Un autre onglet a enregistré entre-temps. Rien n’a été écrasé.' }
      } catch {
        notice.value = { ok: false, text: 'Conflit d’enregistrement.' }
      }
    } else {
      const issues = (e as { data?: { issues?: PublishIssue[] } })?.data?.issues
      notice.value = { ok: false, text: issues?.length ? `Enregistrement refusé : ${issues[0]!.message}` : contentError(e) }
    }
  }
  saving.value = false
}

function reloadServer() {
  if (!conflict.value) return
  view.value = conflict.value.server
  form.value = clone(conflict.value.server.working)
  lastSavedAt.value = new Date(conflict.value.server.updatedAt).getTime()
  conflict.value = null
  notice.value = { ok: true, text: 'Copie serveur rechargée. Tes changements locaux ont été remplacés.' }
}

function siteLabel(v: string) {
  return v === 'ok' ? 'Site mis à jour.' : v === 'failed' ? 'Publié. Rafraîchissement sous 60 s.' : 'Publié. Rafraîchissement sous 60 s.'
}

async function doPublish() {
  if (!view.value || !form.value || publishing.value) return
  if (!canUpdate.value) return
  if (isDirty.value) {
    await save(false)
    if (conflict.value) return
  }
  publishing.value = true
  try {
    const res = await $fetch<{ item: ItemView; version: number; siteRefreshed: 'ok' | 'not_configured' | 'failed' }>(`/api/admin/content/${view.value.id}/publish`, {
      method: 'POST',
      body: { revision: view.value.revision },
    })
    view.value = res.item
    lastSavedAt.value = Date.now()
    notice.value = { ok: true, text: `Publié (version ${res.version}). ${siteLabel(res.siteRefreshed)}` }
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    if (code === 'auth.reauth_required') {
      showReauth.value = true
      reauthError.value = ''
      reauthPw.value = ''
      reauthCode.value = ''
    } else if (code === 'publish.blocked') {
      const issues = (e as { data?: { issues?: PublishIssue[] } })?.data?.issues
      if (issues && view.value) view.value = { ...view.value, issues }
      notice.value = { ok: false, text: 'Publication impossible : corrige les points listés ci-dessous.' }
    } else if (code === 'content.conflict' && view.value) {
      try {
        const server = await $fetch<ItemView>(`/api/admin/content/${view.value.id}`)
        view.value = server
        conflict.value = { server, diff: diffKeys(form.value as unknown, server.working as unknown) }
      } catch {
        /* keep local notice below */
      }
      notice.value = { ok: false, text: 'Un autre onglet a enregistré entre-temps. Recharge la copie serveur.' }
    } else {
      notice.value = { ok: false, text: contentError(e) }
    }
  }
  publishing.value = false
}

async function doDiscard() {
  if (!view.value) return
  confirmDiscard.value = false
  try {
    const res = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/discard`, { method: 'POST' })
    view.value = res
    form.value = clone(res.working)
    lastSavedAt.value = Date.now()
    notice.value = { ok: true, text: 'Modifications abandonnées. La copie de travail est identique à la version publiée.' }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}

async function openHistory() {
  if (!view.value) return
  showHistory.value = true
  versionsLoading.value = true
  try {
    const res = await $fetch<{ versions: VersionRow[] }>(`/api/admin/content/${view.value.id}/versions`)
    versions.value = res.versions
  } catch {
    notice.value = { ok: false, text: "Impossible de charger l'historique." }
  }
  versionsLoading.value = false
}

async function doRestore(n: number) {
  if (!view.value) return
  try {
    const res = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/versions/${n}/restore`, { method: 'POST' })
    view.value = res
    form.value = clone(res.working)
    lastSavedAt.value = Date.now()
    showHistory.value = false
    notice.value = { ok: true, text: `Version ${n} restaurée en copie de travail. Rien n'est publié.` }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}

async function submitReauth() {
  if (!me.value) return
  reauthBusy.value = true
  reauthError.value = ''
  try {
    const { data, error: err } = await auth.signIn.email({ email: me.value.user.email, password: reauthPw.value })
    if (err) {
      reauthError.value = authErrorMessage(err)
      return
    }
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      const { error: err2 } = await auth.twoFactor.verifyTotp({ code: reauthCode.value.replace(/\s/g, '') })
      if (err2) {
        reauthError.value = authErrorMessage(err2)
        reauthCode.value = ''
        return
      }
    }
    await loadMe(true)
    showReauth.value = false
    reauthPw.value = ''
    reauthCode.value = ''
    notice.value = { ok: true, text: 'Identité confirmée. Publication…' }
    await doPublish()
  } finally {
    reauthBusy.value = false
  }
}

function openPicker(kind: 'image' | 'pdf', target: 'photo' | 'cvFr' | 'cvEn') {
  picker.value = { open: true, kind, target }
}
function onPick(id: string) {
  if (!form.value) return
  if (picker.value.target === 'photo') form.value.photoId = id
  else if (picker.value.target === 'cvFr') form.value.cv.fr = id
  else form.value.cv.en = id
  picker.value.open = false
}

function addLink() {
  if (!form.value || form.value.links.length >= 8) return
  form.value.links.push({ label: '', href: 'https://' })
}
function removeLink(i: number) {
  form.value?.links.splice(i, 1)
}
function moveLink(i: number, dir: -1 | 1) {
  const links = form.value?.links
  if (!links) return
  const j = i + dir
  if (j < 0 || j >= links.length) return
  const [moved] = links.splice(i, 1)
  links.splice(j, 0, moved!)
}

function fieldId(path: string): string {
  if (path === 'name') return 'f-name'
  if (path === 'initials') return 'f-initials'
  if (path === 'email') return 'f-email'
  if (path === 'photoId') return 'f-photo'
  if (path.startsWith('links.')) {
    const parts = path.split('.')
    return `link-${parts[1]}-${parts[2] ?? 'href'}`
  }
  if (path === 'availability') return 'f-av-fr'
  if (path.startsWith('availability.')) return path.endsWith('.fr') ? 'f-av-fr' : 'f-av-en'
  if (path === 'cv.fr') return 'f-cv-fr'
  if (path === 'cv.en') return 'f-cv-en'
  if (path === 'timezone') return 'f-timezone'
  if (path === 'city') return 'f-city'
  return ''
}
function focusField(path: string) {
  const id = fieldId(path)
  if (!id) return
  const el = document.getElementById(id)
  el?.focus()
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

let tickTimer: ReturnType<typeof setInterval> | undefined
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  load()
  tickTimer = setInterval(() => (nowTick.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  clearInterval(tickTimer)
  clearTimeout(autosaveTimer)
})
watch(form, () => {
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => save(false), 3000)
}, { deep: true })

function onSaveKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save(true)
  }
}
</script>

<template>
  <div class="head">
    <div class="t">
      <div class="row">
        <h1>Paramètres</h1>
        <span v-if="view" class="chip" :class="stateChip.cls">{{ stateChip.text }}</span>
      </div>
      <p class="muted">Réservé à l'administrateur. Les changements passent par la publication.</p>
    </div>
    <div class="row" @keydown="onSaveKey">
      <span class="small muted" role="status">{{ saving ? 'Enregistrement…' : savedLabel }}</span>
      <button class="btn sec" type="button" :disabled="saving || !canUpdate" @click="save(true)">Enregistrer</button>
      <button class="btn sec" type="button" :disabled="!canUpdate || !view?.published" @click="confirmDiscard = true">Abandonner</button>
      <button class="btn sec" type="button" @click="openHistory">Historique</button>
      <button class="btn" type="button" :disabled="publishing || !canUpdate" @click="doPublish">{{ publishing ? 'Publication…' : 'Publier' }}</button>
    </div>
  </div>

  <p v-if="loading" class="sk" style="height: 320px" />
  <p v-else-if="loadError" class="alert crit" role="alert">{{ loadError }}</p>

  <template v-else-if="view && form">
    <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>
    <p v-if="!canUpdate" class="alert warn">Lecture seule : les paramètres sont réservés à l’administrateur.</p>

    <div v-if="conflict" class="alert crit" role="alert">
      <div class="row"><b>Conflit d’enregistrement.</b><span>Quelqu’un a enregistré une autre copie entre-temps. Rien n’a été écrasé.</span></div>
      <ul class="list" style="margin-top: 8px">
        <li v-for="d in conflict.diff" :key="d"><span class="sev warn" /><span><code>{{ d }}</code></span><span class="small muted">diffère</span></li>
      </ul>
      <div class="row" style="margin-top: 10px">
        <button class="btn sec" type="button" @click="reloadServer">Recharger la copie serveur</button>
        <span class="small muted">Ta copie locale reste affichée jusqu’au rechargement.</span>
      </div>
    </div>

    <div v-if="confirmDiscard" class="alert warn confirm" role="alertdialog" aria-labelledby="discard-t">
      <span id="discard-t">Abandonner les modifications ? La copie de travail redevient identique à la version publiée.</span>
      <span class="row"><button class="btn sec" type="button" @click="confirmDiscard = false">Annuler</button><button class="btn danger" type="button" @click="doDiscard">Abandonner</button></span>
    </div>

    <fieldset :disabled="!canUpdate" class="fs">
      <div class="grid g2">
        <section class="panel" aria-labelledby="p-identity">
          <h2 id="p-identity">Identité</h2>
          <div class="field">
            <label for="f-name">Nom affiché</label>
            <input id="f-name" v-model="form.name" class="inp" placeholder="Prénom Nom" maxlength="120">
            <span class="hint">Vide : le site affiche « ONDYX » à la place.</span>
          </div>
          <div class="field">
            <label for="f-initials">Initiales</label>
            <input id="f-initials" v-model="form.initials" class="inp" placeholder="2 ou 3 lettres" maxlength="3">
            <span class="hint">1 à 3 majuscules. Vide : le logo affiche « / ».</span>
          </div>
          <div class="field">
            <span class="lab" id="f-photo">Photo de profil</span>
            <div class="row">
              <img v-if="form.photoId" :src="previewUrl(form.photoId)" alt="" class="prev">
              <span v-else class="avatar" aria-hidden="true">?</span>
              <button class="btn sec" type="button" @click="openPicker('image', 'photo')">Choisir dans la médiathèque</button>
              <button v-if="form.photoId" class="btn ghost" type="button" @click="form.photoId = null">Retirer</button>
            </div>
            <span class="hint">Texte alternatif FR et EN obligatoire pour publier (Médiathèque).</span>
          </div>
        </section>

        <section class="panel" aria-labelledby="p-contact">
          <h2 id="p-contact">Contact</h2>
          <div class="field">
            <label for="f-email">Email professionnel</label>
            <input id="f-email" v-model="form.email" class="inp" type="email" placeholder="nom@domaine.com" maxlength="254">
            <span class="hint">Affiché sur le site et utilisé pour les notifications.</span>
          </div>
          <div class="field">
            <span class="lab">Réseaux ({{ form.links.length }}/8)</span>
            <div v-if="!form.links.length" class="small muted">Aucun réseau pour le moment.</div>
            <div v-for="(l, i) in form.links" :key="i" class="linkrow">
              <label class="sr-only" :for="`link-${i}-label`">Libellé du réseau {{ i + 1 }}</label>
              <input :id="`link-${i}-label`" v-model="l.label" class="inp" placeholder="LinkedIn, GitHub…" maxlength="40">
              <label class="sr-only" :for="`link-${i}-href`">Adresse du réseau {{ i + 1 }}</label>
              <input :id="`link-${i}-href`" v-model="l.href" class="inp" type="url" placeholder="https://…" maxlength="500">
              <span class="row act">
                <button class="btn ghost" type="button" :disabled="i === 0" :aria-label="`Monter le réseau ${i + 1}`" @click="moveLink(i, -1)">↑</button>
                <button class="btn ghost" type="button" :disabled="i === form.links.length - 1" :aria-label="`Descendre le réseau ${i + 1}`" @click="moveLink(i, 1)">↓</button>
                <button class="btn ghost" type="button" :aria-label="`Retirer le réseau ${i + 1}`" @click="removeLink(i)">✕</button>
              </span>
            </div>
            <div><button class="btn ghost" type="button" :disabled="form.links.length >= 8" @click="addLink">+ Ajouter un réseau</button></div>
            <span class="hint">Libellé + adresse https pour chaque réseau. L'ordre est celui du site.</span>
          </div>
          <div class="row between">
            <span>Formulaire de contact ouvert</span>
            <button class="switch" type="button" role="switch" :aria-checked="form.contactOpen" aria-label="Formulaire ouvert" @click="form.contactOpen = !form.contactOpen"><span /></button>
          </div>
        </section>

        <section class="panel" aria-labelledby="p-cv">
          <h2 id="p-cv">CV</h2>
          <div class="grid g2">
            <div class="field">
              <span class="lab" id="f-cv-fr">CV français</span>
              <div class="row">
                <span class="small muted" v-if="!form.cv.fr">Aucun</span>
                <a v-else class="btn sec" :href="previewUrl(form.cv.fr)" target="_blank" rel="noopener">Ouvrir le PDF</a>
                <button class="btn sec" type="button" @click="openPicker('pdf', 'cvFr')">Choisir un PDF</button>
                <button v-if="form.cv.fr" class="btn ghost" type="button" @click="form.cv.fr = null">Retirer</button>
              </div>
            </div>
            <div class="field">
              <span class="lab" id="f-cv-en">CV anglais</span>
              <div class="row">
                <span class="small muted" v-if="!form.cv.en">Aucun</span>
                <a v-else class="btn sec" :href="previewUrl(form.cv.en)" target="_blank" rel="noopener">Ouvrir le PDF</a>
                <button class="btn sec" type="button" @click="openPicker('pdf', 'cvEn')">Choisir un PDF</button>
                <button v-if="form.cv.en" class="btn ghost" type="button" @click="form.cv.en = null">Retirer</button>
              </div>
            </div>
          </div>
          <span class="hint">Servi à /fr/cv et /en/cv. Un PDF par langue.</span>
        </section>

        <section class="panel" aria-labelledby="p-avail">
          <h2 id="p-avail">Disponibilité</h2>
          <div class="row between">
            <span>Disponible pour de nouveaux projets</span>
            <button class="switch" type="button" role="switch" :aria-checked="form.available" aria-label="Disponible" @click="form.available = !form.available"><span /></button>
          </div>
          <div class="grid g2">
            <div class="field">
              <label for="f-av-fr">Texte FR</label>
              <input id="f-av-fr" v-model="form.availability.fr" class="inp" placeholder="Disponible · télétravail" maxlength="80">
            </div>
            <div class="field">
              <label for="f-av-en">Text EN</label>
              <input id="f-av-en" v-model="form.availability.en" class="inp" placeholder="Available · remote" maxlength="80">
            </div>
          </div>
          <div class="grid g2">
            <div class="field">
              <label for="f-timezone">Fuseau horaire</label>
              <select id="f-timezone" v-model="form.timezone" class="inp">
                <option :value="null">— non renseigné —</option>
                <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
              </select>
            </div>
            <div class="field">
              <label for="f-city">Ville</label>
              <input id="f-city" v-model="form.city" class="inp" maxlength="80" placeholder="Abidjan, Paris…">
            </div>
          </div>
          <span class="hint">La langue par défaut n’apparaît pas ici : elle est définie dans le code du site (redirection « / ») et ne s’applique pas encore dynamiquement.</span>
        </section>
      </div>
    </fieldset>

    <div class="grid g2">
      <section class="panel" aria-labelledby="p-next">
        <div class="ph"><h2 id="p-next">Avant publication</h2><span class="chip" :class="view.issues.length ? 'crit' : 'ok'">{{ view.issues.length ? `${view.issues.length} point${view.issues.length > 1 ? 's' : ''}` : 'prêt' }}</span></div>
        <p v-if="!view.issues.length" class="small muted">Aucun blocage. Tu peux publier.</p>
        <ul v-else class="list">
          <li v-for="(issue, i) in view.issues" :key="`${issue.path}-${i}`">
            <span class="sev crit" />
            <button class="linklike" type="button" @click="focusField(issue.path)">{{ issue.message }}</button>
            <code class="small muted">{{ issue.path }}</code>
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="p-preview">
        <div class="ph"><h2 id="p-preview">Aperçu local</h2></div>
        <p class="small muted">Aperçu instantané (non publié). L’aperçu sur le site arrive avec les Projets.</p>
        <div class="prevbox">
          <span class="mk" aria-hidden="true">{{ displayMark }}</span>
          <span class="logotext">{{ displayText }}</span>
        </div>
        <p class="hero-name" aria-hidden="true"><span class="outline-text">{{ displayWords[0] ?? '' }}</span> {{ displayWords.slice(1).join(' ') }}</p>
        <p class="small muted">Logo · grand nom du Hero · signature du pied de page. Vide = « ONDYX », « / ».</p>
      </section>
    </div>
  </template>

  <MediaPicker :open="picker.open" :kind="picker.kind" title="Choisir dans la médiathèque" @close="picker.open = false" @select="onPick" />

  <div v-if="showHistory" class="scrim" @click.self="showHistory = false">
    <div class="panel modal" role="dialog" aria-modal="true" aria-label="Historique">
      <div class="ph"><h2>Historique</h2><button class="btn ghost" type="button" @click="showHistory = false">Fermer</button></div>
      <p v-if="versionsLoading" class="small muted">Chargement…</p>
      <ul v-else class="list">
        <li v-for="v in versions" :key="v.number">
          <span class="sev" :class="v.kind === 'published' ? 'ok' : ''" />
          <span><b>Version {{ v.number }}</b> · {{ { import: 'import', checkpoint: 'point de sauvegarde', published: 'publiée', restored: 'restaurée' }[v.kind] }}<br><span class="small muted">{{ new Date(v.createdAt).toLocaleString('fr-FR') }}</span></span>
          <button class="btn sec" type="button" @click="doRestore(v.number)">Restaurer</button>
        </li>
      </ul>
      <p class="small muted">Restaurer crée une copie de travail. Rien n’est publié.</p>
    </div>
  </div>

  <div v-if="showReauth" class="scrim" @click.self="showReauth = false">
    <form class="panel modal" role="dialog" aria-modal="true" aria-labelledby="ra-t" @submit.prevent="submitReauth">
      <h2 id="ra-t">Confirme ton identité</h2>
      <p class="small">Modifier les paramètres demande une connexion de moins de 10 min.</p>
      <p v-if="reauthError" class="alert crit" role="alert">{{ reauthError }}</p>
      <div class="field">
        <label for="ra-pass">Mot de passe</label>
        <input id="ra-pass" v-model="reauthPw" class="inp" type="password" autocomplete="current-password" required autofocus>
      </div>
      <div class="field">
        <label for="ra-code">Code à 6 chiffres</label>
        <input id="ra-code" v-model="reauthCode" class="inp code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
      </div>
      <div class="row end">
        <button class="btn sec" type="button" @click="showReauth = false">Annuler</button>
        <button class="btn" type="submit" :disabled="reauthBusy || !reauthPw || reauthCode.length < 6">{{ reauthBusy ? 'Vérification…' : 'Confirmer et publier' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fs {
  display: grid;
  margin: 0;
  padding: 0;
  border: 0;
}

.between {
  justify-content: space-between;
}

.end {
  justify-content: flex-end;
}

.confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.linkrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  gap: 8px;
  align-items: start;
}

.linkrow .act {
  gap: 0;
}

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-sunken);
  color: var(--ink-muted);
  font-size: 20px;
}

.prev {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-sunken);
}

.switch {
  position: relative;
  flex: none;
  width: 44px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-sunken);
  cursor: pointer;
}

.switch span {
  position: absolute;
  top: 3px;
  left: 3px;
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
  transform: translateX(20px);
  background: var(--on-ink);
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

.prevbox {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mk {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--marker);
  color: var(--on-marker);
  font: 700 11px/1 var(--font-data);
  box-shadow: inset 0 0 0 1.5px var(--on-marker);
}

.logotext {
  font-weight: 600;
}

.hero-name {
  font: 800 clamp(22px, 3vw, 32px) / 1 var(--admin-font-display, var(--font-display));
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

.code {
  font-size: 18px;
  letter-spacing: 0.3em;
  text-align: center;
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
</style>
