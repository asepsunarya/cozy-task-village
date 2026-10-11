export type { Agent, Building, ServerSettings, Task, TaskStatus, VillageEvent } from '@cozy/shared'

export type TimeOfDay = 'day' | 'cloudy' | 'sunset' | 'night'
export type Panel = null | 'tasks' | 'agents' | 'add' | 'log'

export interface Toast {
  id: string
  agentId: string
  text: string
  sub?: string
  createdAt: number
}
