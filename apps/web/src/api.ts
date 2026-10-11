import type { Agent, CreateTaskInput, ServerSettings, Snapshot, Task, TaskStatus, UpdateTaskInput, VillageEvent } from '@cozy/shared'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      message = body.message ?? body.error ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

export const api = {
  state: () => request<Snapshot>('/api/state'),
  agents: () => request<Agent[]>('/api/agents'),
  events: (limit = 50) => request<VillageEvent[]>(`/api/events?limit=${limit}`),
  createTask: (input: CreateTaskInput) => request<Task>('/api/tasks', { method: 'POST', ...json(input) }),
  updateTask: (id: string, patch: UpdateTaskInput) => request<Task>(`/api/tasks/${id}`, { method: 'PATCH', ...json(patch) }),
  transition: (id: string, to: TaskStatus) => request<Task>(`/api/tasks/${id}/transition`, { method: 'POST', ...json({ to }) }),
  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  updateSettings: (patch: Partial<ServerSettings>) => request<ServerSettings>('/api/settings', { method: 'PATCH', ...json(patch) }),
  reset: () => request<Snapshot>('/api/reset', { method: 'POST' }),
}
