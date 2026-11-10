<script setup lang="ts">
/**
 * Dashboard (docs/admin/02 §A): real figures only, every number verifiable in SQL.
 * Monitoring/alerts/backups: "not available" until module 10.
 */
useHead({ title: 'Tableau de bord · Administration' })

interface Dashboard {
  projects: Record<string, number>
  blocks: Record<string, number>
  todos: { kind: string; label: string; detail: string | null; link: string }[]
  unreadMessages: number
  recentActions: { id: number; at: string; actorEmail: string | null; actorRole: string | null; action: string; resourceLabel: string | null; result: string; severity: string }[]
  monitoring: { available: boolean; checks: Record<string, { ok: boolean | null; ms: number | null; at: string | null; n24h: number; okRate24h: number }>; openAlertsCount: number; openIncidents: number; chainOk: boolean }
  alerts: { available: boolean; open: { id: number; rule: string; severity: string; count: number; lastAt: string }[] }
  backup: { available: boolean; lastSuccess: { at: string | null; bytes: number | null; verified: boolean; restoreTested: boolean } | null; lastFailure: { at: string | null; error: string | null } | null; verified: boolean }
  generatedAt: string
}
interface Health {
  status: 'ok' | 'degraded'
  database: 'up' | 'down' | 'not_configured'
  time: string
}

const { data: data, status, refresh } = useFetch<Dashboard>('/api/admin/dashboard', { server: false })
const { data: health, refresh: refreshHealth, status: hStatus } = useFetch<Health>('/api/health', { server: false })

const loading = computed(() => status.value === 'pending')
const api = computed(() => {
  if (hStatus.value === 'pending') return { cls: '', text: 'vérification…' }
  if (!health.value) return { cls: 'crit', text: 'injoignable' }
  return { cls: 'ok', text: 'en ligne' }
})
const database = computed(() => {
  const d = health.value?.database
  if (!d) return { cls: '', text: 'inconnue' }
  return { up: { cls: 'ok', text: 'en ligne' }, down: { cls: 'crit', text: 'injoignable' }, not_configured: { cls: 'warn', text: 'non configurée' } }[d]
})
const checkedAt = computed(() => (health.value ? new Date(health.value.time).toLocaleTimeString('fr-FR') : null))

const stateLabel: Record<string, string> = { draft: 'Brouillons', in_review: 'En révision', published: 'Publiés', archived: 'Archivés' }
const resultLabel = (r: string) => ({ success: 'succès', failure: 'échec', denied: 'refusé' })[r] ?? r
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Tableau de bord</h1>
      <p class="muted">Chiffres réels, calculés depuis la base. Rien d'exemple.</p>
    </div>
    <div class="row">
      <NuxtLink class="btn sec" to="/projets">Nouveau projet</NuxtLink>
      <NuxtLink class="btn sec" to="/textes">Modifier le Hero</NuxtLink>
      <NuxtLink class="btn sec" to="/medias">Importer un média</NuxtLink>
      <button class="btn sec" type="button" @click="refresh(); refreshHealth()">Actualiser</button>
    </div>
  </div>

  <p v-if="loading && !data" class="sk" style="height: 200px" />

  <template v-else-if="data">
    <div class="grid g4">
      <section class="panel" aria-labelledby="d-projs">
        <div class="ph"><h2 id="d-projs">Projets</h2></div>
        <ul class="list">
          <li v-for="s in (['published', 'draft', 'in_review', 'archived'] as const)" :key="s"><span class="sev" :class="s === 'published' ? 'ok' : s === 'archived' ? '' : 'warn'" /><span>{{ stateLabel[s] }}</span><span class="chip">{{ data.projects[s] ?? 0 }}</span></li>
        </ul>
      </section>
      <section class="panel" aria-labelledby="d-blocks">
        <div class="ph"><h2 id="d-blocks">Blocs</h2></div>
        <ul class="list">
          <li v-for="s in (['published', 'draft', 'in_review', 'archived'] as const)" :key="s"><span class="sev" :class="s === 'published' ? 'ok' : s === 'archived' ? '' : 'warn'" /><span>{{ stateLabel[s] }}</span><span class="chip">{{ data.blocks[s] ?? 0 }}</span></li>
        </ul>
      </section>
      <section class="panel" aria-labelledby="d-msg">
        <div class="ph"><h2 id="d-msg">Messages</h2></div>
        <p class="stat"><span class="n">{{ data.unreadMessages }}</span><span class="small muted">non lus</span></p>
        <NuxtLink class="btn sec" to="/messages">Ouvrir la boîte</NuxtLink>
      </section>
      <section class="panel" aria-labelledby="d-svc">
        <div class="ph"><h2 id="d-svc">Services</h2><span class="chip" :class="data.monitoring.chainOk ? 'ok' : 'crit'">{{ data.monitoring.chainOk ? 'journal intègre' : 'journal rompu' }}</span></div>
        <ul class="list">
          <li><span class="sev" :class="api.cls" /><span>API</span><span class="chip" :class="api.cls">{{ api.text }}</span></li>
          <li><span class="sev" :class="database.cls" /><span>Base de données</span><span class="chip" :class="database.cls">{{ database.text }}</span></li>
          <li v-for="(m, k) in data.monitoring.checks" :key="k">
            <span class="sev" :class="m.ok === null ? 'warn' : m.ok ? 'ok' : 'crit'" />
            <span class="capitalize">{{ k }}<span v-if="m.at" class="small muted"> · {{ formatDateTime(m.at) }}</span><span v-if="!m.at" class="small muted"> · non disponible</span></span>
            <span class="chip" :class="m.ok === null ? 'warn' : m.ok ? 'ok' : 'crit'">{{ m.ok === null ? 'non disponible' : m.ok ? (m.ms + ' ms') : 'échec' }}</span>
          </li>
          <li v-if="data.monitoring.openAlertsCount"><span class="sev crit" /><span>Alertes ouvertes</span><NuxtLink to="/securite">{{ data.monitoring.openAlertsCount }}</NuxtLink></li>
          <li v-if="data.monitoring.openIncidents"><span class="sev crit" /><span>Incidents ouverts</span><NuxtLink to="/securite">{{ data.monitoring.openIncidents }}</NuxtLink></li>
          <li>
            <span class="sev" :class="data.backup.lastSuccess ? 'ok' : 'warn'" />
            <span>Sauvegarde<span v-if="data.backup.lastSuccess" class="small muted"> · {{ data.backup.lastSuccess.at ? formatDateTime(data.backup.lastSuccess.at) : '' }}</span><span v-else class="small muted"> · non disponible</span></span>
            <NuxtLink :to="data.backup.verified ? '/sauvegardes' : '/sauvegardes'">{{ data.backup.verified ? 'vérifiées' : 'non vérifiées' }}</NuxtLink>
          </li>
        </ul>
        <p v-if="checkedAt" class="small muted">mesuré à {{ checkedAt }} · sondes 24 h ({{ Object.values(data.monitoring.checks).reduce((acc, c) => acc + c.n24h, 0) }} mesures)</p>
        <p v-if="data.backup.lastFailure" class="small crit">Dernière sauvegarde échouée le {{ data.backup.lastFailure.at ? formatDateTime(data.backup.lastFailure.at) : '' }}.</p>
      </section>
    </div>

    <div class="grid g2">
      <section class="panel" aria-labelledby="d-todo">
        <div class="ph"><h2 id="d-todo">À compléter</h2><span class="chip" :class="data.todos.length ? 'warn' : 'ok'">{{ data.todos.length }}</span></div>
        <ul v-if="data.todos.length" class="list">
          <li v-for="(t, i) in data.todos.slice(0, 12)" :key="i">
            <span class="sev warn" /><span>{{ t.label }}<template v-if="t.detail"> · {{ t.detail }}</template></span><NuxtLink :to="t.link">Aller</NuxtLink>
          </li>
        </ul>
        <p v-else class="small muted">Rien à compléter.</p>
        <NuxtLink v-if="data.todos.length > 12" to="/traductions">Voir les traductions</NuxtLink>
      </section>

      <section class="panel" aria-labelledby="d-act">
        <div class="ph"><h2 id="d-act">Activité récente</h2></div>
        <ul class="list">
          <li v-for="e in data.recentActions" :key="e.id">
            <span class="sev" :class="e.severity === 'critical' ? 'crit' : e.severity === 'warning' ? 'warn' : ''" />
            <span>{{ actionLabel(e.action) }}<template v-if="e.resourceLabel"> · {{ e.resourceLabel }}</template><br><span class="small muted">{{ e.actorEmail ?? e.actorRole ?? 'système' }} · {{ formatDateTime(e.at) }}</span></span>
            <span class="chip" :class="e.result === 'success' ? 'ok' : 'crit'">{{ resultLabel(e.result) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </template>
</template>

<style scoped>
.sp {
  flex: 1;
}
</style>
