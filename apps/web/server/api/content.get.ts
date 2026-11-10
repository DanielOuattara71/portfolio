/** Same-origin access to the published content (used by the content plugin during SSR and navigation). */
export default defineEventHandler(async (event) => {
  try {
    const content = await getPublishedContent()
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
    return content
  } catch (e) {
    console.error('[content] API unreachable', e)
    throw createError({ statusCode: 503, statusMessage: 'Content temporarily unavailable' })
  }
})
