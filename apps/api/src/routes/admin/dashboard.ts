import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { problem, requirePermission, requireSession, type AdminEnv } from '../../middleware/admin'
import { loadDashboard } from '../../services/dashboard'
import { listTranslations } from '../../services/translations'

/** Dashboard (real figures only) + missing translations (docs/admin/02 §A, §H). */
export const dashboardRoutes = new OpenAPIHono<AdminEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return problem(c, 400, 'request.invalid', 'Invalid request')
  },
})

dashboardRoutes.use('/api/admin/dashboard', requireSession(), requirePermission('dashboard.read'))
dashboardRoutes.use('/api/admin/translations', requireSession(), requirePermission('dashboard.read'))

const Problem = z.object({ title: z.string(), status: z.number(), code: z.string(), detail: z.string().optional() }).openapi('Problem')
const err = (d: string) => ({ content: { 'application/json': { schema: Problem } }, description: d })

dashboardRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/dashboard',
    summary: 'Dashboard figures (real counts only)',
    responses: { 200: { content: { 'application/json': { schema: z.object({}).passthrough() } }, description: 'Dashboard' }, 401: err('Not signed in'), 403: err('Not allowed') },
  }),
  async (c) => {
    const data = await loadDashboard()
    return c.json(data as never, 200)
  },
)

dashboardRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/translations',
    summary: 'Missing FR/EN fields per content (from schemas)',
    responses: { 200: { content: { 'application/json': { schema: z.object({ items: z.array(z.object({ id: z.string(), type: z.string(), key: z.string(), status: z.string(), missing: z.array(z.object({ path: z.string(), locale: z.enum(['fr', 'en']), filledInOther: z.boolean() })) })), totalMissing: z.number() }).passthrough() } }, description: 'Missing translations' }, 401: err('Not signed in'), 403: err('Not allowed') },
  }),
  async (c) => {
    const data = await listTranslations()
    return c.json(data as never, 200)
  },
)
