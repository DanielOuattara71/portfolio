import gsap from 'gsap'
import type { TransitionProps } from 'vue'

/**
 * Page transitions (motion M-07). Curtain with the destination route for normal navigation,
 * short fade for back/forward and with reduced motion, nothing for language switches
 * (they use the circular View Transition instead).
 */
export function usePageTransition(): TransitionProps {
  const kind = useNavKind()
  const router = useRouter()
  let curtainShown = false

  return {
    css: false,
    mode: 'out-in',
    onLeave(el, done) {
      const curtain = document.getElementById('curtain')
      const label = document.getElementById('curtain-route')
      if (kind.value === 'lang') return done()
      if (kind.value === 'fade' || prefersReducedMotion() || !curtain) {
        gsap.to(el, { opacity: 0, duration: 0.15, onComplete: done })
        return
      }
      // The route has already changed when the old page leaves: show the destination.
      if (label) label.textContent = router.currentRoute.value.path
      curtainShown = true
      gsap.fromTo(
        curtain,
        { clipPath: 'inset(100% 0% 0% 0%)', visibility: 'visible' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: EASE.inOut, onComplete: done },
      )
    },
    onEnter(el, done) {
      const curtain = document.getElementById('curtain')
      if (curtainShown && curtain) {
        curtainShown = false
        gsap.to(curtain, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 0.65,
          ease: EASE.inOut,
          onComplete: () => {
            gsap.set(curtain, { clipPath: 'inset(100% 0% 0% 0%)', visibility: 'hidden' })
            done()
          },
        })
        return
      }
      if (kind.value === 'lang') return done()
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25, onComplete: done })
    },
  }
}
