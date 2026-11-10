<script setup lang="ts">
/** Password reset request. The answer is the same whether the account exists or not. */
definePageMeta({ layout: 'auth' })
useHead({ title: 'Mot de passe oublié · Administration' })

const auth = useAuthClient()
const email = ref('')
const sent = ref(false)
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  const { error: err } = await auth.requestPasswordReset({ email: email.value.trim(), redirectTo: '/reinitialiser' })
  busy.value = false
  if (err && err.status === 429) {
    error.value = authErrorMessage(err)
    return
  }
  sent.value = true
}
</script>

<template>
  <h1>Mot de passe oublié</h1>
  <p v-if="sent" class="alert info" role="status">
    Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé. Il est valable 30 minutes.
  </p>
  <form v-else class="form" novalidate @submit.prevent="submit">
    <p v-if="error" class="alert crit" role="alert">{{ error }}</p>
    <div class="field">
      <label for="email">Email du compte</label>
      <input id="email" v-model="email" class="inp" type="email" autocomplete="username" required autofocus>
    </div>
    <button class="btn" type="submit" :disabled="busy || !email">Envoyer le lien</button>
  </form>
  <NuxtLink class="small muted" to="/connexion">Retour à la connexion</NuxtLink>
</template>

<style scoped>
.form {
  display: grid;
  gap: 14px;
}
</style>
