import { twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import { can, type Permission } from '@portfolio/shared/permissions'

/**
 * Session state for the admin. The session itself lives in an HttpOnly cookie set by the API:
 * nothing about it is stored in localStorage (docs/admin/04 §1).
 */
export interface Me {
  user: { id: string; email: string; name: string; role: 'admin' | 'editor' | 'viewer'; twoFactorEnabled: boolean }
  permissions: string[]
  mfaSetupRequired: boolean
  session: { createdAt: string; expiresAt: string; absoluteExpiresAt: string }
}

let client: ReturnType<typeof makeClient> | null = null
function makeClient() {
  return createAuthClient({
    baseURL: window.location.origin,
    basePath: '/api/auth',
    plugins: [twoFactorClient()],
  })
}
export function useAuthClient() {
  client ??= makeClient()
  return client
}

export function useMe() {
  return useState<Me | null>('me', () => null)
}

const loadedAt = { value: 0 }

/** Fetches /api/admin/me (null when signed out). Cached for 30 s unless `force`. */
export async function loadMe(force = false): Promise<Me | null> {
  const me = useMe()
  if (!force && me.value && Date.now() - loadedAt.value < 30_000) return me.value
  try {
    me.value = await $fetch<Me>('/api/admin/me')
  } catch {
    me.value = null
  }
  loadedAt.value = Date.now()
  return me.value
}

export function useCan() {
  const me = useMe()
  return (permission: Permission) => can(me.value?.user.role, permission)
}

export async function signOut() {
  await useAuthClient().signOut()
  useMe().value = null
  loadedAt.value = 0
  await navigateTo('/connexion')
}

/** Error text shown to people: same message whatever the cause, so nothing leaks (docs/admin/04 §4). */
export function authErrorMessage(error: { status?: number; code?: string; message?: string } | null | undefined): string {
  if (!error) return ''
  if (error.status === 429 || error.code === 'LOCKED') return 'Trop de tentatives. Réessaie dans 15 minutes.'
  if (error.code === 'PASSWORD_COMPROMISED') return 'Ce mot de passe figure dans une fuite de données connue. Choisis-en un autre.'
  if (error.code === 'PASSWORD_TOO_SHORT') return 'Le mot de passe doit faire au moins 12 caractères.'
  if (error.code === 'INVALID_CODE' || error.code === 'INVALID_TWO_FACTOR_AUTHENTICATION' || error.code === 'INVALID_BACKUP_CODE') return 'Code incorrect ou expiré.'
  if (error.code === 'INVALID_TOKEN') return 'Ce lien n’est plus valable. Fais une nouvelle demande.'
  if (error.status === 401 || error.code === 'INVALID_EMAIL_OR_PASSWORD' || error.code === 'INVALID_PASSWORD') return 'Email ou mot de passe incorrect.'
  return 'L’opération n’a pas abouti. Réessaie dans un instant.'
}
