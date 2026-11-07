import type { Locale } from '@portfolio/shared/constants'
import { homeSeed } from '~/content/home'
import { techSeed } from '~/content/tech'

/** Home content for the current language. Seed data until the API serves it (same shape). */
export function useHomeContent() {
  const { locale } = useI18n()
  return computed(() => homeSeed[locale.value as Locale] ?? homeSeed.en)
}

export function useTechStack() {
  return techSeed
}
