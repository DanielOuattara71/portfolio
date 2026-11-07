/** Shared motion state, filled on the client by plugins/motion.client.ts. */
export const useMotionState = () =>
  useState('motion', () => ({ reduced: false, fine: false, ready: false }))

/** True once the session intro has finished (or was skipped / not shown). */
export const useIntroDone = () => useState('intro-done', () => false)

/** How the next page change is animated: curtain (default), fade (back/forward), lang (circular reveal). */
export const useNavKind = () => useState<'curtain' | 'fade' | 'lang'>('nav-kind', () => 'curtain')

/** Easing names registered with GSAP from the design tokens. */
export const EASE = { out: 'ix-out', inOut: 'ix-in-out', in: 'ix-in' } as const

export function prefersReducedMotion(): boolean {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
