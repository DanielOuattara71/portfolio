<script setup lang="ts">
/** Active sessions (own, or every account for an administrator) and recent sign-in attempts. */
useHead({ title: 'Sessions · Administration' })

interface SessionRow { id: string; userEmail: string; device: string | null; ip: string | null; createdAt: string; lastActiveAt: string; expiresAt: string; current: boolean }
interface Attempt { at: string; userEmail: string | null; ip: string | null; device: string | null; result: string }

const allowed = useCan()
const showAll = allowed('security.sessions.all')
const auth = useAuthClient()

const scope = ref<'own' | 'all'>('own')
const { data, refresh, status } = useFetch<{ sessions: SessionRow[] }>('/api/admin/security/sessions', { query: { scope }, server: false })
const { data: logins } = useFetch<{ attempts: Attempt[] }>('/api/admin/security/logins', { server: false, immediate: showAll })

const message = ref('')
const confirmAll = ref(false)

async function revoke(s: SessionRow) {
  await $fetch(`/api/admin/security/sessions/${encodeURIComponent(s.id)}`, { method: 'DELETE' })
  message.value = `Session ${s.device ?? ''} révoquée.`
  await refresh()
}

async function revokeOthers() {
  confirmAll.value = false
  await auth.revokeOtherSessions()
  message.value = 'Toutes tes autres sessions ont été fermées.'
  await refresh()
}

const resultClass = (r: string) => (r === 'success' ? 'ok' : r === 'password_ok' ? '' : 'crit')
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Sessions</h1>
      <p class="muted">Une session expire après 2 h d'inactivité, et au plus tard 7 jours après la connexion.</p>
    </div>
    <div class="row">
      <div v-if="showAll" class="seg" role="group" aria-label="Sessions affichées">
        <button type="button" :aria-pressed="scope === 'own'" @click="scope = 'own'">Les miennes</button>
        <button type="button" :aria-pressed="scope === 'all'" @click="scope = 'all'">Tous les comptes</button>
      </div>
      <button class="btn sec" type="button" @click="confirmAll = true">Déconnecter mes autres sessions</button>
    </div>
  </div>

  <p v-if="message" class="alert info" role="status">{{ message }}</p>
  <div v-if="confirmAll" class="alert warn confirm" role="alertdialog" aria-labelledby="ca-t">
    <span id="ca-t">Toutes tes sessions sauf celle-ci seront fermées immédiatement.</span>
    <span class="row"><button class="btn sec" type="button" @click="confirmAll = false">Annuler</button><button class="btn danger" type="button" @click="revokeOthers">Déconnecter</button></span>
  </div>

  <div class="tw">
    <table>
      <thead>
        <tr><th>Appareil</th><th v-if="scope === 'all'">Compte</th><th>Adresse</th><th>Ouverte</th><th>Dernière activité</th><th><span class="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        <tr v-if="status === 'pending'"><td colspan="6"><div class="sk" style="height: 14px" /></td></tr>
        <tr v-for="s in data?.sessions ?? []" :key="s.id">
          <td>{{ s.device ?? 'Inconnu' }} <span v-if="s.current" class="chip ok">cette session</span></td>
          <td v-if="scope === 'all'">{{ s.userEmail }}</td>
          <td class="small">{{ s.ip ?? '—' }}</td>
          <td class="small">{{ formatDateTime(s.createdAt) }}</td>
          <td class="small">{{ formatDateTime(s.lastActiveAt) }}</td>
          <td><button v-if="!s.current" class="btn sec" type="button" @click="revoke(s)">Révoquer</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <section v-if="showAll" class="panel" aria-labelledby="hist">
    <div class="ph"><h2 id="hist">Tentatives de connexion</h2><span class="small muted">100 dernières · conservées 90 jours</span></div>
    <p v-if="!logins?.attempts.length" class="small muted">Aucune tentative enregistrée.</p>
    <div v-else class="tw">
      <table>
        <thead><tr><th>Date</th><th>Compte</th><th>Résultat</th><th>Appareil</th><th>Adresse</th></tr></thead>
        <tbody>
          <tr v-for="(a, i) in logins.attempts" :key="i">
            <td class="small">{{ formatDateTime(a.at) }}</td>
            <td>{{ a.userEmail ?? 'compte inconnu' }}</td>
            <td><span class="chip" :class="resultClass(a.result)">{{ loginResultLabel(a.result) }}</span></td>
            <td class="small">{{ a.device ?? '—' }}</td>
            <td class="small">{{ a.ip ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
</style>
