import type { Role } from './constants'

/**
 * Named rights checked by every admin route (docs/admin/04-securite-authentification.md §3).
 * Hiding a button is never a protection: the API checks the right itself.
 */
export const PERMISSIONS = [
  'dashboard.read',
  'content.read',
  'content.write',
  'content.submit',
  'content.publish',
  'content.delete',
  'media.write',
  'media.delete.own',
  'media.delete.any',
  'settings.update',
  'messages.read',
  'messages.delete',
  'users.manage',
  'audit.read.own',
  'audit.read.all',
  'security.sessions.own',
  'security.sessions.all',
  'monitoring.read',
  'backups.read',
  'backups.run',
] as const
export type Permission = (typeof PERMISSIONS)[number]

const viewer: Permission[] = ['dashboard.read', 'content.read', 'security.sessions.own']
const editor: Permission[] = [
  ...viewer,
  'content.write',
  'content.submit',
  'media.write',
  'media.delete.own',
  'messages.read',
  'audit.read.own',
]
const admin: Permission[] = [...PERMISSIONS]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = { admin, editor, viewer }

export function can(role: string | null | undefined, permission: Permission): boolean {
  return !!role && (ROLE_PERMISSIONS[role as Role]?.includes(permission) ?? false)
}

export const ROLE_LABELS: Record<Role, string> = { admin: 'Administrateur', editor: 'Éditeur', viewer: 'Lecteur' }
