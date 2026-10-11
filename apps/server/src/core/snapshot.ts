import type { Snapshot } from '@cozy/shared'
import { listAgents } from './agents'
import { listEvents } from './events'
import { getSettings } from './settings'
import { listTasks } from './tasks'

export async function snapshot(): Promise<Snapshot> {
  const [agents, tasks, events, settings] = await Promise.all([listAgents(), listTasks(), listEvents(50), getSettings()])
  return { agents, tasks, events, settings, serverTime: new Date().toISOString() }
}
