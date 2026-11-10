<script setup lang="ts">
/**
 * Inbox (docs/admin/02 §K, mockup "Boîte de réception"): list + reading pane.
 * Messages are shown as plain text (never interpreted). Viewer sees only the unread count.
 */
useHead({ title: 'Boîte de réception · Administration' })

const allowed = useCan()
const me = useMe()
const auth = useAuthClient()
const isViewer = computed(() => me.value?.user.role === 'viewer')
const canDelete = computed(() => allowed('messages.delete'))

const statusFilter = ref<'all' | 'new' | 'read' | 'answered' | 'archived'>('all')
const profileFilter = ref('')
const typeFilter = ref('')
const localeFilter = ref('')
const messages = ref<
  {
    id: string
    createdAt: string
    profile: string
    name: string
    email: string
    company: string | null
    role: string | null
    projectTypes: string[]
    timeline: string | null
    message: string
    locale: string
    status: string
    readAt: string | null
    answeredAt: string | null
    archivedAt: string | null
  }[]
>([])
const unread = ref(0)
const counts = ref<Record<string, number>>({})
const loading = ref(true)
const notice = ref<{ ok: boolean; text: string } | null>(null)
const selectedId = ref<string | null>(null)
const selected = computed(() => messages.value.find((m) => m.id === selectedId.value) ?? null)
const copied = ref(false)
const confirmDelete = ref(false)
const showReauth = ref(false)
const reauthPw = ref('')
const reauthCode = ref('')
const reauthBusy = ref(false)
const reauthError = ref('')

const PROFILE_LABEL: Record<string, string> = { recruiter: 'Recruteur', client: 'Client', other: 'Autre' }
const STATUS_LABEL: Record<string, string> = { new: 'Nouveau', read: 'Lu', answered: 'Répondu', archived: 'Archivé' }
const TYPE_LABEL: Record<string, string> = { web: 'Application web', mobile: 'Application mobile', api: 'API & back-end', ai: 'IA & automatisation', data: 'Données', other: 'Autre' }

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ messages: typeof messages.value | null; unread: number; counts: Record<string, number> }>('/api/admin/messages', {
      query: {
        ...(statusFilter.value !== 'all' ? { status: statusFilter.value } : {}),
        ...(profileFilter.value ? { profile: profileFilter.value } : {}),
        ...(typeFilter.value ? { type: typeFilter.value } : {}),
        ...(localeFilter.value ? { locale: localeFilter.value } : {}),
      },
    })
    messages.value = res.messages ?? []
    unread.value = res.unread
    counts.value = res.counts
    if (selectedId.value && !messages.value.find((m) => m.id === selectedId.value)) selectedId.value = messages.value[0]?.id ?? null
    else if (!selectedId.value) selectedId.value = messages.value[0]?.id ?? null
  } catch {
    notice.value = { ok: false, text: "Impossible de charger les messages." }
  }
  loading.value = false
}
onMounted(load)
watch([statusFilter, profileFilter, typeFilter, localeFilter], load)

async function openMessage(id: string) {
  selectedId.value = id
  confirmDelete.value = false
  if (isViewer.value) return
  try {
    const res = await $fetch<{ message: (typeof messages.value)[number] }>(`/api/admin/messages/${id}`)
    const idx = messages.value.findIndex((m) => m.id === id)
    if (idx >= 0) messages.value[idx] = res.message
    if (res.message.status === 'read') unread.value = Math.max(0, unread.value - 1)
    counts.value = { ...counts.value, new: unread.value }
  } catch {
    notice.value = { ok: false, text: "Impossible d'ouvrir le message." }
  }
}

async function setStatus(status: string) {
  if (!selected.value) return
  try {
    const res = await $fetch<{ message: (typeof messages.value)[number] }>(`/api/admin/messages/${selected.value.id}`, {
      method: 'PATCH',
      body: { status },
    })
    const idx = messages.value.findIndex((m) => m.id === selected.value!.id)
    if (idx >= 0) messages.value[idx] = res.message
    notice.value = { ok: true, text: `Marqué « ${STATUS_LABEL[status]} ».` }
    await load()
  } catch {
    notice.value = { ok: false, text: "L'opération n'a pas abouti." }
  }
}

async function copyEmail() {
  if (!selected.value) return
  try {
    await navigator.clipboard.writeText(selected.value.email)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

async function doDelete() {
  if (!selected.value) return
  confirmDelete.value = false
  try {
    await $fetch(`/api/admin/messages/${selected.value.id}`, { method: 'DELETE' })
    notice.value = { ok: true, text: 'Message supprimé (journalisé).' }
    selectedId.value = null
    await load()
  } catch (e) {
    const code = (e as { data?: { code?: string } })?.data?.code
    if (code === 'auth.reauth_required') {
      showReauth.value = true
      reauthError.value = ''
      reauthPw.value = ''
      reauthCode.value = ''
    } else {
      notice.value = { ok: false, text: "L'opération n'a pas abouti." }
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
    await doDelete()
  } finally {
    reauthBusy.value = false
  }
}
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const typesText = (m: { projectTypes: string[] }) => m.projectTypes.map((k) => TYPE_LABEL[k] ?? k).join(' · ')
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Boîte de réception</h1>
      <p class="muted">Messages du formulaire de contact. Archivés supprimés après 12 mois.</p>
    </div>
    <span class="chip info">{{ unread }} nouveau(x)</span>
  </div>

  <div v-if="isViewer" class="panel">
    <p class="muted">Lecture seule : tu vois uniquement le compteur. Les coordonnées des expéditeurs sont réservées aux éditeurs et administrateurs.</p>
  </div>
  <template v-else>
    <div class="row">
      <div class="seg" role="group" aria-label="Statut">
        <button type="button" :aria-pressed="statusFilter === 'all'" @click="statusFilter = 'all'">Tous</button>
        <button type="button" :aria-pressed="statusFilter === 'new'" @click="statusFilter = 'new'">Nouveaux {{ counts.new ?? unread }}</button>
        <button type="button" :aria-pressed="statusFilter === 'read'" @click="statusFilter = 'read'">Lus</button>
        <button type="button" :aria-pressed="statusFilter === 'answered'" @click="statusFilter = 'answered'">Répondus</button>
        <button type="button" :aria-pressed="statusFilter === 'archived'" @click="statusFilter = 'archived'">Archivés</button>
      </div>
      <select v-model="profileFilter" class="inp mini" aria-label="Profil">
        <option value="">Tous profils</option>
        <option v-for="(l, k) in PROFILE_LABEL" :key="k" :value="k">{{ l }}</option>
      </select>
      <select v-model="typeFilter" class="inp mini" aria-label="Type de projet">
        <option value="">Tous types</option>
        <option v-for="(l, k) in TYPE_LABEL" :key="k" :value="k">{{ l }}</option>
      </select>
      <select v-model="localeFilter" class="inp mini" aria-label="Langue">
        <option value="">Toutes langues</option>
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </div>

    <p v-if="notice" class="alert" :class="notice.ok ? 'info' : 'crit'" role="status">{{ notice.text }}</p>

    <div class="inbox">
      <nav class="panel msglist" aria-label="Messages">
        <p v-if="loading" class="small muted">Chargement…</p>
        <p v-else-if="!messages.length" class="empty">Aucun message.</p>
        <button v-for="m in messages" :key="m.id" type="button" class="msg" :class="{ unread: m.status === 'new' }" :aria-current="selectedId === m.id" @click="openMessage(m.id)">
          <span class="from"><span class="fname">{{ m.name }}</span><span class="small muted">{{ fmt(m.createdAt) }}</span></span>
          <span class="small subj">{{ m.message.slice(0, 70) }}{{ m.message.length > 70 ? '…' : '' }}</span>
          <span class="small muted">{{ PROFILE_LABEL[m.profile] ?? m.profile }}<template v-if="m.projectTypes.length"> · {{ typesText(m) }}</template></span>
          <span class="chip" :class="m.status === 'archived' ? '' : 'info'">{{ STATUS_LABEL[m.status] ?? m.status }}</span>
        </button>
      </nav>

      <article v-if="selected" class="panel read" aria-label="Message sélectionné">
        <div class="ph"><h2>{{ selected.name }}</h2><span class="chip info">{{ PROFILE_LABEL[selected.profile] ?? selected.profile }}</span></div>
        <dl class="meta">
          <div><dt>De</dt><dd>{{ selected.name }}</dd></div>
          <div><dt>Email</dt><dd class="mail">{{ selected.email }}</dd></div>
          <div v-if="selected.company"><dt>Entreprise</dt><dd>{{ selected.company }}</dd></div>
          <div v-if="selected.role"><dt>Poste</dt><dd>{{ selected.role }}</dd></div>
          <div v-if="selected.projectTypes.length"><dt>Types de projet</dt><dd>{{ typesText(selected) }}</dd></div>
          <div v-if="selected.timeline"><dt>Délai</dt><dd>{{ selected.timeline }}</dd></div>
          <div><dt>Langue</dt><dd>{{ selected.locale.toUpperCase() }}</dd></div>
          <div><dt>Statut</dt><dd>{{ STATUS_LABEL[selected.status] ?? selected.status }}</dd></div>
        </dl>
        <!-- Plain text, never interpreted: no v-html, no linkification. -->
        <p class="body">{{ selected.message }}</p>
        <div class="row">
          <a class="btn sec" :href="`mailto:${encodeURIComponent(selected.email)}`">Répondre par email</a>
          <button class="btn sec" type="button" @click="copyEmail">{{ copied ? 'Adresse copiée' : "Copier l'adresse" }}</button>
          <button class="btn sec" type="button" @click="setStatus('answered')">Marquer répondu</button>
          <button v-if="selected.status !== 'archived'" class="btn ghost" type="button" @click="setStatus('archived')">Archiver</button>
          <button v-else class="btn ghost" type="button" @click="setStatus('new')">Remettre en nouveau</button>
          <button v-if="canDelete" class="btn ghost danger" type="button" @click="confirmDelete = true">Supprimer</button>
        </div>
        <div v-if="confirmDelete" class="alert warn confirm" role="alertdialog" aria-labelledby="del-t">
          <span id="del-t">Suppression définitive, sans corbeille. La suppression est journalisée.</span>
          <span class="row"><button class="btn sec" type="button" @click="confirmDelete = false">Annuler</button><button class="btn danger" type="button" @click="doDelete">Supprimer</button></span>
        </div>
      </article>
      <p v-else class="panel empty">Sélectionne un message.</p>
    </div>
  </template>

  <div v-if="showReauth" class="scrim" @click.self="showReauth = false">
    <form class="panel modal" role="dialog" aria-modal="true" aria-labelledby="ra-t" @submit.prevent="submitReauth">
      <h2 id="ra-t">Confirme ton identité</h2>
      <p class="small">Supprimer un message demande une connexion de moins de 10 min.</p>
      <p v-if="reauthError" class="alert crit" role="alert">{{ reauthError }}</p>
      <div class="field"><label for="ra-pass">Mot de passe</label><input id="ra-pass" v-model="reauthPw" class="inp" type="password" autocomplete="current-password" required autofocus></div>
      <div class="field"><label for="ra-code">Code à 6 chiffres</label><input id="ra-code" v-model="reauthCode" class="inp code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
      <div class="row end"><button class="btn sec" type="button" @click="showReauth = false">Annuler</button><button class="btn" type="submit" :disabled="reauthBusy || !reauthPw || reauthCode.length < 6">{{ reauthBusy ? 'Vérification…' : 'Confirmer et supprimer' }}</button></div>
    </form>
  </div>
</template>

<style scoped>
.sp {
  flex: 1;
}

.inbox {
  display: grid;
  grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.msglist {
  padding: 6px;
  max-height: 70vh;
  overflow-y: auto;
}

.msg {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
  cursor: pointer;
}

.msg:hover {
  background: var(--surface-sunken);
}

.msg[aria-current='true'] {
  background: var(--ink);
  color: var(--on-ink);
}

.msg[aria-current='true'] .muted,
.msg[aria-current='true'] .small {
  color: inherit;
  opacity: 0.8;
}

.msg.unread {
  border-left: 3px solid var(--marker);
}

.from {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.fname {
  font-weight: 600;
}

.subj {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0;
}

.meta dt {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.mail {
  user-select: all;
}

.body {
  white-space: pre-line;
  overflow-wrap: anywhere;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  font-size: 14px;
  line-height: 1.6;
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

.btn.danger {
  color: var(--danger);
}

.code {
  font-size: 18px;
  letter-spacing: 0.3em;
  text-align: center;
}

.mini {
  width: auto;
  padding: 4px 8px;
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

@media (max-width: 900px) {
  .inbox {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
