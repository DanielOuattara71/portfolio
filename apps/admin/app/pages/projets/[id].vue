<script setup lang="ts">
import type { ProjectDoc, PublishIssue } from '@portfolio/shared/content'

/**
 * Project form (docs/admin/07 mockup "Projet"): tabs General / Case study / Media / Links / SEO / History.
 * FR | EN side by side, completeness per language, "Before publication" list on the right,
 * sensitive zone (unpublish / archive / delete). Autosave 3 s, 409 without overwrite.
 */
useHead({ title: 'Projet · Administration' })

interface ItemView {
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
  issues: PublishIssue[]
}
interface VersionRow {
  number: number
  kind: 'import' | 'checkpoint' | 'published' | 'restored'
  createdAt: string
  createdBy: string | null
  id: string
}
interface DiffRow {
  path: string
  from: unknown
  to: unknown
}

const route = useRoute()
const id = computed(() => String(route.params.id))
const allowed = useCan()
const canWrite = computed(() => allowed('content.write'))
const canSubmit = computed(() => allowed('content.submit'))
const canPublish = computed(() => allowed('content.publish'))
const canDelete = computed(() => allowed('content.delete'))
const me = useMe()
const auth = useAuthClient()
const config = useRuntimeConfig()

const view = ref<ItemView | null>(null)
const form = ref<ProjectDoc | null>(null)
const loading = ref(true)
const loadError = ref('')
const tab = ref<'general' | 'cas' | 'medias' | 'liens' | 'seo' | 'historique'>('general')
const saving = ref(false)
const publishing = ref(false)
const notice = ref<{ ok: boolean; text: string } | null>(null)
const lastSavedAt = ref<number | null>(null)
const nowTick = ref(Date.now())
const conflict = ref<{ server: ItemView; diff: string[] } | null>(null)
const confirmDiscard = ref(false)

const skills = ref<{ key: string; name: string }[]>([])
const skillsLoading = ref(false)

const picker = ref<{ open: boolean; kind: 'image'; target: 'cover' | 'seo' | `gal:${number}` }>({ open: false, kind: 'image', target: 'cover' })

const versions = ref<VersionRow[]>([])
const versionsLoading = ref(false)
const diffFrom = ref('working')
const diffTo = ref('published')
const diffRows = ref<DiffRow[]>([])
const diffLoading = ref(false)
const diffSearched = ref(false)

const showReauth = ref(false)
const reauthPw = ref('')
const reauthCode = ref('')
const reauthBusy = ref(false)
const reauthError = ref('')
const pendingDelete = ref(false)

const showUnpublish = ref(false)
const showArchive = ref(false)
const deleteName = ref('')
const deleting = ref(false)

const contexts = ['client', 'internship', 'academic', 'personal', 'this_site'] as const
const contextLabels: Record<string, string> = { client: 'projet client', internship: 'stage', academic: 'travaux pratiques', personal: 'projet personnel', this_site: 'ce site · en cours' }
const domainsList = ['web', 'mobile', 'data', 'cloud', 'ai'] as const
const linkKinds = ['demo', 'code', 'store', 'doc'] as const
const linkLabels: Record<string, string> = { demo: 'Voir le site', code: 'Code source', store: 'Télécharger l’app', doc: 'Documentation' }

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
  if (view.value.status === 'archived') return { text: 'Archivé', cls: '' }
  if (view.value.status === 'in_review') return { text: 'En révision', cls: 'info' }
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

const pendingSet = computed(() => new Set(view.value?.pendingFields ?? []))
const isPending = (path: string) => pendingSet.value.has(path)

function missingFor(lc: 'fr' | 'en'): string[] {
  if (!form.value) return []
  const f = form.value
  const miss: string[] = []
  if (!f.name[lc].trim()) miss.push('nom')
  if (!f.slug[lc].trim()) miss.push('adresse')
  if (!f.kind[lc].trim()) miss.push('type')
  if (!f.tagline[lc].trim()) miss.push('accroche')
  if (!f.summary[lc].trim()) miss.push('description')
  return miss
}
const completeness = computed(() => {
  const fr = missingFor('fr')
  const en = missingFor('en')
  return `FR ${fr.length ? `${fr.length} manquant(s)` : 'complet'} · EN ${en.length ? `${en.length} manquant(s)` : 'complet'}`
})

function contentError(e: unknown): string {
  const code = (e as { data?: { code?: string } })?.data?.code
  if (code === 'content.conflict') return 'Un autre onglet a enregistré entre-temps. Recharge la copie serveur avant de continuer.'
  if (code === 'content.invalid') return 'Certaines données sont invalides (voir « Avant publication »).'
  if (code === 'permission.denied') return 'Ton rôle ne permet pas cette action.'
  if (code === 'auth.reauth_required') return 'Confirme ton identité pour continuer.'
  if (code === 'publish.blocked') return 'Publication impossible : corrige les points listés ci-dessous.'
  if (code === 'content.published_not_archived') return 'Archive d’abord ce projet avant de le supprimer.'
  if (code === 'content.referenced') return 'Ce projet est lié depuis un service ou une expérience.'
  return "L'opération n'a pas abouti. Réessaie dans un instant."
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const v = await $fetch<ItemView>(`/api/admin/content/${id.value}`)
    view.value = v
    form.value = clone(v.working)
    lastSavedAt.value = new Date(v.updatedAt).getTime()
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    loadError.value = code === 'content.not_found' ? 'Projet introuvable.' : code === 'permission.denied' ? 'Lecture seule.' : "Impossible de charger le projet. Vérifie que l'API est en ligne."
  }
  loading.value = false
}

async function loadSkills() {
  skillsLoading.value = true
  try {
    const res = await $fetch<{ items: { key: string; working: { name: { fr: string; en: string } } }[] }>('/api/admin/content', { query: { type: 'skill' } })
    skills.value = res.items.map((s) => ({ key: s.key, name: s.working.name.fr || s.working.name.en || s.key }))
  } catch {
    skills.value = []
  }
  skillsLoading.value = false
}

async function save(checkpoint: boolean) {
  if (!view.value || !form.value || saving.value || conflict.value || !canWrite.value) return
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
  return v === 'ok' ? 'Site mis à jour.' : 'Publié. Rafraîchissement sous 60 s.'
}

async function doPublish() {
  if (!view.value || !form.value || publishing.value) return
  if (isDirty.value) {
    await save(false)
    if (conflict.value) return
  }
  publishing.value = true
  try {
    const r = await $fetch<{ item: ItemView; version: number; siteRefreshed: string }>(`/api/admin/content/${view.value.id}/publish`, {
      method: 'POST',
      body: { revision: view.value.revision },
    })
    view.value = r.item
    lastSavedAt.value = Date.now()
    notice.value = { ok: true, text: `Publié (version ${r.version}). ${siteLabel(r.siteRefreshed)}` }
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    if (code === 'publish.blocked') {
      const issues = (e as { data?: { issues?: PublishIssue[] } })?.data?.issues
      if (issues && view.value) view.value = { ...view.value, issues }
      notice.value = { ok: false, text: 'Publication impossible : corrige les points listés ci-dessous.' }
    } else if (code === 'content.conflict' && view.value) {
      try {
        const server = await $fetch<ItemView>(`/api/admin/content/${view.value.id}`)
        view.value = server
        conflict.value = { server, diff: diffKeys(form.value as unknown, server.working as unknown) }
      } catch {
        /* ignore */
      }
      notice.value = { ok: false, text: 'Un autre onglet a enregistré entre-temps. Recharge la copie serveur.' }
    } else {
      notice.value = { ok: false, text: contentError(e) }
    }
  }
  publishing.value = false
}

async function doSubmit() {
  if (!view.value) return
  try {
    const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/submit`, { method: 'POST' })
    view.value = v
    notice.value = { ok: true, text: 'Soumis en révision.' }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}

async function doDiscard() {
  if (!view.value) return
  confirmDiscard.value = false
  try {
    const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/discard`, { method: 'POST' })
    view.value = v
    form.value = clone(v.working)
    lastSavedAt.value = Date.now()
    notice.value = { ok: true, text: 'Modifications abandonnées.' }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}

async function doUnpublish() {
  if (!view.value) return
  showUnpublish.value = false
  try {
    const r = await $fetch<{ item: ItemView; siteRefreshed: string }>(`/api/admin/content/${view.value.id}/unpublish`, { method: 'POST' })
    view.value = r.item
    form.value = clone(r.item.working)
    notice.value = { ok: true, text: `Dépublié. ${siteLabel(r.siteRefreshed)} Adresse en 404.` }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}
async function doArchive() {
  if (!view.value) return
  showArchive.value = false
  try {
    const r = await $fetch<{ item: ItemView; siteRefreshed: string }>(`/api/admin/content/${view.value.id}/archive`, { method: 'POST' })
    view.value = r.item
    form.value = clone(r.item.working)
    notice.value = { ok: true, text: `Archivé. ${siteLabel(r.siteRefreshed)}` }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}
async function doUnarchive() {
  if (!view.value) return
  try {
    const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/unarchive`, { method: 'POST' })
    view.value = v
    form.value = clone(v.working)
    notice.value = { ok: true, text: 'Restauré en brouillon.' }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}
async function doDelete() {
  if (!view.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/content/${view.value.id}`, { method: 'DELETE' })
    await navigateTo('/projets')
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    deleting.value = false
    if (code === 'auth.reauth_required') {
      pendingDelete.value = true
      showReauth.value = true
      reauthError.value = ''
      reauthPw.value = ''
      reauthCode.value = ''
    } else {
      notice.value = { ok: false, text: contentError(e) }
    }
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
    if (pendingDelete.value) {
      pendingDelete.value = false
      await doDelete()
    } else {
      await doPublish()
    }
  } finally {
    reauthBusy.value = false
  }
}

async function loadVersions() {
  if (!view.value) return
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
    const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/versions/${n}/restore`, { method: 'POST' })
    view.value = v
    form.value = clone(v.working)
    notice.value = { ok: true, text: `Version ${n} restaurée en copie de travail. Rien n'est publié.` }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}
async function runDiff() {
  if (!view.value) return
  diffLoading.value = true
  try {
    const r = await $fetch<{ from: string; to: string; differences: DiffRow[] }>(`/api/admin/content/${view.value.id}/diff`, {
      query: { from: diffFrom.value, to: diffTo.value },
    })
    diffRows.value = r.differences
    diffSearched.value = true
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
  diffLoading.value = false
}
async function openPreview(lc: 'fr' | 'en') {
  if (!view.value || !form.value) return
  if (isDirty.value) {
    await save(false)
    if (conflict.value) return
  }
  try {
    const r = await $fetch<{ token: string }>(`/api/admin/content/${view.value.id}/preview-token`, { method: 'POST' })
    const slug = form.value.slug[lc]
    if (!slug) {
      notice.value = { ok: false, text: `Renseigne l’adresse ${lc.toUpperCase()} avant de prévisualiser.` }
      return
    }
    const base = String(config.public.siteUrl ?? 'http://localhost:3000').replace(/\/$/, '')
    const path = lc === 'fr' ? `/fr/projets/${slug}` : `/en/projects/${slug}`
    window.open(`${base}${path}?apercu=${encodeURIComponent(r.token)}`, '_blank', 'noopener')
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}
async function confirmPending(path: string) {
  if (!view.value) return
  try {
    const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/confirm-field`, { method: 'POST', body: { path } })
    view.value = v
    notice.value = { ok: true, text: `« ${path} » confirmé.` }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}

function openPicker(target: 'cover' | 'seo' | `gal:${number}`) {
  picker.value = { open: true, kind: 'image', target }
}
function onPick(mediaId: string) {
  if (!form.value) return
  const t = picker.value.target
  if (t === 'cover') form.value.coverId = mediaId
  else if (t === 'seo') form.value.seo.imageId = mediaId
  else {
    const i = Number(String(t).split(':')[1])
    if (form.value.gallery[i]) form.value.gallery[i].mediaId = mediaId
  }
  picker.value.open = false
}

/* Links */
function addLink() {
  if (!form.value || form.value.links.length >= 6) return
  form.value.links.push({ kind: 'demo', href: 'https://' })
}
function removeLink(i: number) {
  form.value?.links.splice(i, 1)
}
/* Gallery */
function addGallery() {
  if (!form.value || form.value.gallery.length >= 24) return
  form.value.gallery.push({ mediaId: '', caption: { fr: null, en: null } } as never)
}
function removeGallery(i: number) {
  form.value?.gallery.splice(i, 1)
}
function moveGallery(i: number, dir: -1 | 1) {
  const g = form.value?.gallery
  if (!g) return
  const j = i + dir
  if (j < 0 || j >= g.length) return
  const [moved] = g.splice(i, 1)
  g.splice(j, 0, moved!)
}
/* TechRoles */
function addTechRole() {
  if (!form.value?.caseStudy.techRoles) form.value!.caseStudy.techRoles = []
  form.value!.caseStudy.techRoles!.push({ tech: '', role: { fr: '', en: '' } })
}
function removeTechRole(i: number) {
  form.value?.caseStudy.techRoles?.splice(i, 1)
}
function toggleSkill(key: string) {
  if (!form.value) return
  const i = form.value.stack.indexOf(key)
  if (i >= 0) form.value.stack.splice(i, 1)
  else form.value.stack.push(key)
}
function toggleDomain(d: string) {
  if (!form.value) return
  const i = form.value.domains.indexOf(d as never)
  if (i >= 0) form.value.domains.splice(i, 1)
  else form.value.domains.push(d as never)
}
async function toggleFeatured() {
  if (!view.value) return
  try {
    const r = await $fetch<{ item: ItemView }>(`/api/admin/content/${view.value.id}/featured`, { method: 'PATCH', body: { featured: !view.value.featured } })
    view.value = r.item
    notice.value = { ok: true, text: r.item.featured ? 'Affiché sur l’accueil.' : 'Retiré de l’accueil.' }
  } catch (e) {
    notice.value = { ok: false, text: contentError(e) }
  }
}

/* List <-> textarea helpers (one value per line / paragraph per blank line) */
const toLines = (v: string[] | null) => (v ?? []).join('\n')
const fromLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)
const toParas = (v: string[] | null) => (v ?? []).join('\n\n')
const fromParas = (s: string) => s.split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean)
type CsTextField = 'context' | 'problem' | 'architectureNote'
type CsListField = 'goals' | 'solution' | 'challenges' | 'results'
function setCsText(field: CsTextField, lc: 'fr' | 'en', value: string) {
  if (!form.value) return
  if (!form.value.caseStudy[field]) (form.value.caseStudy as Record<string, unknown>)[field] = { fr: '', en: '' }
  ;(form.value.caseStudy[field] as { fr: string; en: string })[lc] = value
}
function setCsList(field: CsListField, lc: 'fr' | 'en', value: string[]) {
  if (!form.value) return
  if (!form.value.caseStudy[field]) (form.value.caseStudy as Record<string, unknown>)[field] = { fr: [], en: [] }
  ;(form.value.caseStudy[field] as { fr: string[]; en: string[] })[lc] = value
}
function csText(field: CsTextField, lc: 'fr' | 'en'): string {
  return form.value?.caseStudy[field]?.[lc] ?? ''
}
function csList(field: CsListField, lc: 'fr' | 'en'): string[] | null {
  return form.value?.caseStudy[field]?.[lc] ?? null
}

function fieldId(path: string): string {
  if (path.startsWith('name.')) return `f-name-${path.split('.')[1]}`
  if (path.startsWith('slug.')) return `f-slug-${path.split('.')[1]}`
  if (path.startsWith('kind.')) return `f-kind-${path.split('.')[1]}`
  if (path.startsWith('tagline.')) return `f-tag-${path.split('.')[1]}`
  if (path.startsWith('summary.')) return `f-sum-${path.split('.')[1]}`
  if (path.startsWith('role.')) return `f-role-${path.split('.')[1]}`
  if (path === 'context' || path === 'domains') return 'f-context'
  if (path === 'links') return 'f-links'
  if (path.startsWith('links.')) return `link-${path.split('.')[1]}-href`
  if (path.startsWith('stack')) return 'f-stack'
  if (path === 'coverId') return 'f-cover'
  if (path.startsWith('gallery')) return 'f-gallery'
  if (path.startsWith('caseStudy.')) return `f-cs-${path.split('.')[1]}`
  if (path.startsWith('seo.')) return `f-seo-${path.split('.')[1]}`
  if (path === 'period') return 'f-period'
  return ''
}
function focusField(path: string) {
  const el = document.getElementById(fieldId(path))
  el?.focus()
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

let tickTimer: ReturnType<typeof setInterval> | undefined
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  load()
  loadSkills()
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
watch(tab, (t) => {
  if (t === 'historique' && !versions.value.length) loadVersions()
})
function onSaveKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save(true)
  }
}
const versionKindLabel: Record<string, string> = { import: 'import', checkpoint: 'point de sauvegarde', published: 'publiée', restored: 'restaurée' }
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const sideOptions = computed(() => ['working', 'published', ...versions.value.map((v) => `v${v.number}`)])
const seoPreview = computed(() => {
  if (!form.value) return null
  const lc = 'fr' as const
  return {
    title: form.value.seo.title[lc] || `${form.value.name.fr || 'Projet'} · Étude de cas · ONDYX`,
    desc: form.value.seo.description[lc] || form.value.summary.fr || '',
    url: `portfolio › fr › projets › ${form.value.slug.fr || '…'}`,
  }
})
</script>

<template>
  <p v-if="loading" class="sk" style="height: 320px" />
  <p v-else-if="loadError || !view || !form" class="alert crit" role="alert">{{ loadError || 'Projet introuvable.' }}</p>

  <template v-else>
    <div class="head">
      <div class="t">
        <span class="crumb"><NuxtLink to="/projets">Projets</NuxtLink> / {{ view.key }}</span>
        <div class="row">
          <h1>{{ form.name.fr || form.name.en || view.key }}</h1>
          <span class="chip" :class="stateChip.cls">{{ stateChip.text }}</span>
        </div>
        <div class="savebar" @keydown="onSaveKey">
          <span class="pulse" aria-hidden="true" />{{ saving ? 'Enregistrement…' : savedLabel }} · {{ completeness }}
        </div>
      </div>
      <div class="row" @keydown="onSaveKey">
        <span class="small muted" role="status">{{ saving ? 'Enregistrement…' : savedLabel }}</span>
        <button class="btn sec" type="button" :disabled="saving || !canWrite" @click="save(true)">Enregistrer</button>
        <button class="btn sec" type="button" :disabled="!canWrite || !view.published" @click="confirmDiscard = true">Abandonner</button>
        <button class="btn sec" type="button" @click="tab = 'historique'">Comparer</button>
        <span class="row">
          <button class="btn sec" type="button" @click="openPreview('fr')">Aperçu FR</button>
          <button class="btn sec" type="button" @click="openPreview('en')">Aperçu EN</button>
        </span>
        <button v-if="canSubmit && !canPublish" class="btn sec" type="button" @click="doSubmit">Soumettre en révision</button>
        <button v-if="canPublish" class="btn" type="button" :disabled="publishing" @click="doPublish">{{ publishing ? 'Publication…' : 'Publier' }}</button>
      </div>
    </div>

    <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>
    <p v-if="!canWrite" class="alert warn">Lecture seule.</p>

    <div v-if="conflict" class="alert crit" role="alert">
      <div class="row"><b>Conflit d’enregistrement.</b><span>Rien n’a été écrasé.</span></div>
      <ul class="list" style="margin-top: 8px">
        <li v-for="d in conflict.diff" :key="d"><span class="sev warn" /><span><code>{{ d }}</code></span><span class="small muted">diffère</span></li>
      </ul>
      <div class="row" style="margin-top: 10px">
        <button class="btn sec" type="button" @click="reloadServer">Recharger la copie serveur</button>
      </div>
    </div>

    <div v-if="confirmDiscard" class="alert warn confirm" role="alertdialog" aria-labelledby="discard-t">
      <span id="discard-t">Abandonner les modifications ? La copie de travail redevient identique à la version publiée.</span>
      <span class="row"><button class="btn sec" type="button" @click="confirmDiscard = false">Annuler</button><button class="btn danger" type="button" @click="doDiscard">Abandonner</button></span>
    </div>

    <div class="split">
      <div class="panel tabs-panel">
        <div class="tabs" role="tablist" aria-label="Onglets du projet">
          <button v-for="t in (['general', 'cas', 'medias', 'liens', 'seo', 'historique'] as const)" :key="t" type="button" role="tab" :aria-selected="tab === t" @click="tab = t">
            {{ { general: 'Général', cas: 'Étude de cas', medias: 'Médias', liens: 'Liens', seo: 'SEO', historique: 'Historique' }[t] }}
            <span v-if="t === 'liens' && form.links.length === 0" class="chip crit plain">0</span>
          </button>
        </div>

        <fieldset :disabled="!canWrite || view.status === 'archived'" class="fs">
          <!-- GÉNÉRAL -->
          <div v-if="tab === 'general'" class="grid">
            <div class="pairh"><span class="lh">FRANÇAIS</span><span class="lh">ENGLISH</span></div>
            <div class="pair">
              <div class="field"><label for="f-name-fr">Nom *</label><input id="f-name-fr" v-model="form.name.fr" class="inp" maxlength="80"></div>
              <div class="field"><label for="f-name-en">Name *</label><input id="f-name-en" v-model="form.name.en" class="inp" maxlength="80"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-slug-fr">Adresse (FR) *</label><input id="f-slug-fr" v-model="form.slug.fr" class="inp" maxlength="80"><span class="hint">/fr/projets/{{ form.slug.fr || '…' }}</span></div>
              <div class="field"><label for="f-slug-en">Slug (EN) *</label><input id="f-slug-en" v-model="form.slug.en" class="inp" maxlength="80"><span class="hint">/en/projects/{{ form.slug.en || '…' }}</span></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-kind-fr">Type *</label><input id="f-kind-fr" v-model="form.kind.fr" class="inp" maxlength="80"></div>
              <div class="field"><label for="f-kind-en">Kind *</label><input id="f-kind-en" v-model="form.kind.en" class="inp" maxlength="80"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-tag-fr">Accroche *</label><input id="f-tag-fr" v-model="form.tagline.fr" class="inp" maxlength="160"></div>
              <div class="field"><label for="f-tag-en">Tagline *</label><input id="f-tag-en" v-model="form.tagline.en" class="inp" maxlength="160"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-sum-fr">Description courte *</label><textarea id="f-sum-fr" v-model="form.summary.fr" class="inp" rows="3" maxlength="300"></textarea><span class="hint">{{ form.summary.fr.length }} / 300</span></div>
              <div class="field"><label for="f-sum-en">Short description *</label><textarea id="f-sum-en" v-model="form.summary.en" class="inp" rows="3" maxlength="300"></textarea><span class="hint">{{ form.summary.en.length }} / 300</span></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-role-fr">Mon rôle</label><input id="f-role-fr" v-model="form.role.fr" class="inp" maxlength="160"></div>
              <div class="field"><label for="f-role-en">My role</label><input id="f-role-en" v-model="form.role.en" class="inp" maxlength="160"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-period">Période</label><input id="f-period" v-model="form.period" class="inp" placeholder="2025, mars–juin 2025…" maxlength="60"></div>
              <div class="field"><label for="f-context">Contexte *</label>
                <select id="f-context" v-model="form.context" class="inp">
                  <option :value="null">— non renseigné —</option>
                  <option v-for="c in contexts" :key="c" :value="c">{{ contextLabels[c] }}</option>
                </select>
              </div>
            </div>
            <div class="field">
              <span class="lab" id="f-stack">Technologies (choisies dans les compétences)</span>
              <div class="row tags" role="group" aria-labelledby="f-stack">
                <button v-for="s in skills" :key="s.key" type="button" class="tag" :aria-pressed="form.stack.includes(s.key)" @click="toggleSkill(s.key)">{{ s.name }} {{ form.stack.includes(s.key) ? '✕' : '+' }}</button>
                <span v-if="skillsLoading" class="small muted">Chargement…</span>
              </div>
              <span class="hint">Le compte Expertise (« utilisée dans N projets ») est calculé depuis les projets publiés.</span>
            </div>
          </div>

          <!-- ÉTUDE DE CAS -->
          <div v-else-if="tab === 'cas'" class="grid">
            <div v-for="field in (['context', 'problem'] as const)" :key="field" class="field">
              <span class="lab">{{ { context: 'Contexte', problem: 'Problématique' }[field] }} <span v-if="isPending(`caseStudy.${field}`)" class="flag">à valider</span></span>
              <div class="pair">
                <label class="sr-only" :for="`f-cs-${field}-fr`">FR</label>
                <textarea :id="`f-cs-${field}-fr`" :value="csText(field, 'fr')" class="inp" rows="4" maxlength="4000" @input="setCsText(field, 'fr', ($event.target as HTMLTextAreaElement).value)"></textarea>
                <label class="sr-only" :for="`f-cs-${field}-en`">EN</label>
                <textarea :id="`f-cs-${field}-en`" :value="csText(field, 'en')" class="inp" rows="4" maxlength="4000" @input="setCsText(field, 'en', ($event.target as HTMLTextAreaElement).value)"></textarea>
              </div>
              <div v-if="isPending(`caseStudy.${field}`)" class="row"><button class="btn sec" type="button" @click="confirmPending(`caseStudy.${field}`)">Confirmer ce texte</button><span class="hint">Texte à valider : confirme-le ou corrige-le avant publication.</span></div>
            </div>

            <div v-for="field in (['goals', 'challenges', 'results'] as const)" :key="field" class="field">
              <span class="lab">{{ { goals: 'Objectifs (1 par ligne)', challenges: 'Difficultés (1 par ligne)', results: 'Résultats — faits vérifiables (1 par ligne)' }[field] }} <span v-if="isPending(`caseStudy.${field}`)" class="flag">à valider</span></span>
              <div class="pair">
                <label class="sr-only" :for="`f-cs-${field}-fr`">FR</label>
                <textarea :id="`f-cs-${field}-fr`" class="inp" rows="4" :value="toLines(csList(field, 'fr'))" @input="setCsList(field, 'fr', fromLines(($event.target as HTMLTextAreaElement).value))"></textarea>
                <label class="sr-only" :for="`f-cs-${field}-en`">EN</label>
                <textarea :id="`f-cs-${field}-en`" class="inp" rows="4" :value="toLines(csList(field, 'en'))" @input="setCsList(field, 'en', fromLines(($event.target as HTMLTextAreaElement).value))"></textarea>
              </div>
              <div v-if="isPending(`caseStudy.${field}`)" class="row"><button class="btn sec" type="button" @click="confirmPending(`caseStudy.${field}`)">Confirmer ce texte</button></div>
            </div>

            <div class="field">
              <span class="lab">Solution (1 paragraphe par bloc, séparés par une ligne vide) <span v-if="isPending('caseStudy.solution')" class="flag">à valider</span></span>
              <div class="pair">
                <label class="sr-only" for="f-cs-solution-fr">FR</label>
                <textarea id="f-cs-solution-fr" class="inp" rows="6" :value="toParas(csList('solution', 'fr'))" @input="setCsList('solution', 'fr', fromParas(($event.target as HTMLTextAreaElement).value))"></textarea>
                <label class="sr-only" for="f-cs-solution-en">EN</label>
                <textarea id="f-cs-solution-en" class="inp" rows="6" :value="toParas(csList('solution', 'en'))" @input="setCsList('solution', 'en', fromParas(($event.target as HTMLTextAreaElement).value))"></textarea>
              </div>
              <div v-if="isPending('caseStudy.solution')" class="row"><button class="btn sec" type="button" @click="confirmPending('caseStudy.solution')">Confirmer ce texte</button></div>
            </div>

            <div class="field">
              <span class="lab">Note d’architecture <span v-if="isPending('caseStudy.architectureNote')" class="flag">à valider</span></span>
              <div class="pair">
                <label class="sr-only" for="f-cs-architectureNote-fr">FR</label>
                <textarea id="f-cs-architectureNote-fr" :value="csText('architectureNote', 'fr')" class="inp" rows="4" maxlength="4000" @input="setCsText('architectureNote', 'fr', ($event.target as HTMLTextAreaElement).value)"></textarea>
                <label class="sr-only" for="f-cs-architectureNote-en">EN</label>
                <textarea id="f-cs-architectureNote-en" :value="csText('architectureNote', 'en')" class="inp" rows="4" maxlength="4000" @input="setCsText('architectureNote', 'en', ($event.target as HTMLTextAreaElement).value)"></textarea>
              </div>
              <div v-if="isPending('caseStudy.architectureNote')" class="row"><button class="btn sec" type="button" @click="confirmPending('caseStudy.architectureNote')">Confirmer ce texte</button></div>
            </div>

            <div class="field">
              <span class="lab">Technologies et rôle de chacune <span v-if="isPending('caseStudy.techRoles')" class="flag">à valider</span></span>
              <div v-for="(r, i) in (form.caseStudy.techRoles ?? [])" :key="i" class="techrow">
                <input v-model="r.tech" class="inp" placeholder="Tech" maxlength="60" :aria-label="`Tech ${i + 1}`">
                <input v-model="r.role.fr" class="inp" placeholder="Rôle FR" maxlength="200" :aria-label="`Rôle FR ${i + 1}`">
                <input v-model="r.role.en" class="inp" placeholder="Role EN" maxlength="200" :aria-label="`Rôle EN ${i + 1}`">
                <button class="btn ghost" type="button" :aria-label="`Retirer la tech ${i + 1}`" @click="removeTechRole(i)">✕</button>
              </div>
              <div class="row"><button class="btn ghost" type="button" @click="addTechRole">+ Ajouter une tech</button><button v-if="isPending('caseStudy.techRoles')" class="btn sec" type="button" @click="confirmPending('caseStudy.techRoles')">Confirmer ce texte</button></div>
            </div>
          </div>

          <!-- MÉDIAS -->
          <div v-else-if="tab === 'medias'" class="grid">
            <div class="field">
              <span class="lab" id="f-cover">Image de couverture (16:10 recommandée)</span>
              <div class="row">
                <img v-if="form.coverId" :src="previewUrl(form.coverId)" alt="" class="previmg">
                <span v-else class="small muted">Aucune</span>
                <button class="btn sec" type="button" @click="openPicker('cover')">Choisir dans la médiathèque</button>
                <button v-if="form.coverId" class="btn ghost" type="button" @click="form.coverId = null">Retirer</button>
              </div>
              <span class="hint">Texte alternatif FR+EN obligatoire pour publier (Médiathèque).</span>
            </div>
            <div class="field">
              <span class="lab" id="f-gallery">Galerie ({{ form.gallery.length }}/24)</span>
              <div v-if="!form.gallery.length" class="small muted">Aucune capture pour le moment.</div>
              <div v-for="(g, i) in form.gallery" :key="i" class="galrow">
                <img v-if="g.mediaId" :src="previewUrl(g.mediaId, 480)" :alt="g.caption.fr ?? ''" class="thumb">
                <span v-else class="thumb pdf">?</span>
                <div class="grid grows">
                  <input v-model="g.caption.fr" class="inp" placeholder="Légende FR" maxlength="200">
                  <input v-model="g.caption.en" class="inp" placeholder="Caption EN" maxlength="200">
                </div>
                <span class="row">
                  <button class="btn sec" type="button" @click="openPicker(`gal:${i}`)">Choisir</button>
                  <button class="btn ghost" type="button" :disabled="i === 0" :aria-label="`Monter la capture ${i + 1}`" @click="moveGallery(i, -1)">↑</button>
                  <button class="btn ghost" type="button" :disabled="i === form.gallery.length - 1" :aria-label="`Descendre la capture ${i + 1}`" @click="moveGallery(i, 1)">↓</button>
                  <button class="btn ghost" type="button" :aria-label="`Retirer la capture ${i + 1}`" @click="removeGallery(i)">✕</button>
                </span>
              </div>
              <div><button class="btn ghost" type="button" :disabled="form.gallery.length >= 24" @click="addGallery">+ Ajouter une capture</button></div>
            </div>
          </div>

          <!-- LIENS -->
          <div v-else-if="tab === 'liens'" class="grid">
            <div v-if="!form.links.length" class="alert crit">Au moins un lien est obligatoire pour publier ce projet.</div>
            <div v-for="(l, i) in form.links" :key="i" class="linkgrid">
              <div class="field"><label :for="`link-${i}-kind`">Type</label>
                <select :id="`link-${i}-kind`" v-model="l.kind" class="inp">
                  <option v-for="k in linkKinds" :key="k" :value="k">{{ linkLabels[k] }}</option>
                </select>
              </div>
              <div class="field"><label :for="`link-${i}-href`">Adresse *</label>
                <input :id="`link-${i}-href`" v-model="l.href" class="inp" type="url" placeholder="https://…" maxlength="500">
              </div>
              <button class="btn ghost" type="button" :aria-label="`Retirer le lien ${i + 1}`" @click="removeLink(i)">✕</button>
            </div>
            <div><button class="btn sec" type="button" :disabled="form.links.length >= 6" @click="addLink">+ Ajouter un lien</button></div>
            <span class="hint">Seules les adresses https comptent pour publier. 6 maximum.</span>
          </div>

          <!-- SEO -->
          <div v-else-if="tab === 'seo'" class="grid">
            <div class="pair">
              <div class="field"><label for="f-seo-title-fr">Titre (FR)</label><input id="f-seo-title-fr" v-model="form.seo.title.fr" class="inp" maxlength="120" placeholder="Vide = calculé automatiquement"></div>
              <div class="field"><label for="f-seo-title-en">Title (EN)</label><input id="f-seo-title-en" v-model="form.seo.title.en" class="inp" maxlength="120" placeholder="Empty = auto"></div>
            </div>
            <div class="pair">
              <div class="field"><label for="f-seo-desc-fr">Description (FR)</label><textarea id="f-seo-desc-fr" v-model="form.seo.description.fr" class="inp" rows="2" maxlength="300" placeholder="Vide = description courte"></textarea></div>
              <div class="field"><label for="f-seo-desc-en">Description (EN)</label><textarea id="f-seo-desc-en" v-model="form.seo.description.en" class="inp" rows="2" maxlength="300" placeholder="Empty = short description"></textarea></div>
            </div>
            <div class="panel mini-panel">
              <span class="lab">Aperçu Google · FR</span>
              <div class="serp"><span class="u">{{ seoPreview?.url }}</span><span class="ti">{{ seoPreview?.title }}</span><span class="small muted">{{ seoPreview?.desc }}</span></div>
              <span class="lab">Aperçu LinkedIn · FR</span>
              <div class="serp"><span class="u">{{ seoPreview?.url }}</span><span class="ti">{{ seoPreview?.title }}</span><span class="small muted">{{ seoPreview?.desc }} (LinkedIn : og:title/description + image ci-dessous)</span></div>
            </div>
            <div class="row between"><span>Indexer cette page</span><button class="switch" type="button" role="switch" :aria-checked="form.seo.index" aria-label="Indexer" @click="form.seo.index = !form.seo.index"><span /></button></div>
            <div class="field">
              <span class="lab">Image de partage (1200 × 630)</span>
              <div class="row">
                <img v-if="form.seo.imageId" :src="previewUrl(form.seo.imageId, 480)" alt="" class="previmg">
                <span v-else class="small muted">Image générée par défaut</span>
                <button class="btn sec" type="button" @click="openPicker('seo')">Choisir</button>
                <button v-if="form.seo.imageId" class="btn ghost" type="button" @click="form.seo.imageId = null">Retirer</button>
              </div>
            </div>
          </div>

          <!-- HISTORIQUE -->
          <div v-else class="grid">
            <div class="tw"><table>
              <thead><tr><th>Version</th><th>Type</th><th>Date</th><th></th></tr></thead>
              <tbody>
                <tr><td>Copie de travail (rev {{ view.revision }})</td><td><span class="chip warn">non publiée</span></td><td class="small">{{ fmt(view.updatedAt) }}</td><td><button class="btn sec" type="button" @click="diffTo = 'published'; runDiff()">Comparer</button></td></tr>
                <tr v-for="v in versions" :key="v.number"><td>v{{ v.number }}</td><td>{{ versionKindLabel[v.kind] }}</td><td class="small">{{ fmt(v.createdAt) }}</td><td><button class="btn sec" type="button" @click="doRestore(v.number)">Restaurer</button></td></tr>
              </tbody></table></div>
            <div class="field">
              <span class="lab">Comparer</span>
              <div class="row">
                <label class="small">De <select v-model="diffFrom" class="inp mini"><option v-for="s in sideOptions" :key="s" :value="s">{{ s }}</option></select></label>
                <label class="small">à <select v-model="diffTo" class="inp mini"><option v-for="s in sideOptions" :key="s" :value="s">{{ s }}</option></select></label>
                <button class="btn sec" type="button" :disabled="diffLoading" @click="runDiff">Comparer</button>
              </div>
              <p v-if="diffSearched && !diffRows.length" class="small muted">Aucune différence.</p>
              <ul v-if="diffRows.length" class="list">
                <li v-for="d in diffRows" :key="d.path"><span class="sev warn" /><span><b>{{ d.path }}</b><br><span class="small">de <code>{{ JSON.stringify(d.from) }}</code> à <code>{{ JSON.stringify(d.to) }}</code></span></span><span /></li>
              </ul>
            </div>
          </div>
        </fieldset>
      </div>

      <aside class="grid side">
        <section class="panel" aria-labelledby="aside-pub">
          <div class="ph"><h2 id="aside-pub">Avant publication</h2><span class="chip" :class="view.issues.length ? 'crit' : 'ok'">{{ view.issues.length ? `${view.issues.length} point(s)` : 'prêt' }}</span></div>
          <p v-if="!view.issues.length" class="small muted">Aucun blocage. Tu peux publier.</p>
          <ul v-else class="list">
            <li v-for="(issue, i) in view.issues" :key="`${issue.path}-${i}`">
              <span class="sev crit" />
              <button class="linklike" type="button" @click="focusField(issue.path)">{{ issue.message }}</button>
              <code class="small muted">{{ issue.path }}</code>
            </li>
          </ul>
        </section>

        <section class="panel" aria-labelledby="aside-rank">
          <h2 id="aside-rank">Classement</h2>
          <div class="field"><label for="f-domains">Domaines * (au moins 1)</label>
            <div class="row tags" id="f-domains">
              <button v-for="d in domainsList" :key="d" type="button" class="tag" :aria-pressed="form.domains.includes(d as never)" @click="toggleDomain(d)">{{ d }}</button>
            </div>
          </div>
          <div class="row between"><span>Affiché sur l’accueil</span><button class="switch" type="button" role="switch" :aria-checked="view.featured" aria-label="Accueil" :disabled="!canWrite" @click="toggleFeatured"><span /></button></div>
          <div class="row between"><span>Réalisé seul</span><button class="switch" type="button" role="switch" :aria-checked="form.solo" aria-label="Réalisé seul" @click="form.solo = !form.solo"><span /></button></div>
        </section>

        <section class="panel" aria-labelledby="aside-danger">
          <h2 id="aside-danger">Zone sensible</h2>
          <div class="row">
            <button v-if="view.published" class="btn sec" type="button" :disabled="!canPublish" @click="showUnpublish = true">Dépublier</button>
            <button v-if="view.status !== 'archived'" class="btn sec" type="button" :disabled="!canPublish" @click="showArchive = true">Archiver</button>
            <button v-else class="btn sec" type="button" :disabled="!canPublish" @click="doUnarchive">Désarchiver</button>
          </div>
          <div v-if="view.status !== 'archived' && view.published" class="grid">
            <button class="btn danger" type="button" :disabled="!canDelete" @click="deleteName = ''">Supprimer…</button>
            <div v-if="deleteName !== ''" class="field">
              <label for="del-name">Tape le nom du projet pour confirmer</label>
              <input id="del-name" v-model="deleteName" class="inp" placeholder="Retrouve Moi">
              <span class="hint">Suppression possible seulement après archivage (ou si jamais publié).</span>
            </div>
            <button v-if="deleteName" class="btn danger" type="button" :disabled="deleting" @click="doDelete">{{ deleting ? 'Suppression…' : 'Supprimer définitivement' }}</button>
          </div>
          <div v-else-if="view.status === 'archived'" class="grid">
            <button class="btn danger" type="button" :disabled="!canDelete" @click="deleteName = ' '">Supprimer…</button>
            <input v-if="deleteName !== ''" id="del-name" v-model="deleteName" class="inp" placeholder="Tape le nom du projet">
            <button v-if="deleteName.trim()" class="btn danger" type="button" :disabled="deleting" @click="doDelete">{{ deleting ? 'Suppression…' : 'Supprimer définitivement' }}</button>
          </div>
          <p v-else class="small muted">Suppression possible seulement après archivage (ou si jamais publié).</p>
        </section>
      </aside>
    </div>
  </template>

  <MediaPicker :open="picker.open" :kind="picker.kind" folder="projets" title="Choisir dans la médiathèque" @close="picker.open = false" @select="onPick" />

  <div v-if="showUnpublish && form && view" class="scrim" @click.self="showUnpublish = false">
    <div class="panel modal" role="alertdialog" aria-modal="true" aria-labelledby="unpub-t">
      <h2 id="unpub-t">Dépublier {{ form.name.fr || view.key }} ?</h2>
      <p class="small">Le projet disparaît du site, de l’accueil, de la page Projets, de la page Expertise et du sitemap. Son adresse renverra une erreur 404.</p>
      <div class="row end"><button class="btn sec" type="button" @click="showUnpublish = false">Annuler</button><button class="btn danger" type="button" @click="doUnpublish">Dépublier</button></div>
    </div>
  </div>
  <div v-if="showArchive && form && view" class="scrim" @click.self="showArchive = false">
    <div class="panel modal" role="alertdialog" aria-modal="true" aria-labelledby="arch-t">
      <h2 id="arch-t">Archiver {{ form.name.fr || view.key }} ?</h2>
      <p class="small">Le projet est retiré du site et passe en lecture seule. Tu pourras le restaurer en brouillon, puis le supprimer.</p>
      <div class="row end"><button class="btn sec" type="button" @click="showArchive = false">Annuler</button><button class="btn danger" type="button" @click="doArchive">Archiver</button></div>
    </div>
  </div>

  <div v-if="showReauth" class="scrim" @click.self="showReauth = false">
    <form class="panel modal" role="dialog" aria-modal="true" aria-labelledby="ra-t" @submit.prevent="submitReauth">
      <h2 id="ra-t">Confirme ton identité</h2>
      <p class="small">Supprimer un projet demande une connexion de moins de 10 min.</p>
      <p v-if="reauthError" class="alert crit" role="alert">{{ reauthError }}</p>
      <div class="field"><label for="ra-pass">Mot de passe</label><input id="ra-pass" v-model="reauthPw" class="inp" type="password" autocomplete="current-password" required autofocus></div>
      <div class="field"><label for="ra-code">Code à 6 chiffres</label><input id="ra-code" v-model="reauthCode" class="inp code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
      <div class="row end"><button class="btn sec" type="button" @click="showReauth = false">Annuler</button><button class="btn" type="submit" :disabled="reauthBusy || !reauthPw || reauthCode.length < 6">{{ reauthBusy ? 'Vérification…' : 'Confirmer et supprimer' }}</button></div>
    </form>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.crumb {
  font-size: 12px;
  color: var(--ink-muted);
}

.savebar {
  font-size: 12px;
  color: var(--ink-muted);
}

.pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--success);
}

.confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.end {
  justify-content: flex-end;
}

.between {
  justify-content: space-between;
}

.fs {
  display: grid;
  margin: 0;
  padding: 0;
  border: 0;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.side {
  position: sticky;
  top: 76px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.tabs [role='tab'] {
  padding: 6px 12px;
  border: 0;
  border-radius: var(--radius-full);
  background: none;
  cursor: pointer;
  font-size: 13px;
}

.tabs [role='tab'][aria-selected='true'] {
  background: var(--ink);
  color: var(--on-ink);
}

.pairh,
.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.lh {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.flag {
  color: var(--warning);
  font-weight: 600;
}

.tags {
  gap: 6px;
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

.techrow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.galrow {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.linkgrid {
  display: grid;
  grid-template-columns: minmax(0, 160px) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.thumb {
  display: grid;
  place-items: center;
  width: 72px;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
}

.previmg {
  width: 96px;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
}

.mini-panel {
  padding: 12px;
}

.serp {
  display: grid;
  gap: 2px;
}

.serp .u {
  font-size: 12px;
  color: var(--success);
}

.serp .ti {
  color: var(--info);
  font-size: 18px;
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

.switch {
  position: relative;
  flex: none;
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
  max-width: 520px;
}

.mini {
  width: auto;
  padding: 4px 8px;
}

.grows {
  gap: 8px;
}

@media (max-width: 1100px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    position: static;
  }
}

@media (max-width: 640px) {
  .pair,
  .pairh,
  .techrow,
  .linkgrid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
