import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { Directive } from 'vue'

type RevealKind = 'block' | 'stagger' | 'lines'
type RevealEl = HTMLElement & { _reveal?: { kill: () => void } }

/**
 * v-reveal="'block' | 'stagger' | 'lines'" (docs/08-motion.md, M-05 / M-10).
 * Plays once when the element reaches 85 % of the viewport. Content is visible without JavaScript
 * and with reduced motion: initial states are only applied here, on the client.
 */
const reveal: Directive<RevealEl, RevealKind | undefined> = {
  getSSRProps: () => ({}),
  mounted(el, binding) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const kind = binding.value ?? 'block'
    const scrollTrigger = { trigger: el, start: 'top 85%', once: true }

    if (kind === 'lines') {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', aria: 'none' })
      const tween = gsap.from(split.lines, {
        yPercent: 110,
        duration: 0.8,
        stagger: 0.06,
        ease: EASE.out,
        scrollTrigger,
        onComplete: () => split.revert(),
      })
      el._reveal = { kill: () => { tween.scrollTrigger?.kill(); tween.kill(); split.revert() } }
      return
    }

    const targets = kind === 'stagger' ? Array.from(el.children) : el
    const tween = gsap.from(targets, {
      y: kind === 'stagger' ? 32 : 24,
      opacity: 0,
      duration: kind === 'stagger' ? 0.8 : 0.6,
      stagger: kind === 'stagger' ? 0.08 : 0,
      ease: EASE.out,
      clearProps: 'transform,opacity',
      scrollTrigger,
    })
    el._reveal = { kill: () => { tween.scrollTrigger?.kill(); tween.kill() } }
  },
  unmounted(el) {
    el._reveal?.kill()
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', reveal)
})
