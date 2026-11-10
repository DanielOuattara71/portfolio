/** Home hero and technology ribbon, from the published content (admin: Texts > Hero, Skills > ribbon). */
export function useHomeContent() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() => content.value.blocks.hero![lc.value])
}

export interface TechItem {
  name: string
  bg?: string
  fg?: string
  path?: string
  short?: string
}

export function useTechStack() {
  const content = usePublished()
  return computed<TechItem[]>(() =>
    content.value.skills
      .filter((s) => s.doc.ribbon)
      .sort((a, b) => a.doc.ribbon!.position - b.doc.ribbon!.position)
      .map(({ doc }) => {
        const r = doc.ribbon!
        return {
          name: r.label ?? doc.name.en,
          ...(r.bg ? { bg: r.bg } : {}),
          ...(r.fg ? { fg: r.fg } : {}),
          ...(r.path ? { path: r.path } : {}),
          ...(r.short ? { short: r.short } : {}),
        }
      }),
  )
}
