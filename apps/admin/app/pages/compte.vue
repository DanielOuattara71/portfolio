<script setup lang="ts">
/** My account: change password (closes other sessions), two-factor status, new backup codes. */
useHead({ title: 'Mon compte · Administration' })

const auth = useAuthClient()
const me = useMe()

const current = ref('')
const next = ref('')
const pwMsg = ref<{ ok: boolean; text: string } | null>(null)
const pwBusy = ref(false)

async function changePassword() {
  pwMsg.value = null
  if (next.value.length < 12) {
    pwMsg.value = { ok: false, text: 'Le nouveau mot de passe doit faire au moins 12 caractères.' }
    return
  }
  pwBusy.value = true
  const { error } = await auth.changePassword({ currentPassword: current.value, newPassword: next.value, revokeOtherSessions: true })
  pwBusy.value = false
  current.value = ''
  next.value = ''
  pwMsg.value = error ? { ok: false, text: authErrorMessage(error) } : { ok: true, text: 'Mot de passe modifié. Tes autres sessions ont été fermées.' }
}

const codesPw = ref('')
const codes = ref<string[]>([])
const codesMsg = ref('')
async function regenerate() {
  codesMsg.value = ''
  const { data, error } = await auth.twoFactor.generateBackupCodes({ password: codesPw.value })
  codesPw.value = ''
  if (error || !data) {
    codesMsg.value = authErrorMessage(error)
    return
  }
  codes.value = data.backupCodes
}
</script>

<template>
  <div class="head">
    <div class="t">
      <h1>Mon compte</h1>
      <p class="muted">{{ me?.user.email }} · {{ { admin: 'Administrateur', editor: 'Éditeur', viewer: 'Lecteur' }[me?.user.role ?? 'viewer'] }}</p>
    </div>
  </div>

  <div class="grid g2">
    <form class="panel" novalidate @submit.prevent="changePassword">
      <h2>Mot de passe</h2>
      <p v-if="pwMsg" class="alert" :class="pwMsg.ok ? 'info' : 'crit'" role="status">{{ pwMsg.text }}</p>
      <div class="field">
        <label for="cur">Mot de passe actuel</label>
        <input id="cur" v-model="current" class="inp" type="password" autocomplete="current-password" required>
      </div>
      <div class="field">
        <label for="new">Nouveau mot de passe</label>
        <input id="new" v-model="next" class="inp" type="password" autocomplete="new-password" minlength="12" required aria-describedby="new-hint">
        <span id="new-hint" class="hint">12 caractères minimum, refusé s'il figure dans une fuite connue. Tes autres sessions seront fermées.</span>
      </div>
      <div><button class="btn" type="submit" :disabled="pwBusy || !current || !next">Changer le mot de passe</button></div>
    </form>

    <section class="panel" aria-labelledby="mfa">
      <div class="ph">
        <h2 id="mfa">Double authentification</h2>
        <span class="chip" :class="me?.user.twoFactorEnabled ? 'ok' : 'warn'">{{ me?.user.twoFactorEnabled ? 'active' : 'inactive' }}</span>
      </div>
      <template v-if="me?.user.twoFactorEnabled">
        <p class="small">Tu as perdu tes codes de secours, ou tu en as utilisé plusieurs ? Génère une nouvelle série : l'ancienne ne fonctionnera plus.</p>
        <form v-if="!codes.length" class="row" novalidate @submit.prevent="regenerate">
          <label class="sr-only" for="cpw">Mot de passe</label>
          <input id="cpw" v-model="codesPw" class="inp" type="password" autocomplete="current-password" placeholder="Mot de passe" style="max-width: 220px">
          <button class="btn sec" type="submit" :disabled="!codesPw">Nouveaux codes de secours</button>
        </form>
        <p v-if="codesMsg" class="alert crit" role="alert">{{ codesMsg }}</p>
        <template v-if="codes.length">
          <p class="alert warn">Conserve ces codes maintenant : ils ne seront plus affichés.</p>
          <ol class="codes"><li v-for="c in codes" :key="c"><code>{{ c }}</code></li></ol>
        </template>
      </template>
      <NuxtLink v-else class="btn" to="/double-authentification">Activer</NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
  margin: 0;
  padding: 12px 12px 12px 32px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}
</style>
