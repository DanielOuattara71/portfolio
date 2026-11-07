import { serve } from '@hono/node-server'
import app from './index'

// Local development server. On Vercel, src/index.ts is served directly.
const port = Number(process.env.API_PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API ready on http://localhost:${info.port} (health: /health, docs: /openapi.json)`)
})
