<script setup lang="ts">
/** Activity log: newest first, filters, chain integrity (docs/admin/05 §A). */
useHead({ title: "Journal d'activité · Administration" })

interface Event { id: number; at: string; actorEmail: string | null; actorRole: string | null; action: string; resource: string | null; result: string; severity: string; ip: string | null; device: string | null; meta: Record<string, unknown> | null }

const allowed = useCan()
const severity = ref('')
const before = ref<number | null>(null)
const events = ref<Event[]>([])
const next = ref<number | null>(null)
const loading = ref(false)
const open = ref<number | null>(null)

async function load(reset = true) {
  loading.value = true
  if (reset) before.value = null
  const res = await $fetch<{ events: Event[]; next: number | null }>('/api/admin/audit', {
    query: { ...(severity.value ? { severity: severity.value } : {}), ...(before.value ? { before: before.value } : {}) },
  })
  events.value = reset ? res.events : [...events.value, ...res.events]
  next.value = res.next
  loading.value = false
}
function more() {
  before.value = next.value
  load(false)
}
watch(severity, () => load())
onMounted(() => load())

const { data: integrity } = useFetch<{ ok: boolean; checked: number; brokenAt: number | null; checkedAt: string }>('/api/admin/audit/integrity', {
  server: false,
  immediate: allowed('audit.read.all'),
})

const sevClass = (s: string) => (s === 'critical' ? 'crit' : s === 'warning' ? 'warn' : '')
const resultClass = (r: string) => (r === 'success' ? 'ok' : 'crit')
const resultLabel = (r: string) => ({ success: 'succès', failure: 'échec', denied: 'refusé' })[r] ?? r
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Journal d'activité</h1>
      <p class="muted">
        Ajout seulement, conservé 12 mois. Ni mot de passe, ni code, ni cookie n'y figurent.
        <template v-if="!allowed('audit.read.all')"> Tu vois tes propres actions.</template>
      </p>
    </div>
    <span v-if="integrity" class="chip" :class="integrity.ok ? 'ok' : 'crit'">
      {{ integrity.ok ? `chaîne intègre · ${integrity.checked} événements` : `chaîne rompue à l'événement ${integrity.brokenAt}` }}
    </span>
  </div>

  <div class="row">
    <label class="sr-only" for="sev">Gravité</label>
    <select id="sev" v-model="severity" class="inp" style="max-width: 200px">
      <option value="">Toutes gravités</option>
      <option value="critical">Critique</option>
      <option value="warning">Attention</option>
      <option value="info">Info</option>
    </select>
  </div>

  <div class="tw">
    <table>
      <thead><tr><th>Date</th><th>Gravité</th><th>Action</th><th>Compte</th><th>Résultat</th><th><span class="sr-only">Détails</span></th></tr></thead>
      <tbody>
        <template v-for="e in events" :key="e.id">
          <tr>
            <td class="small">{{ formatDateTime(e.at) }}</td>
            <td><span class="chip" :class="sevClass(e.severity)">{{ { info: 'info', warning: 'attention', critical: 'critique' }[e.severity] }}</span></td>
            <td>{{ actionLabel(e.action) }}<span v-if="e.resource" class="small muted"> · {{ e.resource }}</span></td>
            <td class="small">{{ e.actorEmail ?? '—' }}</td>
            <td><span class="chip" :class="resultClass(e.result)">{{ resultLabel(e.result) }}</span></td>
            <td><button class="btn ghost" type="button" :aria-expanded="open === e.id" @click="open = open === e.id ? null : e.id">Détails</button></td>
          </tr>
          <tr v-if="open === e.id">
            <td colspan="6" class="small">
              <dl class="details">
                <dt>Code</dt><dd><code>{{ e.action }}</code></dd>
                <dt>Adresse</dt><dd>{{ e.ip ?? '—' }}</dd>
                <dt>Appareil</dt><dd>{{ e.device ?? '—' }}</dd>
                <dt>Rôle</dt><dd>{{ e.actorRole ?? '—' }}</dd>
                <template v-if="e.meta"><dt>Contexte</dt><dd><code>{{ JSON.stringify(e.meta) }}</code></dd></template>
              </dl>
            </td>
          </tr>
        </template>
        <tr v-if="!loading && !events.length"><td colspan="6" class="muted">Aucun événement.</td></tr>
      </tbody>
    </table>
  </div>
  <div v-if="next" class="row"><button class="btn sec" type="button" :disabled="loading" @click="more">Afficher plus</button></div>
</template>

<style scoped>
.details {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 4px 16px;
  margin: 0;
}

.details dt {
  color: var(--ink-muted);
}

.details dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
