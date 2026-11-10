import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { getAuth } from './auth'
import { checkDatabase } from './db/client'
import { originGuard, proxyGuard, type AdminEnv } from './middleware/admin'
import { contentRoutes } from './routes/admin/content'
import { dashboardRoutes } from './routes/admin/dashboard'
import { monitoringRoutes } from './routes/admin/monitoring'
import { localMediaRoutes, mediaRoutes } from './routes/admin/media'
import { messagesRoutes } from './routes/admin/messages'
import { securityRoutes } from './routes/admin/security'
import { internalRoutes } from './routes/internal'
import { contactRoutes } from './routes/contact'
import { publicContentRoutes } from './routes/public/content'
import { captureError, initSentry } from './lib/sentry'
import { recordApi5xx } from './services/monitoring'

initSentry()

/**
 * Portfolio API. Entry point used by Vercel (default export).
 * /public/* serves the public site; /api/* serves the admin (through its proxy only).
 */
const app = new OpenAPIHono<AdminEnv>()

app.use('*', secureHeaders())

// Count real 5xx responses for the "10 errors in 5 min" rule (docs/admin/05 §D).
// Path-only summary, never a full URL or body, no IP.
app.use('*', async (c, next) => {
  const started = Date.now()
  await next()
  if (c.res.status >= 500) {
    void recordApi5xx({ status: c.res.status, ms: Date.now() - started, path: new URL(c.req.url).pathname.slice(0, 120) }).catch(() => {})
  }
})
app.onError((err, c) => {
  captureError(err)
  void recordApi5xx({ status: 500, ms: 0, path: new URL(c.req.url).pathname.slice(0, 120) }).catch(() => {})
  return c.json({ title: 'Internal Server Error', status: 500, code: 'internal.error' }, 500)
})

// Public routes are called from the public site only.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
app.use(
  '/public/*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  }),
)

// Admin side (/api/*): only through the admin proxy, CSRF origin check, then Better Auth or admin routes.
app.use('/api/*', proxyGuard, originGuard)
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const headers = c.get('headers')
  const res = await getAuth().handler(new Request(c.req.raw, { headers }))
  res.headers.set('Cache-Control', 'no-store')
  return res
})

const HealthSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    database: z.enum(['up', 'down', 'not_configured']),
    time: z.string(),
  })
  .openapi('Health')

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Service status, with a real database check',
  responses: {
    200: { content: { 'application/json': { schema: HealthSchema } }, description: 'API reachable' },
  },
})

async function health() {
  const database = await checkDatabase()
  return {
    status: database === 'down' ? ('degraded' as const) : ('ok' as const),
    database,
    time: new Date().toISOString(),
  }
}

app.openapi(healthRoute, async (c) => c.json(await health()))
// Same check under /api: the admin reaches the API through its own /api/** proxy.
app.openapi({ ...healthRoute, path: '/api/health' }, async (c) => c.json(await health()))

app.route('/', contactRoutes)
app.route('/', publicContentRoutes)
app.route('/', securityRoutes)
app.route('/', contentRoutes)
app.route('/', dashboardRoutes)
app.route('/', messagesRoutes)
app.route('/', mediaRoutes)
app.route('/', localMediaRoutes)
app.route('/', monitoringRoutes)
app.route('/', internalRoutes)

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Portfolio API', version: '0.1.0' },
})

export default app
