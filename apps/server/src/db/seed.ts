import { count } from 'drizzle-orm'
import { db } from './index'
import { agents, events, taskRuns, tasks, xpEvents } from './schema'

const AGENT_SEED = [
  { id: 'a01', name: 'Finesse Lead', emoji: '🎀', color: '#f28cb4', role: 'Polish and final QA of visuals', xp: 2800, buildingId: 'b-finesse' },
  { id: 'a02', name: 'QA Editor', emoji: '✅', color: '#6fb4f2', role: 'Reviews edits, subtitles and timing', xp: 5200, buildingId: 'b-qa' },
  { id: 'a03', name: 'Producer', emoji: '🎬', color: '#f3c35b', role: 'Plans shoots and run sheets', xp: 5000, buildingId: 'b-producer' },
  { id: 'a04', name: 'Design Lead', emoji: '🎨', color: '#f0a06a', role: 'Palettes, thumbnails and layouts', xp: 4100, buildingId: 'b-design' },
  { id: 'a05', name: 'Platforms', emoji: '🛒', color: '#a98cf0', role: 'Publishing and platform checklists', xp: 900, buildingId: 'b-platforms' },
  { id: 'a06', name: 'Post-Producer', emoji: '🎞️', color: '#e86d6d', role: 'Cuts, grades and exports', xp: 2500, buildingId: 'b-post' },
  { id: 'a07', name: 'Strategist', emoji: '♟️', color: '#d87ba5', role: 'Content strategy and scheduling', xp: 1300, buildingId: 'b-strategy' },
  { id: 'a08', name: 'Viva Lead', emoji: '🎤', color: '#6cc8ad', role: 'Live events and interviews', xp: 1600, buildingId: 'b-viva' },
  { id: 'a09', name: 'Fengshui Lead', emoji: '🌿', color: '#8bc96c', role: 'Set design and mood', xp: 1400, buildingId: 'b-fengshui' },
  { id: 'a10', name: 'Scriptwriter', emoji: '✍️', color: '#7f90e8', role: 'Scripts, hooks and captions', xp: 7200, buildingId: 'b-script' },
  { id: 'a11', name: 'Min Lead', emoji: '✨', color: '#e8b84a', role: 'Templates and motion assets', xp: 1000, buildingId: 'b-min' },
  { id: 'a12', name: 'Trend Scout', emoji: '🔭', color: '#e89468', role: 'Research and trend scanning', xp: 950, buildingId: 'b-trend' },
  { id: 'a13', name: 'Community', emoji: '💬', color: '#f78fb3', role: 'Replies, comments and DMs', xp: 600, buildingId: 'b-viva' },
  { id: 'a14', name: 'Analyst', emoji: '📊', color: '#5fb8c9', role: 'Metrics and retention reports', xp: 1800, buildingId: 'b-strategy' },
]

const TASK_SEED = [
  { title: 'Run sheet: Dad interview', assigneeId: 'a03', status: 'running' as const, progress: 35, xp: 30 },
  { title: 'Red + gold palette study', assigneeId: 'a04', status: 'running' as const, progress: 60, xp: 24 },
  { title: 'Searching the web: test live event', assigneeId: 'a12', status: 'running' as const, progress: 10, xp: 18 },
  { title: 'QA pass on subtitle timing', assigneeId: 'a02', status: 'todo' as const, progress: 0, xp: 26 },
  { title: 'Draft hook lines for episode 12', assigneeId: null, status: 'todo' as const, progress: 0, xp: 22 },
]

async function seedAll() {
  const now = Date.now()
  await db.insert(agents).values(
    AGENT_SEED.map((a) => ({
      ...a,
      systemPrompt: `You are ${a.name}, a member of a small content studio. Your specialty: ${a.role}. Work carefully, report progress as you go, and finish with a concise, useful result.`,
    })),
  )
  await db.insert(tasks).values(
    TASK_SEED.map((t, i) => ({
      id: crypto.randomUUID(),
      title: t.title,
      assigneeId: t.assigneeId,
      status: t.status,
      progress: t.progress,
      xp: t.xp,
      createdBy: 'seed',
      createdAt: new Date(now - (TASK_SEED.length - i) * 60_000),
      updatedAt: new Date(now - (TASK_SEED.length - i) * 60_000),
      startedAt: t.status === 'running' ? new Date(now - 30_000) : null,
    })),
  )
  await db.insert(events).values({ id: crypto.randomUUID(), type: 'system', message: 'Welcome to the village 🏡' })
}

/** First boot: create the demo team if the database is empty. */
export async function seedIfEmpty() {
  const [{ n }] = await db.select({ n: count() }).from(agents)
  if (Number(n) > 0) return false
  await seedAll()
  return true
}

/** Wipe everything and start over with the demo team. */
export async function resetAll() {
  await db.delete(events)
  await db.delete(xpEvents)
  await db.delete(taskRuns)
  await db.delete(tasks)
  await db.delete(agents)
  await seedAll()
}
