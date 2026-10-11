import type { ServerSettings } from '@cozy/shared'
import { db } from '../db'
import { settings } from '../db/schema'
import { publish } from '../realtime'
import { syncDemo } from './demo'

const DEFAULTS: ServerSettings = { demoSim: true }

export async function getSettings(): Promise<ServerSettings> {
  const rows = await db.select().from(settings)
  const merged: ServerSettings = { ...DEFAULTS }
  for (const r of rows) {
    if (r.key === 'demoSim' && typeof r.value === 'boolean') merged.demoSim = r.value
  }
  return merged
}

export async function updateSettings(patch: Partial<ServerSettings>): Promise<ServerSettings> {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  }
  const next = await getSettings()
  publish({ type: 'settings', settings: next })
  syncDemo(next)
  return next
}
