import type { PublishIssue } from '@portfolio/shared/content'

/**
 * Shared editor boilerplate for simple contents (blocks, skills, parcours, services, steps):
 * load → autosave 3 s → save (checkpoint) → publish → discard → history/restore → conflict 409.
 * The form itself stays per page; this only handles the workflow around it.
 */
export interface ItemView {
  id: string
  type: string
  key: string
  status: string
  featured: boolean
  position: number
  modified: boolean
  revision: number
  working: Record<string, unknown>
  published: Record<string, unknown> | null
  publishedAt: string | null
  updatedAt: string
  updatedBy: string | null
  pendingFields: string[]
  issues: PublishIssue[]
}
export interface VersionRow {
  number: number
  kind: 'import' | 'checkpoint' | 'published' | 'restored'
  createdAt: string
  createdBy: string | null
  id: string
}

export function useItemEditor(id: () => string) {
  const view = ref<ItemView | null>(null)
  const form = ref<Record<string, unknown> | null>(null)
  const loading = ref(true)
  const loadError = ref('')
  const saving = ref(false)
  const publishing = ref(false)
  const notice = ref<{ ok: boolean; text: string } | null>(null)
  const lastSavedAt = ref<number | null>(null)
  const nowTick = ref(Date.now())
  const conflict = ref<{ server: ItemView } | null>(null)
  const showHistory = ref(false)
  const versions = ref<VersionRow[]>([])
  const versionsLoading = ref(false)
  const confirmDiscard = ref(false)

  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
  function stable(v: unknown): string {
    const norm = (x: unknown): unknown =>
      Array.isArray(x) ? x.map(norm) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, norm((x as Record<string, unknown>)[k])])) : x
    return JSON.stringify(norm(v))
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

  function contentError(e: unknown): string {
    const code = (e as { data?: { code?: string } })?.data?.code
    if (code === 'content.conflict') return 'Un autre onglet a enregistré entre-temps. Recharge la copie serveur avant de continuer.'
    if (code === 'content.invalid') return 'Certaines données sont invalides (voir « Avant publication »).'
    if (code === 'permission.denied') return 'Ton rôle ne permet pas cette action.'
    if (code === 'publish.blocked') return 'Publication impossible : corrige les points listés ci-dessous.'
    return "L'opération n'a pas abouti. Réessaie dans un instant."
  }

  async function load() {
    if (!id()) {
      loading.value = false
      view.value = null
      form.value = null
      return
    }
    loading.value = true
    loadError.value = ''
    try {
      const v = await $fetch<ItemView>(`/api/admin/content/${id()}`)
      view.value = v
      form.value = clone(v.working)
      lastSavedAt.value = new Date(v.updatedAt).getTime()
    } catch (e) {
      const code = (e as { data?: { code?: string } })?.data?.code
      loadError.value = code === 'content.not_found' ? 'Contenu introuvable.' : "Impossible de charger. Vérifie que l'API est en ligne."
      view.value = null
    }
    loading.value = false
  }

  async function save(checkpoint: boolean) {
    if (!view.value || !form.value || saving.value || conflict.value) return
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
          conflict.value = { server }
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
    form.value = JSON.parse(JSON.stringify(conflict.value.server.working))
    lastSavedAt.value = new Date(conflict.value.server.updatedAt).getTime()
    conflict.value = null
    notice.value = { ok: true, text: 'Copie serveur rechargée.' }
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
          conflict.value = { server }
        } catch {
          /* ignore */
        }
        notice.value = { ok: false, text: 'Un autre onglet a enregistré entre-temps.' }
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
      const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/discard`, { method: 'POST' })
      view.value = v
      form.value = JSON.parse(JSON.stringify(v.working))
      lastSavedAt.value = Date.now()
      notice.value = { ok: true, text: 'Modifications abandonnées.' }
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
      const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/versions/${n}/restore`, { method: 'POST' })
      view.value = v
      form.value = JSON.parse(JSON.stringify(v.working))
      showHistory.value = false
      notice.value = { ok: true, text: `Version ${n} restaurée en copie de travail. Rien n'est publié.` }
    } catch (e) {
      notice.value = { ok: false, text: contentError(e) }
    }
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

  async function doUnpublish() {
    if (!view.value) return
    try {
      const r = await $fetch<{ item: ItemView }>(`/api/admin/content/${view.value.id}/unpublish`, { method: 'POST' })
      view.value = r.item
      form.value = JSON.parse(JSON.stringify(r.item.working))
      notice.value = { ok: true, text: 'Dépublié.' }
    } catch (e) {
      notice.value = { ok: false, text: contentError(e) }
    }
  }

  async function doArchive() {
    if (!view.value) return
    try {
      const r = await $fetch<{ item: ItemView }>(`/api/admin/content/${view.value.id}/archive`, { method: 'POST' })
      view.value = r.item
      form.value = JSON.parse(JSON.stringify(r.item.working))
      notice.value = { ok: true, text: 'Archivé.' }
    } catch (e) {
      notice.value = { ok: false, text: contentError(e) }
    }
  }

  async function doUnarchive() {
    if (!view.value) return
    try {
      const v = await $fetch<ItemView>(`/api/admin/content/${view.value.id}/unarchive`, { method: 'POST' })
      view.value = v
      form.value = JSON.parse(JSON.stringify(v.working))
      notice.value = { ok: true, text: 'Restauré en brouillon.' }
    } catch (e) {
      notice.value = { ok: false, text: contentError(e) }
    }
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

  function focusField(path: string) {
    const el = document.getElementById(`f-${path.replace(/[.*]/g, '')}`)
    el?.focus()
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return {
    view,
    form,
    loading,
    loadError,
    saving,
    publishing,
    notice,
    lastSavedAt,
    nowTick,
    conflict,
    showHistory,
    versions,
    versionsLoading,
    confirmDiscard,
    isDirty,
    stateChip,
    savedLabel,
    contentError,
    load,
    save,
    reloadServer,
    doPublish,
    doDiscard,
    openHistory,
    doRestore,
    doSubmit,
    doUnpublish,
    doArchive,
    doUnarchive,
    onSaveKey,
    focusField,
  }
}
