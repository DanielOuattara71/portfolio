export function useHomeAnchor() {
  const route = useRoute()
  const localePath = useLocalePath()

  function homeTo(anchor: string) {
    return { path: localePath('index'), hash: `#${anchor}` }
  }

  async function go(anchor: string, e?: MouseEvent) {
    if (!String(route.name ?? '').startsWith('index')) return
    e?.preventDefault()
    if (!import.meta.client) return
    const el = document.getElementById(anchor)
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(history.state, '', `#${anchor}`)
  }

  return { homeTo, go }
}
