<script setup lang="ts">
import { renderSVG } from 'uqr'

/**
 * Two-factor setup (mandatory for administrators): confirm the password, scan the QR code,
 * type one code to prove it works, then keep the 10 backup codes (shown once).
 */
definePageMeta({ layout: 'auth' })
useHead({ title: 'Double authentification · Administration' })

const auth = useAuthClient()
const me = useMe()

const step = ref<'password' | 'scan' | 'codes'>('password')
const password = ref('')
const code = ref('')
const totpURI = ref('')
const backupCodes = ref<string[]>([])
const kept = ref(false)
const error = ref('')
const busy = ref(false)
const copied = ref(false)

const qr = computed(() => (totpURI.value ? renderSVG(totpURI.value, { border: 1 }) : ''))
const secret = computed(() => {
  try {
    return new URL(totpURI.value).searchParams.get('secret')?.replace(/(.{4})/g, '$1 ').trim() ?? ''
  } catch {
    return ''
  }
})

onMounted(() => {
  if (me.value?.user.twoFactorEnabled) navigateTo('/compte')
})

async function start() {
  error.value = ''
  busy.value = true
  const { data, error: err } = await auth.twoFactor.enable({ password: password.value })
  busy.value = false
  password.value = ''
  if (err || !data || data.method !== 'totp') {
    error.value = authErrorMessage(err)
    return
  }
  totpURI.value = data.totpURI
  backupCodes.value = data.backupCodes
  step.value = 'scan'
}

async function verify() {
  error.value = ''
  busy.value = true
  const { error: err } = await auth.twoFactor.verifyTotp({ code: code.value.replace(/\s/g, '') })
  busy.value = false
  if (err) {
    error.value = authErrorMessage(err)
    code.value = ''
    return
  }
  totpURI.value = ''
  step.value = 'codes'
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(backupCodes.value.join('\n'))
    copied.value = true
  } catch {
    copied.value = false
  }
}

async function done() {
  backupCodes.value = []
  await loadMe(true)
  await navigateTo('/')
}
</script>

<template>
  <h1>Double authentification</h1>
  <p v-if="error" class="alert crit" role="alert">{{ error }}</p>

  <form v-if="step === 'password'" class="form" novalidate @submit.prevent="start">
    <p class="small">
      Obligatoire pour un administrateur. À chaque connexion, en plus du mot de passe, tu saisiras un code à 6 chiffres
      donné par une application d'authentification (Google Authenticator, 1Password, Microsoft Authenticator…).
    </p>
    <div class="field">
      <label for="pw">Confirme ton mot de passe</label>
      <input id="pw" v-model="password" class="inp" type="password" autocomplete="current-password" required autofocus>
    </div>
    <button class="btn" type="submit" :disabled="busy || !password">Continuer</button>
    <button class="btn ghost" type="button" @click="signOut()">Se déconnecter</button>
  </form>

  <form v-else-if="step === 'scan'" class="form" novalidate @submit.prevent="verify">
    <p class="small">1. Scanne ce QR code avec ton application.</p>
    <!-- SVG generated locally from the setup link returned by the API (not user content). -->
    <div class="qr" role="img" aria-label="QR code de configuration" v-html="qr" />
    <p class="small muted">Impossible de scanner ? Saisis cette clé dans l'application : <code class="secret">{{ secret }}</code></p>
    <div class="field">
      <label for="code">2. Saisis le code affiché</label>
      <input id="code" v-model="code" class="inp codein" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
    </div>
    <button class="btn" type="submit" :disabled="busy || code.length < 6">Vérifier</button>
  </form>

  <div v-else class="form">
    <p class="alert info">Double authentification activée.</p>
    <p class="small">
      Voici tes <b>10 codes de secours</b>. Chacun permet une connexion si tu perds ton téléphone. Conserve-les dans ton gestionnaire
      de mots de passe : <b>ils ne seront plus affichés</b>.
    </p>
    <ol class="codes">
      <li v-for="c in backupCodes" :key="c"><code>{{ c }}</code></li>
    </ol>
    <button class="btn sec" type="button" @click="copyCodes">{{ copied ? 'Codes copiés' : 'Copier les codes' }}</button>
    <label class="row small"><input v-model="kept" type="checkbox"> J'ai conservé mes codes de secours</label>
    <button class="btn" type="button" :disabled="!kept" @click="done">Terminer</button>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 14px;
}

.qr {
  justify-self: center;
  width: 200px;
  padding: 8px;
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  /* QR codes need dark modules on a light background in both themes. */
  color: var(--ink);
}

.qr :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.secret {
  overflow-wrap: anywhere;
  font-size: 12px;
}

.codein {
  font-size: 20px;
  letter-spacing: 0.3em;
  text-align: center;
}

.codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
  margin: 0;
  padding: 12px 12px 12px 32px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  font-size: 14px;
}
</style>
