<script setup lang="ts">
/** Sign-in: email + password, then the 6-digit code (or a backup code) when two-factor is on. */
definePageMeta({ layout: 'auth' })
useHead({ title: 'Connexion · Administration' })

const route = useRoute()
const auth = useAuthClient()

const step = ref<'password' | 'code' | 'backup'>('password')
const email = ref('')
const password = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)
const expired = computed(() => route.query.expiree === '1')

async function finish() {
  const me = await loadMe(true)
  const next = typeof route.query.suite === 'string' && route.query.suite.startsWith('/') ? route.query.suite : '/'
  await navigateTo(me?.mfaSetupRequired ? '/double-authentification' : next)
}

async function submitPassword() {
  error.value = ''
  busy.value = true
  const { data, error: err } = await auth.signIn.email({ email: email.value.trim(), password: password.value })
  busy.value = false
  if (err) {
    error.value = authErrorMessage(err)
    return
  }
  password.value = ''
  if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
    step.value = 'code'
    await nextTick()
    document.getElementById('code')?.focus()
    return
  }
  await finish()
}

async function submitCode() {
  error.value = ''
  busy.value = true
  const value = code.value.replace(/\s/g, '')
  const { error: err } =
    step.value === 'code' ? await auth.twoFactor.verifyTotp({ code: value }) : await auth.twoFactor.verifyBackupCode({ code: value })
  busy.value = false
  if (err) {
    error.value = authErrorMessage(err)
    code.value = ''
    return
  }
  await finish()
}

function useBackup() {
  step.value = 'backup'
  code.value = ''
  error.value = ''
}
</script>

<template>
  <h1>{{ step === 'password' ? 'Connexion' : 'Double authentification' }}</h1>

  <p v-if="expired && step === 'password'" class="alert info">Ta session a expiré. Reconnecte-toi pour continuer.</p>
  <p v-if="error" class="alert crit" role="alert">{{ error }}</p>

  <form v-if="step === 'password'" class="form" novalidate @submit.prevent="submitPassword">
    <div class="field">
      <label for="email">Email</label>
      <input id="email" v-model="email" class="inp" type="email" autocomplete="username" required autofocus>
    </div>
    <div class="field">
      <label for="password">Mot de passe</label>
      <input id="password" v-model="password" class="inp" type="password" autocomplete="current-password" required>
    </div>
    <button class="btn" type="submit" :disabled="busy || !email || !password">{{ busy ? 'Vérification…' : 'Continuer' }}</button>
    <NuxtLink class="small muted" to="/mot-de-passe-oublie">Mot de passe oublié ?</NuxtLink>
  </form>

  <form v-else class="form" novalidate @submit.prevent="submitCode">
    <p class="small muted">
      {{ step === 'code' ? "Saisis le code à 6 chiffres affiché par ton application d'authentification." : 'Saisis un de tes codes de secours. Chaque code ne sert qu’une fois.' }}
    </p>
    <div class="field">
      <label for="code">{{ step === 'code' ? 'Code' : 'Code de secours' }}</label>
      <input
        id="code"
        v-model="code"
        class="inp code"
        :inputmode="step === 'code' ? 'numeric' : 'text'"
        autocomplete="one-time-code"
        :maxlength="step === 'code' ? 6 : 24"
        required
      >
    </div>
    <button class="btn" type="submit" :disabled="busy || !code">{{ busy ? 'Vérification…' : 'Se connecter' }}</button>
    <button v-if="step === 'code'" class="btn ghost" type="button" @click="useBackup">Utiliser un code de secours</button>
  </form>

  <p class="small muted">Pas d'inscription publique : les comptes sont créés par l'administrateur.</p>
</template>

<style scoped>
.form {
  display: grid;
  gap: 14px;
}

.code {
  font-size: 20px;
  letter-spacing: 0.3em;
  text-align: center;
}
</style>
