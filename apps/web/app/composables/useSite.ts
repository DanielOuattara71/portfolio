import type { PublishedContent } from '@portfolio/shared/content'

/**
 * Site-wide settings, from the published Settings of the admin
 * (display name, email, social links, CV, availability, photo).
 * `null` means "not provided yet": the related UI is hidden, never faked.
 * Settings do not change during a visit, so a plain snapshot is enough.
 */
export function useSite() {
  // Read the state directly: on the "unavailable" error page, no content was loaded.
  const published = useState<PublishedContent | null>('published-content').value
  const s = published?.settings
  const media = published?.media ?? {}
  const { locale, t } = useI18n()
  const lc = locale.value === 'fr' ? 'fr' : 'en'

  const cvId = s?.cv[lc] ?? null
  const cvUrl = cvId ? (media[cvId]?.file ?? null) : null

  const photoMedia = s?.photoId ? media[s.photoId] : undefined
  let photo: { src: string; srcset: string; alt: string | null } | null = null
  if (photoMedia && photoMedia.kind === 'image' && photoMedia.variants.length) {
    const sorted = [...photoMedia.variants].sort((a, b) => a.width - b.width)
    const picked = sorted.find((v) => v.width >= 960) ?? sorted.at(-1)!
    photo = {
      src: picked.url,
      srcset: sorted.map((v) => `${v.url} ${v.width}w`).join(', '),
      alt: photoMedia.alt[lc] ?? null,
    }
  }

  const publishedAvailability = s ? (s.availability[lc]?.trim() ? s.availability[lc]!.trim() : null) : null
  const availability = s?.available ? (publishedAvailability ?? t('status.availableLong')) : t('status.unavailableLong')

  return {
    name: s?.name ?? null,
    initials: s?.initials ?? null,
    available: s?.available ?? false,
    email: s?.email ?? null,
    cvUrl,
    links: s?.links ?? [],
    contactOpen: s?.contactOpen ?? true,
    photo,
    availability,
    timezone: s?.timezone ?? null,
    city: s?.city ?? null,
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
