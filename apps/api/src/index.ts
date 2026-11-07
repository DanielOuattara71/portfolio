import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { checkDatabase } from './db/client'
import { contactRoutes } from './routes/contact'

/**
 * Portfolio API. Entry point used by Vercel (default export).
 * Only real endpoints live here; content routes are added with the data model.
 */
const app = new OpenAPIHono()

app.use('*', secureHeaders())

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

app.openapi(healthRoute, async (c) => {
  const database = await checkDatabase()
  return c.json({
    status: database === 'down' ? ('degraded' as const) : ('ok' as const),
    database,
    time: new Date().toISOString(),
  })
})

app.route('/', contactRoutes)

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Portfolio API', version: '0.1.0' },
})

export default app
