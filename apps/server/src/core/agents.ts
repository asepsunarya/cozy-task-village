import { and, asc, eq, inArray } from 'drizzle-orm'
import { BUILDING_MAP, type Agent, type CreateAgentInput, type UpdateAgentInput } from '@cozy/shared'
import { db } from '../db'
import { agents, tasks } from '../db/schema'
import { HttpError } from '../errors'
import { publish } from '../realtime'
import { logEvent } from './events'
import { toAgent, toTask, type AgentRow } from './serialize'

export async function listAgents(): Promise<Agent[]> {
  const rows = await db.select().from(agents).orderBy(asc(agents.createdAt), asc(agents.id))
  return rows.map(toAgent)
}

export async function findAgentRow(id: string): Promise<AgentRow | null> {
  const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
  return row ?? null
}

export async function requireAgentRow(id: string): Promise<AgentRow> {
  const row = await findAgentRow(id)
  if (!row) throw new HttpError(404, `Agent ${id} not found`)
  return row
}

export const getAgent = async (id: string) => toAgent(await requireAgentRow(id))

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  if (!BUILDING_MAP[input.buildingId]) throw new HttpError(400, `Unknown building ${input.buildingId}`)
  const [row] = await db
    .insert(agents)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      emoji: input.emoji ?? '🙂',
      color: input.color ?? '#f28cb4',
      role: input.role ?? '',
      model: input.model ?? 'claude-opus-5-5',
      systemPrompt: input.systemPrompt ?? null,
      buildingId: input.buildingId,
    })
    .returning()
  const agent = toAgent(row)
  publish({ type: 'agent.upserted', agent })
  await logEvent({ type: 'agent.joined', message: `${agent.emoji} ${agent.name} joined the village`, agentId: agent.id })
  return agent
}

export async function updateAgent(id: string, input: UpdateAgentInput): Promise<Agent> {
  await requireAgentRow(id)
  if (input.buildingId && !BUILDING_MAP[input.buildingId]) throw new HttpError(400, `Unknown building ${input.buildingId}`)
  const patch: Partial<typeof agents.$inferInsert> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.emoji !== undefined) patch.emoji = input.emoji
  if (input.color !== undefined) patch.color = input.color
  if (input.role !== undefined) patch.role = input.role
  if (input.model !== undefined) patch.model = input.model
  if (input.systemPrompt !== undefined) patch.systemPrompt = input.systemPrompt
  if (input.buildingId !== undefined) patch.buildingId = input.buildingId
  const [row] = await db.update(agents).set(patch).where(eq(agents.id, id)).returning()
  const agent = toAgent(row)
  publish({ type: 'agent.upserted', agent })
  return agent
}

export async function deleteAgent(id: string): Promise<void> {
  const row = await requireAgentRow(id)
  // Hand back any work in flight so nothing stays stuck on a ghost.
  const inFlight = await db
    .update(tasks)
    .set({ status: 'todo', assigneeId: null, progress: 0, updatedAt: new Date() })
    .where(and(eq(tasks.assigneeId, id), inArray(tasks.status, ['queued', 'running'])))
    .returning()
  for (const t of inFlight) publish({ type: 'task.upserted', task: toTask(t) })
  await db.delete(agents).where(eq(agents.id, id))
  publish({ type: 'agent.deleted', id })
  await logEvent({ type: 'agent.left', message: `${row.emoji} ${row.name} left the village`, agentId: id })
}
