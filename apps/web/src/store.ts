import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Agent, ServerMessage, ServerSettings, Snapshot, Task, TaskStatus, VillageEvent } from '@cozy/shared'
import { api } from './api'
import type { Panel, TimeOfDay, Toast } from './types'

export { levelFor, xpForLevel } from '@cozy/shared'

/** Purely visual preferences. These live in localStorage; everything else comes from the server. */
export interface UiSettings {
  time: TimeOfDay
  showNames: boolean
  showBubbles: boolean
  freeze: boolean
}

interface State {
  connected: boolean
  loaded: boolean
  error: string | null
  agents: Agent[]
  tasks: Task[]
  events: VillageEvent[]
  toasts: Toast[]
  server: ServerSettings
  ui: UiSettings
  panel: Panel
  selectedAgentId: string | null
  viewNonce: number

  setConnected: (connected: boolean) => void
  setError: (error: string | null) => void
  applySnapshot: (snapshot: Snapshot) => void
  applyMessage: (message: ServerMessage) => void
  dismissToast: (id: string) => void

  setPanel: (panel: Panel) => void
  selectAgent: (id: string | null) => void
  setTime: (time: TimeOfDay) => void
  toggleUi: (key: Exclude<keyof UiSettings, 'time'>) => void
  resetView: () => void

  refresh: () => Promise<void>
  addTask: (input: { title: string; description?: string; assigneeId?: string; xp?: number }) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  assignTask: (id: string, agentId: string | null) => Promise<void>
  transition: (id: string, to: TaskStatus) => Promise<void>
  setDemoSim: (on: boolean) => Promise<void>
  resetDemo: () => Promise<void>
}

const PANELS: Panel[] = ['tasks', 'agents', 'add', 'log']
function initialPanel(): Panel {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search).get('panel') as Panel
  return PANELS.includes(p) ? p : null
}

const uid = () => Math.random().toString(36).slice(2, 10)

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      let errorTimer: number | undefined
      const fail = (err: unknown) => {
        set({ error: err instanceof Error ? err.message : String(err) })
        window.clearTimeout(errorTimer)
        errorTimer = window.setTimeout(() => set({ error: null }), 4500)
      }
      const guard = async (fn: () => Promise<unknown>) => {
        try {
          await fn()
        } catch (err) {
          fail(err)
        }
      }
      const upsertTask = (task: Task) => set((s) => ({ tasks: upsert(s.tasks, task) }))

      return {
        connected: false,
        loaded: false,
        error: null,
        agents: [],
        tasks: [],
        events: [],
        toasts: [],
        server: { demoSim: false },
        ui: { time: 'day', showNames: true, showBubbles: true, freeze: false },
        panel: initialPanel(),
        selectedAgentId: null,
        viewNonce: 0,

        setConnected: (connected) => set({ connected }),
        setError: (error) => (error ? fail(error) : set({ error: null })),
        applySnapshot: (snap) =>
          set({ agents: snap.agents, tasks: snap.tasks, events: snap.events, server: snap.settings, loaded: true }),
        applyMessage: (m) => {
          switch (m.type) {
            case 'task.upserted':
              upsertTask(m.task)
              break
            case 'task.deleted':
              set((s) => ({ tasks: s.tasks.filter((t) => t.id !== m.id) }))
              break
            case 'agent.upserted':
              set((s) => ({ agents: upsert(s.agents, m.agent) }))
              break
            case 'agent.deleted':
              set((s) => ({ agents: s.agents.filter((a) => a.id !== m.id) }))
              break
            case 'event':
              set((s) => ({ events: [m.event, ...s.events].slice(0, 80) }))
              break
            case 'toast': {
              const toast: Toast = { id: uid(), agentId: m.agentId, text: m.text, sub: m.sub, createdAt: Date.now() }
              set((s) => ({ toasts: [...s.toasts, toast] }))
              window.setTimeout(() => get().dismissToast(toast.id), 2800)
              break
            }
            case 'settings':
              set({ server: m.settings })
              break
            case 'reset':
              void get().refresh()
              break
            case 'hello':
              break
          }
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        setPanel: (panel) => set({ panel }),
        selectAgent: (selectedAgentId) => set({ selectedAgentId }),
        setTime: (time) => set((s) => ({ ui: { ...s.ui, time } })),
        toggleUi: (key) => set((s) => ({ ui: { ...s.ui, [key]: !s.ui[key] } })),
        resetView: () => set((s) => ({ viewNonce: s.viewNonce + 1 })),

        refresh: () => guard(async () => get().applySnapshot(await api.state())),
        addTask: (input) => guard(async () => upsertTask(await api.createTask(input))),
        deleteTask: (id) =>
          guard(async () => {
            await api.deleteTask(id)
            set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
          }),
        assignTask: (id, agentId) => guard(async () => upsertTask(await api.updateTask(id, { assigneeId: agentId }))),
        transition: (id, to) => guard(async () => upsertTask(await api.transition(id, to))),
        setDemoSim: (demoSim) => guard(async () => set({ server: await api.updateSettings({ demoSim }) })),
        resetDemo: () => guard(async () => get().applySnapshot(await api.reset())),
      }
    },
    { name: 'cozy-task-village-ui', version: 2, partialize: (s) => ({ ui: s.ui }) },
  ),
)
