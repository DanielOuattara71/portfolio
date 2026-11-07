import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { DOMAINS, type Domain } from '@portfolio/shared/constants'
import type { Project } from './useContent'

/**
 * Domain filter + text query over projects (interactions I-06, motion M-10).
 * Cards keep their DOM node (v-show), so Flip can slide the remaining ones to their new place.
 */
export function useProjectFilter(projects: Ref<Project[]>, container: Ref<HTMLElement | null>, selector = '.card') {
  const { t } = useI18n()
  const domain = ref<'all' | Domain>('all')
  const query = ref('')

  const matches = (p: Project) => {
    const q = query.value.trim().toLowerCase()
    const inDomain = domain.value === 'all' || p.domains.includes(domain.value)
    const hay = [p.name, p.kind, p.summary, ...p.stack, ...p.domains].join(' ').toLowerCase()
    return inDomain && (!q || hay.includes(q))
  }

  const visible = computed(() => new Set(projects.value.filter(matches).map((p) => p.id)))
  const count = computed(() => visible.value.size)

  const options = computed(() => [
    { value: 'all' as const, label: t('domains.all'), count: projects.value.length },
    ...DOMAINS.map((d) => ({ value: d, label: t(`domains.${d}`), count: projects.value.filter((p) => p.domains.includes(d)).length })),
  ])

  // Capture positions before the DOM changes, animate after.
  watch(
    [domain, query],
    async () => {
      if (!import.meta.client || !container.value || prefersReducedMotion()) return
      const cards = container.value.querySelectorAll(selector)
      const state = Flip.getState(cards)
      await nextTick()
      Flip.from(state, {
        duration: 0.6,
        ease: EASE.out,
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.04 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.96, duration: 0.25, ease: EASE.in }),
      })
    },
    { flush: 'pre' },
  )

  return { domain, query, visible, count, options }
}
