/** /fr/cv and /en/cv: redirect to the published CV PDF of the language, or 404 when none is published. */
export default defineEventHandler(async (event) => {
  const locale = getRouterParam(event, 'locale')
  if (locale !== 'fr' && locale !== 'en') throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const content = await getPublishedContent()
  const cvId = content.settings?.cv?.[locale] ?? null
  const file = cvId ? (content.media[cvId]?.file ?? null) : null
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return sendRedirect(event, file, 302)
})
