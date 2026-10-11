import { z } from 'zod'

/* ------------------------------------------------------------------ */
/* Task state machine                                                  */
/* ------------------------------------------------------------------ */

export const TASK_STATUSES = ['todo', 'queued', 'running', 'review', 'done', 'failed', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const TaskStatusSchema = z.enum(TASK_STATUSES)

/** Allowed transitions. Anything not listed here is rejected by the server with 409. */
export const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  todo: ['queued', 'running', 'cancelled'],
  queued: ['running', 'todo', 'cancelled'],
  running: ['review', 'done', 'failed', 'todo', 'cancelled'],
  review: ['done', 'todo', 'running'],
  done: ['todo'],
  failed: ['todo', 'queued'],
  cancelled: ['todo'],
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export const OPEN_STATUSES: readonly TaskStatus[] = ['todo', 'queued', 'running', 'review']
export const CLOSED_STATUSES: readonly TaskStatus[] = ['done', 'failed', 'cancelled']
export const isOpen = (s: TaskStatus) => OPEN_STATUSES.includes(s)
/** True when the assigned agent is physically "at work" in the village. */
export const isWorking = (s: TaskStatus) => s === 'running'

/* ------------------------------------------------------------------ */
/* XP & levels                                                         */
/* ------------------------------------------------------------------ */

export const levelFor = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1
export const xpForLevel = (lv: number) => (lv - 1) ** 2 * 40

/* ------------------------------------------------------------------ */
/* Domain objects as they travel over the wire (dates are ISO strings) */
/* ------------------------------------------------------------------ */

export interface Agent {
  id: string
  name: string
  emoji: string
  color: string
  role: string
  model: string
  systemPrompt: string | null
  buildingId: string
  xp: number
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  assigneeId: string | null
  priority: number
  xp: number
  progress: number
  result: string | null
  error: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface VillageEvent {
  id: string
  type: string
  message: string
  taskId: string | null
  agentId: string | null
  runId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface ServerSettings {
  demoSim: boolean
}

export interface Snapshot {
  agents: Agent[]
  tasks: Task[]
  events: VillageEvent[]
  settings: ServerSettings
  serverTime: string
}

/* ------------------------------------------------------------------ */
/* API input schemas (validated on the server, reused by the client)   */
/* ------------------------------------------------------------------ */

export const CreateTaskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().nullable().optional(),
  xp: z.number().int().min(1).max(1000).optional(),
  priority: z.number().int().min(0).max(3).optional(),
})
export type CreateTaskInput = z.infer<typeof CreateTaskInput>

export const UpdateTaskInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().nullable().optional(),
  xp: z.number().int().min(1).max(1000).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  result: z.string().nullable().optional(),
})
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>

export const TransitionInput = z.object({
  to: TaskStatusSchema,
  result: z.string().optional(),
  error: z.string().optional(),
})
export type TransitionInput = z.infer<typeof TransitionInput>

export const ProgressInput = z.object({
  progress: z.number().min(0).max(100),
  note: z.string().max(500).optional(),
})
export type ProgressInput = z.infer<typeof ProgressInput>

export const CreateAgentInput = z.object({
  name: z.string().trim().min(1).max(60),
  emoji: z.string().min(1).max(8).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  role: z.string().max(200).optional(),
  model: z.string().max(60).optional(),
  systemPrompt: z.string().max(20000).nullable().optional(),
  buildingId: z.string(),
})
export type CreateAgentInput = z.infer<typeof CreateAgentInput>

export const UpdateAgentInput = CreateAgentInput.partial()
export type UpdateAgentInput = z.infer<typeof UpdateAgentInput>

export const SettingsInput = z.object({
  demoSim: z.boolean().optional(),
})
export type SettingsInput = z.infer<typeof SettingsInput>

/* ------------------------------------------------------------------ */
/* Realtime messages pushed by the server over WebSocket               */
/* ------------------------------------------------------------------ */

export type ServerMessage =
  | { type: 'hello'; serverTime: string }
  | { type: 'task.upserted'; task: Task }
  | { type: 'task.deleted'; id: string }
  | { type: 'agent.upserted'; agent: Agent }
  | { type: 'agent.deleted'; id: string }
  | { type: 'event'; event: VillageEvent }
  | { type: 'toast'; agentId: string; text: string; sub?: string }
  | { type: 'settings'; settings: ServerSettings }
  | { type: 'reset' }

/* ------------------------------------------------------------------ */
/* Village layout shared by the seed data and the 3D scene             */
/* ------------------------------------------------------------------ */

export interface Building {
  id: string
  name: string
  x: number
  z: number
  body: string
  roof: string
  kind: 'house' | 'shop' | 'tower'
}

export const BUILDINGS: Building[] = [
  { id: 'b-finesse', name: 'Finesse Studio', x: -10, z: -4, body: '#fbdce9', roof: '#f08cb0', kind: 'house' },
  { id: 'b-producer', name: 'Producer Hall', x: -4, z: -13, body: '#fff1c9', roof: '#f3c35b', kind: 'tower' },
  { id: 'b-design', name: 'Design Loft', x: 1, z: -3, body: '#ffe4c7', roof: '#f0a06a', kind: 'shop' },
  { id: 'b-qa', name: 'QA Lab', x: 6, z: -5, body: '#d5e8ff', roof: '#8ab6f0', kind: 'house' },
  { id: 'b-platforms', name: 'Platforms Depot', x: 8, z: 0, body: '#e3d4ff', roof: '#a98cf0', kind: 'house' },
  { id: 'b-post', name: 'Post House', x: 4, z: 3, body: '#ffd6d6', roof: '#e86d6d', kind: 'house' },
  { id: 'b-strategy', name: 'Strategy Office', x: -2, z: 1, body: '#fde2ef', roof: '#f28fb6', kind: 'shop' },
  { id: 'b-fengshui', name: 'Fengshui Garden', x: -2, z: 6, body: '#def2d0', roof: '#8bc96c', kind: 'house' },
  { id: 'b-viva', name: 'Viva Lounge', x: 14, z: 6, body: '#d8f5ec', roof: '#6cc8ad', kind: 'house' },
  { id: 'b-min', name: 'Min Workshop', x: 10, z: 11, body: '#fff3d1', roof: '#e8b84a', kind: 'shop' },
  { id: 'b-script', name: 'Script Cottage', x: -8, z: 9, body: '#e1e7ff', roof: '#7f90e8', kind: 'house' },
  { id: 'b-trend', name: 'Trend Outpost', x: -16, z: 6, body: '#fbe0cf', roof: '#e89468', kind: 'tower' },
]

export const BUILDING_MAP: Record<string, Building> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]))
