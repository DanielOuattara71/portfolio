/**
 * When any API call answers 401 (session expired, revoked elsewhere), go back to the sign-in page
 * instead of leaving a half-working screen. Work in progress is already saved server-side.
 */
export default defineNuxtPlugin(() => {
  const base = globalThis.$fetch
  globalThis.$fetch = base.create({
    onResponseError({ request, response }) {
      // /me answering 401 just means "not signed in": the route middleware handles it.
      if (String(request).includes('/api/admin/me')) return
      if (response.status === 401 &&!['/connexion', '/mot-de-passe-oublie', '/reinitialiser'].includes(useRoute().path)) {
        useMe().value = null
        navigateTo({ path: '/connexion', query: { expiree: '1' } })
      }
    },
  }) as typeof base
})
