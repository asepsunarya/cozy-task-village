import type { InferSelectModel } from 'drizzle-orm'
import type { Agent, Task, VillageEvent } from '@cozy/shared'
import { agents, events, tasks } from '../db/schema'

export type AgentRow = InferSelectModel<typeof agents>
export type TaskRow = InferSelectModel<typeof tasks>
export type EventRow = InferSelectModel<typeof events>

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

export const toAgent = (r: AgentRow): Agent => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji,
  color: r.color,
  role: r.role,
  model: r.model,
  systemPrompt: r.systemPrompt,
  buildingId: r.buildingId,
  xp: r.xp,
  createdAt: r.createdAt.toISOString(),
})

export const toTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  description: r.description,
  status: r.status,
  assigneeId: r.assigneeId,
  priority: r.priority,
  xp: r.xp,
  progress: r.progress,
  result: r.result,
  error: r.error,
  createdBy: r.createdBy,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
  startedAt: iso(r.startedAt),
  completedAt: iso(r.completedAt),
})

export const toEvent = (r: EventRow): VillageEvent => ({
  id: r.id,
  type: r.type,
  message: r.message,
  taskId: r.taskId,
  agentId: r.agentId,
  runId: r.runId,
  payload: r.payload ?? null,
  createdAt: r.createdAt.toISOString(),
})
