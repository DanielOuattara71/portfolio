import gsap from 'gsap'
import type { Directive } from 'vue'

type MagneticEl = HTMLElement & { _magnetic?: { move: (e: PointerEvent) => void; leave: () => void } }

/**
 * v-magnetic (docs/09-interactions.md, I-02): the element follows 25 % of the pointer offset,
 * then returns without bounce. Fine pointer only, never with reduced motion.
 * Only two elements use it: the hero primary button and the footer round button.
 */
const magnetic: Directive<MagneticEl, number | undefined> = {
  getSSRProps: () => ({}),
  mounted(el, binding) {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduce) return
    const strength = binding.value ?? 0.25
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      gsap.to(el, {
        x: (e.clientX - r.left - r.width / 2) * strength,
        y: (e.clientY - r.top - r.height / 2) * strength,
        duration: 0.4,
        ease: 'power3.out',
      })
    }
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: EASE.out })
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    el._magnetic = { move, leave }
  },
  unmounted(el) {
    if (!el._magnetic) return
    el.removeEventListener('pointermove', el._magnetic.move)
    el.removeEventListener('pointerleave', el._magnetic.leave)
    gsap.killTweensOf(el)
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('magnetic', magnetic)
})
