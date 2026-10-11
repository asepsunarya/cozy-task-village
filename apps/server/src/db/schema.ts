import { index, integer, jsonb, pgEnum, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'
import type { TaskStatus } from '@cozy/shared'

// Kept inline (not imported) so drizzle-kit can load this file without transpiling the workspace package.
export const TASK_STATUS_VALUES = ['todo', 'queued', 'running', 'review', 'done', 'failed', 'cancelled'] as const satisfies readonly TaskStatus[]

export const taskStatusEnum = pgEnum('task_status', TASK_STATUS_VALUES)
export const runStatusEnum = pgEnum('run_status', ['running', 'succeeded', 'failed', 'cancelled'])

const tz = (name: string) => timestamp(name, { withTimezone: true })

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('🙂'),
  color: text('color').notNull().default('#f28cb4'),
  role: text('role').notNull().default(''),
  model: text('model').notNull().default('claude-opus-5-5'),
  systemPrompt: text('system_prompt'),
  buildingId: text('building_id').notNull(),
  xp: integer('xp').notNull().default(0),
  createdAt: tz('created_at').notNull().defaultNow(),
})

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: taskStatusEnum('status').notNull().default('todo'),
    assigneeId: text('assignee_id').references(() => agents.id, { onDelete: 'set null' }),
    priority: integer('priority').notNull().default(0),
    xp: integer('xp').notNull().default(20),
    progress: real('progress').notNull().default(0),
    result: text('result'),
    error: text('error'),
    createdBy: text('created_by'),
    createdAt: tz('created_at').notNull().defaultNow(),
    updatedAt: tz('updated_at').notNull().defaultNow(),
    startedAt: tz('started_at'),
    completedAt: tz('completed_at'),
  },
  (t) => [index('tasks_status_idx').on(t.status), index('tasks_assignee_idx').on(t.assigneeId)],
)

/** One row per execution attempt of a task. Populated by the agent worker (phase 2). */
export const taskRuns = pgTable('task_runs', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  status: runStatusEnum('status').notNull().default('running'),
  model: text('model'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  stopReason: text('stop_reason'),
  error: text('error'),
  startedAt: tz('started_at').notNull().defaultNow(),
  finishedAt: tz('finished_at'),
})

/** Activity stream: drives the village log and the live bubbles. No FKs so history survives deletes. */
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    message: text('message').notNull(),
    taskId: text('task_id'),
    agentId: text('agent_id'),
    runId: text('run_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: tz('created_at').notNull().defaultNow(),
  },
  (t) => [index('events_created_idx').on(t.createdAt)],
)

export const xpEvents = pgTable('xp_events', {
  id: text('id').primaryKey(),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  taskId: text('task_id'),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull().default(''),
  createdAt: tz('created_at').notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
})
