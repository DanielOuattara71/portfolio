/** French labels for activity-log actions and sign-in results (codes stay in English in the database). */
const ACTIONS: Record<string, string> = {
  'auth.sign_in': 'Connexion réussie',
  'auth.sign_in.failed': 'Connexion échouée',
  'auth.sign_in.locked': 'Connexion bloquée (trop de tentatives)',
  'auth.second_factor.failed': 'Code de double authentification refusé',
  'auth.session.ended': 'Fin de session (déconnexion ou révocation)',
  'auth.session.revoked': 'Session révoquée',
  'auth.mfa.setup_started': 'Mise en place de la double authentification',
  'auth.mfa.enabled': 'Double authentification activée',
  'auth.mfa.disabled': 'Double authentification désactivée',
  'auth.mfa.backup_codes_regenerated': 'Codes de secours régénérés',
  'auth.password.changed': 'Mot de passe modifié',
  'auth.password.reset_requested': 'Réinitialisation du mot de passe demandée',
  'auth.password.reset': 'Mot de passe réinitialisé',
  'access.denied': 'Accès refusé (droits insuffisants)',
  'user.created': 'Compte créé',
}

const LOGIN_RESULTS: Record<string, string> = {
  success: 'réussie',
  password_ok: 'mot de passe correct, code demandé',
  failure: 'échec',
  second_factor_failed: 'code refusé',
  locked: 'bloquée',
}

export const actionLabel = (code: string) => ACTIONS[code] ?? code
export const loginResultLabel = (code: string) => LOGIN_RESULTS[code] ?? code

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
