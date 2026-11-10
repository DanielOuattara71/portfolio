<script setup lang="ts">
/** Backups (docs/admin/06): history, verify, full + partial restore. No download route exists. */
useHead({ title: 'Sauvegardes · Administration' })

interface Backup {
  id: number
  startedAt: string
  finishedAt: string | null
  trigger: 'scheduled' | 'manual'
  objectKey: string | null
  bytes: number | null
  sha256: string | null
  schemaVersion: string | null
  rowCounts: Record<string, number> | null
  result: 'success' | 'failed' | 'pending'
  verifiedAt: string | null
  restoreTestedAt: string | null
  error: string | null
}

const { data, refresh } = useFetch<{ backups: Backup[] }>('/api/admin/backups', { server: false })
const busy = ref<number | string | null>(null)
const message = ref('')
const partType = ref('project')
const partKey = ref('')

const bytesLabel = (n: number | null) => (n === null ? '—' : n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} Mo` : `${Math.round(n / 1000)} Ko`)
const resultLabel = (r: string) => ({ success: 'réussie', failed: 'échouée', pending: 'en cours' })[r] ?? r

async function runBackup() {
  busy.value = 'run'
  message.value = ''
  try {
    await $fetch('/api/admin/backups', { method: 'POST' })
    message.value = 'Sauvegarde créée et vérifiée.'
  } catch (e: unknown) {
    message.value = `Échec : ${(e as { data?: { detail?: string } })?.data?.detail ?? 'voir le journal'}`
  } finally {
    busy.value = null
    await refresh()
  }
}

async function verify(id: number) {
  busy.value = id
  message.value = ''
  try {
    await $fetch(`/api/admin/backups/${id}/verify`, { method: 'POST' })
    message.value = `Sauvegarde ${id} vérifiée (dé-chiffrée, empreinte OK).`
  } catch (e: unknown) {
    message.value = `Vérification échouée : ${(e as { data?: { detail?: string } })?.data?.detail ?? 'voir le journal'}`
  } finally {
    busy.value = null
    await refresh()
  }
}

async function restore(id: number) {
  if (!window.confirm(`Restaurer la sauvegarde ${id} ? L'état actuel est sauvegardé d'abord, puis tout est remplacé. Les sessions seront révoquées.`)) return
  busy.value = id
  message.value = ''
  try {
    await $fetch(`/api/admin/backups/${id}/restore`, { method: 'POST' })
    message.value = `Sauvegarde ${id} restaurée. Reconnecte-toi.`
  } catch (e: unknown) {
    message.value = `Restauration échouée : ${(e as { data?: { detail?: string } })?.data?.detail ?? 'voir le journal'}`
  } finally {
    busy.value = null
    await refresh()
  }
}

async function restorePartial(id: number) {
  if (!partKey.value.trim()) return
  busy.value = `p${id}`
  message.value = ''
  try {
    await $fetch(`/api/admin/backups/${id}/restore-partial`, { method: 'POST', body: { type: partType.value, key: partKey.value.trim() } })
    message.value = `${partType.value}:${partKey.value.trim()} restauré comme brouillon.`
  } catch (e: unknown) {
    message.value = `Restauration partielle échouée : ${(e as { data?: { detail?: string } })?.data?.detail ?? 'voir le journal'}`
  } finally {
    busy.value = null
    await refresh()
  }
}
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Sauvegardes</h1>
      <p class="muted">Export quotidien chiffré (AES-256-GCM), vérifié par relecture. Aucun téléchargement : on vérifie ou on restaure. Conservation : 30 quotidiennes + 12 mensuelles.</p>
    </div>
    <button class="btn" type="button" :disabled="busy === 'run'" @click="runBackup">Lancer une sauvegarde</button>
  </div>

  <p v-if="message" class="small muted" role="status">{{ message }}</p>

  <div class="tw">
    <table>
      <thead><tr><th>Date</th><th>Déclencheur</th><th>Taille</th><th>Résultat</th><th>Vérifiée</th><th>Essai de restauration</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>
        <tr v-for="b in data?.backups ?? []" :key="b.id">
          <td class="small">{{ formatDateTime(b.startedAt) }}<span v-if="b.error" class="small crit"> · {{ b.error }}</span></td>
          <td>{{ b.trigger === 'manual' ? 'manuelle' : 'planifiée' }}</td>
          <td>{{ bytesLabel(b.bytes) }}</td>
          <td><span class="chip" :class="b.result === 'success' ? 'ok' : b.result === 'failed' ? 'crit' : 'warn'">{{ resultLabel(b.result) }}</span></td>
          <td class="small">{{ b.verifiedAt ? formatDateTime(b.verifiedAt) : '—' }}</td>
          <td class="small">{{ b.restoreTestedAt ? formatDateTime(b.restoreTestedAt) : '—' }}</td>
          <td class="nowrap">
            <button class="btn ghost" type="button" :disabled="busy === b.id" @click="verify(b.id)">Vérifier</button>
            <button class="btn ghost" type="button" :disabled="busy === b.id" @click="restore(b.id)">Restaurer</button>
            <span class="small">partielle :</span>
            <input v-model="partType" class="inp mini" aria-label="Type du contenu" placeholder="type">
            <input v-model="partKey" class="inp mini" aria-label="Clé du contenu" placeholder="clé">
            <button class="btn ghost" type="button" :disabled="busy === `p${b.id}`" @click="restorePartial(b.id)">En brouillon</button>
          </td>
        </tr>
        <tr v-if="data && !data.backups.length"><td colspan="7" class="muted">Aucune sauvegarde.</td></tr>
      </tbody>
    </table>
  </div>
  <p class="small muted">Une sauvegarde n'est fiable qu'après un essai de restauration réussi : tant qu'aucun n'a réussi, le tableau de bord affiche « non vérifiées ».</p>
</template>

<style scoped>
.mini {
  width: 90px;
}
</style>
