import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import type Lenis from 'lenis'
import tokens from '@portfolio/design-tokens/tokens.json'

/**
 * Motion setup (docs/08-motion.md, §7): GSAP plugins, easing curves from the design tokens,
 * smooth wheel scrolling (fine pointer only) and the reduced-motion / pointer state.
 */
export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(CustomEase, Flip, ScrollTrigger, SplitText)

  // Exact token curves: "cubic-bezier(a, b, c, d)" → CustomEase "ix-<name>".
  for (const t of tokens.easing.tokens) {
    const m = /cubic-bezier\(([^)]+)\)/.exec(t.value)
    if (m?.[1]) CustomEase.create(t.name.replace(/^ease-/, 'ix-'), m[1].replace(/\s+/g, ''))
  }

  const state = useMotionState()
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const fineMq = window.matchMedia('(pointer: fine)')
  let lenis: Lenis | null = null
  let lenisLoading = false

  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  function sync() {
    state.value = { ...state.value, reduced: reduceMq.matches, fine: fineMq.matches }
    const wantSmooth = !reduceMq.matches // reduced-motion still wins: OS setting keeps scroll native
    if (wantSmooth && !lenis && !lenisLoading) {
      // Loaded on demand: touch devices never download it.
      lenisLoading = true
      import('lenis').then(({ default: LenisCtor }) => {
        lenisLoading = false
        if (lenis || reduceMq.matches) return
        lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true, smoothTouch: true, touchMultiplier: 1.5 })
        lenis.on('scroll', ScrollTrigger.update)
        ScrollTrigger.refresh()
      }).catch((err) => {
        // Dynamic import failed (offline, blocked chunk…): Lenis stays unloaded, the page keeps native scroll.
        lenisLoading = false
        console.warn('lenis unavailable:', err?.message ?? err)
      })
    } else if (!wantSmooth && lenis) {
      lenis.destroy()
      lenis = null
    }
  }
  sync()
  reduceMq.addEventListener('change', sync)
  fineMq.addEventListener('change', sync)

  // Navigation kind: back/forward → fade, language switch → circular reveal, otherwise → curtain.
  const kind = useNavKind()
  let popped = false
  window.addEventListener('popstate', () => {
    popped = true
  })
  const router = useRouter()
  router.beforeEach(() => {
    if (popped) {
      kind.value = 'fade'
      popped = false
    }
  })

  let firstPage = true
  nuxtApp.hook('page:finish', () => {
    if (firstPage) {
      firstPage = false
      return
    }
    // Let the router restore or reset the scroll first, then resync smooth scroll and triggers.
    requestAnimationFrame(() => {
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true })
      ScrollTrigger.refresh()
      ScrollTrigger.sort()
      document.getElementById('main')?.focus({ preventScroll: true })
      kind.value = 'curtain'
    })
  })

  nuxtApp.hook('app:mounted', () => {
    state.value = { ...state.value, ready: true }
    document.documentElement.dataset.motion = 'ready'
  })

  return {
    provide: {
      lenis: () => lenis,
    },
  }
})
