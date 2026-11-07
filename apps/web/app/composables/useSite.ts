/**
 * Site-wide settings. Temporary values: they will come from the admin
 * (Settings module: display name, email, social links, CV, availability).
 * `null` means "not provided yet": the related UI is hidden, never faked.
 */
export function useSite() {
  return {
    name: null as string | null,
    initials: null as string | null,
    available: true,
    email: null as string | null,
    cvUrl: null as string | null,
    links: [] as { label: string; href: string }[],
  }
}

/**
 * Name shown in the logo, the hero headline and the footer signature.
 * Until the real name is set in the admin, the professional title is used instead
 * (a real fact, never an invented name).
 */
export function useDisplayName() {
  const site = useSite()
  const { t } = useI18n()
  return computed(() => {
    const text = site.name ?? t('pages.home.title')
    return {
      text,
      words: text.split(' ').filter(Boolean),
      mark: site.initials ?? '/',
      isFallback: !site.name,
    }
  })
}

/** Review mode: show "to provide" placeholders and unconfirmed drafts (runtime config, off in production). */
export function useShowPlaceholders() {
  const config = useRuntimeConfig()
  // Nuxt parses the env value, so "true" arrives as a boolean.
  return computed(() => config.public.showPlaceholders === true)
}
