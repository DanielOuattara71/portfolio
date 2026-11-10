<script setup lang="ts">
/** New password from the emailed link. All sessions are closed afterwards (API setting). */
definePageMeta({ layout: 'auth' })
useHead({ title: 'Nouveau mot de passe · Administration' })

const route = useRoute()
const auth = useAuthClient()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const linkError = computed(() => route.query.error === 'INVALID_TOKEN' || !token.value)

const password = ref('')
const confirm = ref('')
const error = ref('')
const done = ref(false)
const busy = ref(false)
const mismatch = computed(() => confirm.value.length > 0 && confirm.value !== password.value)

async function submit() {
  error.value = ''
  if (password.value.length < 12) {
    error.value = 'Le mot de passe doit faire au moins 12 caractères.'
    return
  }
  if (mismatch.value) return
  busy.value = true
  const { error: err } = await auth.resetPassword({ newPassword: password.value, token: token.value })
  busy.value = false
  if (err) {
    error.value = authErrorMessage(err)
    return
  }
  done.value = true
}
</script>

<template>
  <h1>Nouveau mot de passe</h1>
  <template v-if="done">
    <p class="alert info" role="status">Mot de passe modifié. Toutes les sessions ont été fermées.</p>
    <NuxtLink class="btn" to="/connexion">Se connecter</NuxtLink>
  </template>
  <template v-else-if="linkError">
    <p class="alert crit" role="alert">Ce lien n'est plus valable. Fais une nouvelle demande.</p>
    <NuxtLink class="btn sec" to="/mot-de-passe-oublie">Nouvelle demande</NuxtLink>
  </template>
  <form v-else class="form" novalidate @submit.prevent="submit">
    <p v-if="error" class="alert crit" role="alert">{{ error }}</p>
    <div class="field">
      <label for="pw">Nouveau mot de passe</label>
      <input id="pw" v-model="password" class="inp" type="password" autocomplete="new-password" minlength="12" required aria-describedby="pw-hint">
      <span id="pw-hint" class="hint">12 caractères minimum. Un mot de passe déjà paru dans une fuite connue est refusé.</span>
    </div>
    <div class="field">
      <label for="pw2">Confirme le mot de passe</label>
      <input id="pw2" v-model="confirm" class="inp" type="password" autocomplete="new-password" required :aria-invalid="mismatch" aria-describedby="pw2-err">
      <span v-if="mismatch" id="pw2-err" class="hint err">Les deux mots de passe sont différents.</span>
    </div>
    <button class="btn" type="submit" :disabled="busy || !password || !confirm">Enregistrer</button>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  gap: 14px;
}
</style>
