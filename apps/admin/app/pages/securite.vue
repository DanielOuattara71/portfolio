<script setup lang="ts">
/** Security & monitoring (docs/admin/05 §E): probes + curves, alerts, incidents, journal chain. */
useHead({ title: 'Sécurité et surveillance · Administration' })

interface Check { at: string; target: string; ok: boolean; statusCode: number | null; ms: number | null; error: string | null }
interface Status { latest: { target: string; ok: boolean; statusCode: number | null; ms: number | null; at: string; error: string | null }[]; stats: { target: string; n: number; okRate: number; medianMs: number; p95Ms: number }[] }
interface AlertRow { id: number; rule: string; severity: string; status: string; firstAt: string; lastAt: string; count: number; data: Record<string, unknown> | null }
interface Incident { id: number; number: string; title: string; severity: string; status: string; alertId: number | null; openedBy: string | null; openedAt: string; resolvedAt: string | null; resolution: string | null }

const { data: statusData, refresh: refreshStatus } = useFetch<Status>('/api/admin/monitoring/status', { server: false })
const { data: checksData, refresh: refreshChecks } = useFetch<{ checks: Check[] }>('/api/admin/monitoring/checks', { server: false, query: { limit: 120 } })
const { data: alertsData, refresh: refreshAlerts } = useFetch<{ alerts: AlertRow[] }>('/api/admin/alerts', { server: false })
const { data: incidentsData, refresh: refreshIncidents } = useFetch<{ incidents: Incident[] }>('/api/admin/incidents', { server: false })
const { data: integrity } = useFetch<{ ok: boolean; checked: number; brokenAt: number | null }>('/api/admin/audit/integrity', { server: false })

const targetLabel: Record<string, string> = { web: 'Site public', api: 'API', db: 'Base de données', storage: 'Stockage' }

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshChecks(), refreshAlerts(), refreshIncidents()])
}

async function act(alertId: number, action: 'acknowledge' | 'resolve') {
  await $fetch(`/api/admin/alerts/${alertId}/${action}`, { method: 'POST' })
  await refreshAlerts()
}

const draft = ref({ title: '', severity: 'critical' as 'warning' | 'critical' })
const busy = ref(false)
async function createIncident() {
  if (draft.value.title.trim().length < 2) return
  busy.value = true
  try {
    await $fetch('/api/admin/incidents', { method: 'POST', body: { title: draft.value.title.trim(), severity: draft.value.severity } })
    draft.value.title = ''
    await refreshIncidents()
  } finally {
    busy.value = false
  }
}

const selectedIncident = ref<number | null>(null)
const noteText = ref('')
const { data: notesData, refresh: refreshNotes } = useFetch<{ notes: { at: string; text: string }[] }>(() => `/api/admin/incidents/${selectedIncident.value}/notes`, {
  server: false,
  immediate: false,
})
watch(selectedIncident, (id) => {
  if (id) refreshNotes()
})
async function addNote() {
  if (!selectedIncident.value || !noteText.value.trim()) return
  await $fetch(`/api/admin/incidents/${selectedIncident.value}/notes`, { method: 'POST', body: { text: noteText.value.trim() } })
  noteText.value = ''
  await refreshNotes()
}

const resolution = ref('')
async function resolve(inc: Incident) {
  if (!resolution.value.trim()) return
  await $fetch(`/api/admin/incidents/${inc.id}`, { method: 'PATCH', body: { status: 'resolved', resolution: resolution.value.trim() } })
  resolution.value = ''
  await refreshIncidents()
}
async function ack(inc: Incident) {
  await $fetch(`/api/admin/incidents/${inc.id}`, { method: 'PATCH', body: { status: 'acknowledged' } })
  await refreshIncidents()
}
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Sécurité et surveillance</h1>
      <p class="muted">Sondes toutes les 5 minutes, alertes (une par heure au maximum par règle), incidents. Que des mesures réelles : « non disponible » sinon.</p>
    </div>
    <div class="row">
      <span v-if="integrity" class="chip" :class="integrity.ok ? 'ok' : 'crit'">{{ integrity.ok ? `journal intègre · ${integrity.checked}` : `journal rompu à ${integrity.brokenAt}` }}</span>
      <button class="btn sec" type="button" @click="refreshAll">Actualiser</button>
    </div>
  </div>

  <div class="grid g4">
    <section v-for="s in statusData?.latest ?? []" :key="s.target" class="panel">
      <div class="ph"><h2>{{ targetLabel[s.target] ?? s.target }}</h2></div>
      <p class="stat"><span class="n" :class="s.ok ? 'ok' : 'crit'">{{ s.ok ? s.ms + ' ms' : 'échec' }}</span></p>
      <p class="small muted">{{ s.ok ? `HTTP ${s.statusCode}` : (s.error ?? 'inconnu') }}<br>mesuré le {{ formatDateTime(s.at) }}</p>
    </section>
    <section v-if="!statusData?.latest?.length" class="panel"><div class="ph"><h2>Sondes</h2></div><p class="small muted">non disponible — aucune mesure enregistrée.</p></section>
  </div>

  <section class="panel">
    <div class="ph"><h2>Courbes (24 h)</h2></div>
    <div v-if="statusData?.stats?.length" class="tw">
      <table>
        <thead><tr><th>Cible</th><th>Mesures</th><th>Taux OK</th><th>Médiane</th><th>95ᵉ centile</th></tr></thead>
        <tbody>
          <tr v-for="s in statusData.stats" :key="s.target">
            <td>{{ targetLabel[s.target] ?? s.target }}</td>
            <td>{{ s.n }}</td>
            <td>{{ s.n ? Math.round(s.okRate * 100) + ' %' : 'non disponible' }}</td>
            <td>{{ s.medianMs }} ms</td>
            <td>{{ s.p95Ms }} ms</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="small muted">Historique des sondes (dernières 120, toutes cibles confondues), de récent à ancien.</p>
    <ul class="list">
      <li v-for="(c, i) in checksData?.checks ?? []" :key="i">
        <span class="sev" :class="c.ok ? 'ok' : 'crit'" />
        <span>{{ targetLabel[c.target] ?? c.target }} · {{ c.ms !== null ? c.ms + ' ms' : '—' }}<template v-if="c.error"> · {{ c.error }}</template></span>
        <span class="small muted">{{ formatDateTime(c.at) }}</span>
      </li>
    </ul>
    <p v-if="!checksData?.checks?.length" class="small muted">non disponible</p>
  </section>

  <section class="panel">
    <div class="ph"><h2>Alertes</h2><span class="chip" :class="alertsData?.alerts.filter((a) => a.status === 'open').length ? 'crit' : 'ok'">{{ alertsData?.alerts.filter((a) => a.status !== 'resolved').length ?? 0 }} actives</span></div>
    <div class="tw">
      <table v-if="alertsData?.alerts.length">
        <thead><tr><th>Règle</th><th>Gravité</th><th>Statut</th><th>Occurrences</th><th>Dernière</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="a in alertsData.alerts" :key="a.id">
            <td>{{ a.rule }}</td>
            <td><span class="chip" :class="a.severity === 'critical' ? 'crit' : 'warn'">{{ a.severity === 'critical' ? 'critique' : 'attention' }}</span></td>
            <td>{{ { open: 'ouverte', acknowledged: 'prise en charge', resolved: 'résolue' }[a.status] }}</td>
            <td>{{ a.count }}</td>
            <td class="small">{{ formatDateTime(a.lastAt) }}</td>
            <td class="nowrap">
              <button v-if="a.status === 'open'" class="btn ghost" type="button" @click="act(a.id, 'acknowledge')">Prise en charge</button>
              <button v-if="a.status !== 'resolved'" class="btn ghost" type="button" @click="act(a.id, 'resolve')">Résoudre</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="alertsData && !alertsData.alerts.length" class="small muted">Aucune alerte.</p>
  </section>

  <div class="grid g2">
    <section class="panel">
      <div class="ph"><h2>Nouvel incident</h2></div>
      <form class="row" @submit.prevent="createIncident">
        <input v-model="draft.title" class="inp" placeholder="Titre" aria-label="Titre de l'incident" required minlength="2" maxlength="240">
        <select v-model="draft.severity" class="inp" aria-label="Gravité">
          <option value="warning">Attention</option>
          <option value="critical">Critique</option>
        </select>
        <button class="btn" type="submit" :disabled="busy">Créer</button>
      </form>
    </section>
    <section class="panel">
      <div class="ph"><h2>Incidents</h2></div>
      <ul class="list">
        <li v-for="inc in incidentsData?.incidents ?? []" :key="inc.id">
          <span class="sev" :class="inc.severity === 'critical' ? 'crit' : 'warn'" />
          <span><strong>{{ inc.number }}</strong> · {{ inc.title }}<br><span class="small muted">{{ { open: 'ouvert', acknowledged: 'pris en charge', resolved: 'résolu' }[inc.status] }} · {{ formatDateTime(inc.openedAt) }}</span></span>
          <span class="nowrap">
            <button class="btn ghost" type="button" :aria-expanded="selectedIncident === inc.id" @click="selectedIncident = selectedIncident === inc.id ? null : inc.id">Notes</button>
            <button v-if="inc.status === 'open'" class="btn ghost" type="button" @click="ack(inc)">Prise en charge</button>
          </span>
        </li>
      </ul>
      <p v-if="incidentsData && !incidentsData.incidents.length" class="small muted">Aucun incident.</p>
      <div v-if="selectedIncident" class="inc-notes">
        <ul class="list">
          <li v-for="(n, i) in notesData?.notes ?? []" :key="i"><span class="sev" /><span>{{ n.text }}</span><span class="small muted">{{ formatDateTime(n.at) }}</span></li>
        </ul>
        <form class="row" @submit.prevent="addNote">
          <input v-model="noteText" class="inp" placeholder="Note horodatée" aria-label="Nouvelle note">
          <button class="btn sec" type="submit">Ajouter</button>
        </form>
        <form class="row" @submit.prevent="resolve(incidentsData!.incidents.find((x) => x.id === selectedIncident)!)">
          <input v-model="resolution" class="inp" placeholder="Note de résolution (obligatoire pour résoudre)" aria-label="Note de résolution">
          <button class="btn" type="submit">Résoudre</button>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.inc-notes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line, #e5e0d5);
}
</style>
