import { desc } from 'drizzle-orm'
import type { VillageEvent } from '@cozy/shared'
import { db } from '../db'
import { events } from '../db/schema'
import { publish } from '../realtime'
import { toEvent } from './serialize'

export interface LogInput {
  type: string
  message: string
  taskId?: string | null
  agentId?: string | null
  runId?: string | null
  payload?: Record<string, unknown>
}

/** Persist an activity-log entry and push it to every connected client. */
export async function logEvent(input: LogInput): Promise<VillageEvent> {
  const [row] = await db
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      type: input.type,
      message: input.message,
      taskId: input.taskId ?? null,
      agentId: input.agentId ?? null,
      runId: input.runId ?? null,
      payload: input.payload ?? null,
    })
    .returning()
  const event = toEvent(row)
  publish({ type: 'event', event })
  return event
}

export async function listEvents(limit = 50): Promise<VillageEvent[]> {
  const n = Math.min(Math.max(Math.floor(limit), 1), 200)
  const rows = await db.select().from(events).orderBy(desc(events.createdAt)).limit(n)
  return rows.map(toEvent)
}
