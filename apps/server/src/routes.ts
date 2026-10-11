import type { FastifyInstance } from 'fastify'
import {
  CreateAgentInput,
  CreateTaskInput,
  ProgressInput,
  SettingsInput,
  TransitionInput,
  UpdateAgentInput,
  UpdateTaskInput,
  type ServerMessage,
} from '@cozy/shared'
import { config } from './config'
import { dbKind } from './db'
import { resetAll } from './db/seed'
import { HttpError } from './errors'
import { clientCount, publish, registerClient } from './realtime'
import { createAgent, deleteAgent, getAgent, listAgents, updateAgent } from './core/agents'
import { demoRunning, stopDemo, syncDemo } from './core/demo'
import { listEvents } from './core/events'
import { getSettings, updateSettings } from './core/settings'
import { snapshot } from './core/snapshot'
import { createTask, deleteTask, getTask, listTasks, setProgress, transitionTask, updateTask } from './core/tasks'

const USER = { kind: 'user' } as const
type IdParams = { Params: { id: string } }

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => ({
    ok: true,
    db: dbKind,
    clients: clientCount(),
    demo: demoRunning(),
    uptime: Math.round(process.uptime()),
  }))

  app.get('/api/state', async () => snapshot())

  /* ---- tasks ---- */
  app.get('/api/tasks', async () => listTasks())
  app.post('/api/tasks', async (req, reply) => {
    const task = await createTask(CreateTaskInput.parse(req.body), USER)
    return reply.code(201).send(task)
  })
  app.get<IdParams>('/api/tasks/:id', async (req) => getTask(req.params.id))
  app.patch<IdParams>('/api/tasks/:id', async (req) => updateTask(req.params.id, UpdateTaskInput.parse(req.body)))
  app.post<IdParams>('/api/tasks/:id/transition', async (req) => {
    const { to, result, error } = TransitionInput.parse(req.body)
    return transitionTask(req.params.id, to, { actor: USER, result, error })
  })
  app.post<IdParams>('/api/tasks/:id/progress', async (req) => {
    const { progress, note } = ProgressInput.parse(req.body)
    return setProgress(req.params.id, progress, note)
  })
  app.delete<IdParams>('/api/tasks/:id', async (req, reply) => {
    await deleteTask(req.params.id)
    return reply.code(204).send()
  })

  /* ---- agents ---- */
  app.get('/api/agents', async () => listAgents())
  app.post('/api/agents', async (req, reply) => {
    const agent = await createAgent(CreateAgentInput.parse(req.body))
    return reply.code(201).send(agent)
  })
  app.get<IdParams>('/api/agents/:id', async (req) => getAgent(req.params.id))
  app.patch<IdParams>('/api/agents/:id', async (req) => updateAgent(req.params.id, UpdateAgentInput.parse(req.body)))
  app.delete<IdParams>('/api/agents/:id', async (req, reply) => {
    await deleteAgent(req.params.id)
    return reply.code(204).send()
  })

  /* ---- activity log ---- */
  app.get<{ Querystring: { limit?: string } }>('/api/events', async (req) => listEvents(Number(req.query.limit) || 50))

  /* ---- settings & demo ---- */
  app.get('/api/settings', async () => getSettings())
  app.patch('/api/settings', async (req) => updateSettings(SettingsInput.parse(req.body)))
  app.post('/api/reset', async () => {
    if (!config.allowReset) throw new HttpError(403, 'Reset is disabled on this server')
    stopDemo()
    await resetAll()
    publish({ type: 'reset' })
    syncDemo(await getSettings())
    return snapshot()
  })

  /* ---- realtime ---- */
  app.get('/ws', { websocket: true }, (socket) => {
    registerClient(socket)
    const hello: ServerMessage = { type: 'hello', serverTime: new Date().toISOString() }
    socket.send(JSON.stringify(hello))
  })
}
