import { isOpen, type ServerSettings } from '@cozy/shared'
import { config } from '../config'
import { listAgents } from './agents'
import { createTask, listOpenTasks, pruneClosedTasks, setProgress, transitionTask, updateTask } from './tasks'

/**
 * Demo simulation: keeps the village alive without any LLM.
 * Running tasks make progress, idle agents pick up waiting work, and fresh tasks appear when the board runs dry.
 * Everything goes through the same task core as real traffic, so clients see identical events.
 */

export const DEMO_TASK_POOL = [
  'Run sheet: Dad interview',
  'Red + gold palette study',
  'Searching the web: test live event',
  'Draft hook lines for episode 12',
  'QA pass on subtitle timing',
  'Thumbnail A/B variants',
  'Cut 30s teaser from raw footage',
  'Update platform upload checklist',
  'Trend scan: cozy game aesthetics',
  'Write caption copy for carousel',
  'Color grade: warm evening look',
  'Community replies batch (morning)',
  'Audience retention report',
  'Storyboard intro sequence',
  'Lower-third template refresh',
  'Schedule next week posts',
  'Research: pastel UI references',
  'Fix audio ducking on VO',
  'Script polish: cold open',
  'Collect B-roll of workshop',
  'Rename and archive project files',
  'Sync sponsor segment timing',
]

const ACTOR = { kind: 'demo' } as const
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

let timer: NodeJS.Timeout | null = null
let ticking = false

export const demoRunning = () => timer !== null

export function syncDemo(settings: ServerSettings) {
  if (settings.demoSim) startDemo()
  else stopDemo()
}

export function startDemo() {
  if (timer) return
  timer = setInterval(() => void tick(), config.demoTickMs)
}

export function stopDemo() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

async function tick() {
  if (ticking) return
  ticking = true
  try {
    // 1. running work makes progress; finished work is completed (awards XP, fires toasts)
    for (const t of (await listOpenTasks()).filter((x) => x.status === 'running')) {
      const p = t.progress + 2 + Math.random() * 7
      if (p >= 100) await transitionTask(t.id, 'done', { actor: ACTOR })
      else await setProgress(t.id, p)
    }

    // 2. idle agents pick up waiting tasks, staggered so it feels alive rather than mechanical
    const agents = await listAgents()
    const open = await listOpenTasks()
    const busy = new Set(open.filter((t) => t.status === 'running').map((t) => t.assigneeId))
    for (const t of open.filter((x) => x.status === 'todo' || x.status === 'queued')) {
      if (busy.size >= config.maxConcurrentRuns) break
      if (Math.random() < 0.55) continue
      let agentId = t.assigneeId
      if (agentId && busy.has(agentId)) continue
      if (!agentId) {
        const idle = agents.filter((a) => !busy.has(a.id))
        if (idle.length === 0) break
        agentId = pick(idle).id
        await updateTask(t.id, { assigneeId: agentId })
      }
      busy.add(agentId)
      await transitionTask(t.id, 'running', { actor: ACTOR })
    }

    // 3. spawn fresh work when the board runs dry
    const stillOpen = open.filter((t) => isOpen(t.status))
    if (stillOpen.length < 6 && Math.random() < 0.35) {
      const used = new Set(stillOpen.map((t) => t.title))
      const candidates = DEMO_TASK_POOL.filter((title) => !used.has(title))
      if (candidates.length) await createTask({ title: pick(candidates) }, ACTOR)
    }

    // 4. keep the closed list tidy
    await pruneClosedTasks(40)
  } catch (err) {
    console.error('[demo] tick failed:', err)
  } finally {
    ticking = false
  }
}
