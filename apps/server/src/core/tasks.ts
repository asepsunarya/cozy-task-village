import { count, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  canTransition,
  CLOSED_STATUSES,
  levelFor,
  OPEN_STATUSES,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
} from '@cozy/shared'
import { db } from '../db'
import { agents, tasks, xpEvents } from '../db/schema'
import { HttpError } from '../errors'
import { publish } from '../realtime'
import { findAgentRow, requireAgentRow } from './agents'
import { logEvent } from './events'
import { toAgent, toTask, type AgentRow, type TaskRow } from './serialize'

/** Who caused a change. Shows up in the activity log and, later, in audit trails. */
export type Actor = { kind: 'user' } | { kind: 'demo' } | { kind: 'system' } | { kind: 'agent'; agentId: string }

const randXp = () => 12 + Math.round(Math.random() * 28)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export async function listOpenTasks(): Promise<Task[]> {
  const rows = await db.select().from(tasks).where(inArray(tasks.status, [...OPEN_STATUSES])).orderBy(desc(tasks.createdAt))
  return rows.map(toTask)
}

/** Every open task plus the most recently closed ones. */
export async function listTasks(opts: { closedLimit?: number } = {}): Promise<Task[]> {
  const closedLimit = opts.closedLimit ?? 40
  const open = await listOpenTasks()
  const closed = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.status, [...CLOSED_STATUSES]))
    .orderBy(desc(tasks.updatedAt))
    .limit(closedLimit)
  return [...open, ...closed.map(toTask)]
}

export async function requireTaskRow(id: string): Promise<TaskRow> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  if (!row) throw new HttpError(404, `Task ${id} not found`)
  return row
}

export const getTask = async (id: string) => toTask(await requireTaskRow(id))

export async function createTask(input: CreateTaskInput, actor: Actor): Promise<Task> {
  if (input.assigneeId) await requireAgentRow(input.assigneeId)
  const [row] = await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? '',
      assigneeId: input.assigneeId ?? null,
      xp: input.xp ?? randXp(),
      priority: input.priority ?? 0,
      createdBy: actor.kind,
    })
    .returning()
  const task = toTask(row)
  publish({ type: 'task.upserted', task })
  await logEvent({ type: 'task.created', message: `New task: "${task.title}"`, taskId: task.id, agentId: task.assigneeId })
  return task
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  await requireTaskRow(id)
  if (input.assigneeId) await requireAgentRow(input.assigneeId)
  const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() }
  if (input.title !== undefined) patch.title = input.title
  if (input.description !== undefined) patch.description = input.description
  if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId
  if (input.xp !== undefined) patch.xp = input.xp
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.result !== undefined) patch.result = input.result
  const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning()
  const task = toTask(row)
  publish({ type: 'task.upserted', task })
  return task
}

/** Progress ticks are frequent, so they stream over the socket but only hit the log when a note is attached. */
export async function setProgress(id: string, progress: number, note?: string): Promise<Task> {
  const current = await requireTaskRow(id)
  if (current.status !== 'running') {
    throw new HttpError(409, `Progress can only be reported on a running task (this one is ${current.status})`)
  }
  const [row] = await db
    .update(tasks)
    .set({ progress: clamp(progress, 0, 100), updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning()
  const task = toTask(row)
  publish({ type: 'task.upserted', task })
  if (note) {
    await logEvent({ type: 'task.progress', message: note, taskId: id, agentId: task.assigneeId, payload: { progress: task.progress } })
  }
  return task
}

export async function deleteTask(id: string): Promise<void> {
  const row = await requireTaskRow(id)
  await db.delete(tasks).where(eq(tasks.id, id))
  publish({ type: 'task.deleted', id })
  await logEvent({ type: 'task.deleted', message: `Deleted "${row.title}"`, taskId: id })
}

/** Silently drop the oldest closed tasks beyond `keep`. Used by the demo so the board stays tidy. */
export async function pruneClosedTasks(keep: number): Promise<number> {
  const stale = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(inArray(tasks.status, [...CLOSED_STATUSES]))
    .orderBy(desc(tasks.updatedAt))
    .offset(keep)
  if (stale.length === 0) return 0
  const ids = stale.map((s) => s.id)
  await db.delete(tasks).where(inArray(tasks.id, ids))
  for (const id of ids) publish({ type: 'task.deleted', id })
  return ids.length
}

export async function countRunning(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(tasks).where(eq(tasks.status, 'running'))
  return Number(n)
}

/** An agent with no running task; falls back to anyone if the whole village is busy. */
export async function pickAvailableAgent(): Promise<string | null> {
  const busy = await db.select({ id: tasks.assigneeId }).from(tasks).where(eq(tasks.status, 'running'))
  const busySet = new Set(busy.map((b) => b.id))
  const everyone = await db.select({ id: agents.id }).from(agents)
  const idle = everyone.filter((a) => !busySet.has(a.id))
  const pool = idle.length ? idle : everyone
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null
}

export interface TransitionOptions {
  actor: Actor
  result?: string
  error?: string
}

/**
 * The single place where a task changes status. Enforces the state machine,
 * auto-assigns an agent when work starts, and awards XP (transactionally) when work is done.
 */
export async function transitionTask(id: string, to: TaskStatus, opts: TransitionOptions): Promise<Task> {
  const current = await requireTaskRow(id)
  if (current.status === to) return toTask(current)
  if (!canTransition(current.status, to)) {
    throw new HttpError(409, `Cannot move a ${current.status} task to ${to}`)
  }

  const now = new Date()
  const patch: Partial<typeof tasks.$inferInsert> = { status: to, updatedAt: now }
  let assigneeId = current.assigneeId

  switch (to) {
    case 'queued':
      break
    case 'running': {
      if (!assigneeId) {
        assigneeId = await pickAvailableAgent()
        if (!assigneeId) throw new HttpError(409, 'There is nobody in the village to take this task')
        patch.assigneeId = assigneeId
      }
      patch.startedAt = current.startedAt ?? now
      patch.completedAt = null
      patch.error = null
      if (current.status === 'todo' || current.status === 'queued') patch.progress = 0
      break
    }
    case 'review': {
      patch.progress = 100
      if (opts.result !== undefined) patch.result = opts.result
      break
    }
    case 'done': {
      patch.progress = 100
      patch.completedAt = now
      patch.error = null
      if (opts.result !== undefined) patch.result = opts.result
      break
    }
    case 'failed': {
      patch.error = opts.error ?? 'Unknown error'
      patch.completedAt = now
      break
    }
    case 'cancelled': {
      patch.completedAt = now
      break
    }
    case 'todo': {
      patch.progress = 0
      patch.completedAt = null
      patch.error = null
      break
    }
  }

  const agentBefore = assigneeId ? await findAgentRow(assigneeId) : null
  let row: TaskRow
  let agentAfter: AgentRow | null = null

  if (to === 'done' && agentBefore) {
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(tasks).set(patch).where(eq(tasks.id, id)).returning()
      await tx.insert(xpEvents).values({
        id: crypto.randomUUID(),
        agentId: agentBefore.id,
        taskId: id,
        amount: current.xp,
        reason: `Completed "${current.title}"`,
      })
      const [agentRow] = await tx
        .update(agents)
        .set({ xp: sql`${agents.xp} + ${current.xp}` })
        .where(eq(agents.id, agentBefore.id))
        .returning()
      return { updated, agentRow }
    })
    row = result.updated
    agentAfter = result.agentRow
  } else {
    ;[row] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning()
  }

  const task = toTask(row)
  publish({ type: 'task.upserted', task })

  let newLevel: number | null = null
  if (agentAfter && agentBefore) {
    const agent = toAgent(agentAfter)
    publish({ type: 'agent.upserted', agent })
    publish({ type: 'toast', agentId: agent.id, text: `+${current.xp} XP`, sub: 'Task complete!' })
    if (levelFor(agent.xp) > levelFor(agentBefore.xp)) {
      newLevel = levelFor(agent.xp)
      publish({ type: 'toast', agentId: agent.id, text: `Lv${newLevel}!`, sub: 'Level up 🎉' })
    }
  }

  await logEvent({
    type: `task.${to}`,
    message: describe(to, task, agentBefore?.name ?? null, opts, newLevel),
    taskId: task.id,
    agentId: task.assigneeId,
    payload: { from: current.status, to, actor: opts.actor.kind },
  })
  return task
}

function describe(to: TaskStatus, task: Task, who: string | null, opts: TransitionOptions, newLevel: number | null): string {
  const t = `"${task.title}"`
  const name = who ?? 'Someone'
  switch (to) {
    case 'queued':
      return `${t} queued${who ? ` for ${who}` : ''}`
    case 'running':
      return `${name} started ${t}`
    case 'review':
      return `${name} sent ${t} for review`
    case 'done':
      return `${name} completed ${t} (+${task.xp} XP)${newLevel ? ` · reached Lv${newLevel} 🎉` : ''}`
    case 'failed':
      return `${t} failed: ${opts.error ?? 'unknown error'}`
    case 'cancelled':
      return `${t} was cancelled`
    case 'todo':
      return `${t} is back in the waiting list`
  }
}
