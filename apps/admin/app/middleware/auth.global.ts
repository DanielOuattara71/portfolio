/**
 * Every admin page needs a session; an administrator must set up two-factor authentication first.
 * This only steers navigation: the API enforces the same rules on every request.
 */
const PUBLIC = ['/connexion', '/mot-de-passe-oublie', '/reinitialiser']

export default defineNuxtRouteMiddleware(async (to) => {
  const me = await loadMe()
  if (PUBLIC.includes(to.path)) {
    if (me && to.path === '/connexion') return navigateTo(me.mfaSetupRequired ? '/double-authentification' : '/')
    return
  }
  if (!me) return navigateTo({ path: '/connexion', query: to.fullPath !== '/' ? { suite: to.fullPath } : {} })
  if (me.mfaSetupRequired && to.path !== '/double-authentification') return navigateTo('/double-authentification')
})
