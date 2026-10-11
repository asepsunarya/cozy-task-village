import fs from 'node:fs'
import path from 'node:path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import { ZodError } from 'zod'
import { config, serverRoot } from './config'
import { closeDb, dbKind } from './db'
import { seedIfEmpty } from './db/seed'
import { HttpError } from './errors'
import { registerRoutes } from './routes'
import { stopDemo, syncDemo } from './core/demo'
import { getSettings } from './core/settings'

// Request logs are emitted at info level, so the default 'warn' keeps the console quiet.
const app = Fastify({ logger: { level: config.logLevel } })

await app.register(cors, { origin: config.corsOrigin })
await app.register(websocket)

app.setErrorHandler((err, req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: 'validation_error', message: 'Invalid input', issues: err.issues })
  }
  if (err instanceof HttpError) {
    return reply.code(err.status).send({ error: 'request_error', message: err.message })
  }
  const e = err as { statusCode?: number; message?: string }
  const status = typeof e.statusCode === 'number' ? e.statusCode : 500
  if (status >= 500) req.log.error(err)
  return reply.code(status).send({
    error: status >= 500 ? 'internal_error' : 'request_error',
    message: status >= 500 ? 'Something went wrong on the server' : (e.message ?? 'Bad request'),
  })
})

await registerRoutes(app)

// Serve the built frontend when it exists, so a single process can host the whole app.
const webDist = path.resolve(serverRoot, '../web/dist')
if (fs.existsSync(path.join(webDist, 'index.html'))) {
  await app.register(fastifyStatic, { root: webDist, prefix: '/' })
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/ws')) {
      return reply.sendFile('index.html')
    }
    return reply.code(404).send({ error: 'not_found', message: `Route ${req.method} ${req.url} not found` })
  })
}

const seeded = await seedIfEmpty()
syncDemo(await getSettings())
await app.listen({ port: config.port, host: config.host })
console.log(
  `🏡 Cozy Task Village server → http://localhost:${config.port}  (db: ${dbKind}${seeded ? ', seeded demo team' : ''})`,
)

let closing = false
const shutdown = async (signal: string) => {
  if (closing) return
  closing = true
  console.log(`\n${signal} received, shutting down…`)
  stopDemo()
  await app.close()
  await closeDb()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
