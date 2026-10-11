import { useState, type FormEvent } from 'react'
import { isOpen, type Task, type TaskStatus } from '@cozy/shared'
import { BUILDING_MAP } from '../data'
import { levelFor, useStore, xpForLevel } from '../store'

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

interface Action {
  to: TaskStatus
  icon: string
  title: string
  cls?: string
}

/** Buttons offered per status. Mirrors the server's TRANSITIONS table, minus the agent-only moves. */
const ACTIONS: Record<TaskStatus, Action[]> = {
  todo: [
    { to: 'running', icon: '▶', title: 'Start' },
    { to: 'cancelled', icon: '✕', title: 'Cancel' },
  ],
  queued: [
    { to: 'running', icon: '▶', title: 'Start now' },
    { to: 'todo', icon: '⏸', title: 'Back to waiting' },
  ],
  running: [
    { to: 'todo', icon: '⏸', title: 'Back to waiting' },
    { to: 'review', icon: '👀', title: 'Send to review' },
    { to: 'done', icon: '✓', title: 'Complete', cls: 'ok' },
  ],
  review: [
    { to: 'todo', icon: '↺', title: 'Redo' },
    { to: 'done', icon: '✓', title: 'Approve', cls: 'ok' },
  ],
  done: [{ to: 'todo', icon: '↺', title: 'Reopen' }],
  failed: [{ to: 'todo', icon: '↺', title: 'Retry' }],
  cancelled: [{ to: 'todo', icon: '↺', title: 'Restore' }],
}

function TaskRow({ task }: { task: Task }) {
  const agents = useStore((s) => s.agents)
  const assignTask = useStore((s) => s.assignTask)
  const transition = useStore((s) => s.transition)
  const deleteTask = useStore((s) => s.deleteTask)
  const agent = agents.find((a) => a.id === task.assigneeId)
  const closed = !isOpen(task.status)
  return (
    <div className={`task-row status-${task.status}`}>
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-meta">
          <select value={task.assigneeId ?? ''} onChange={(e) => void assignTask(task.id, e.target.value || null)} disabled={closed}>
            <option value="">— unassigned —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>
          <span className="xp-badge">+{task.xp} XP</span>
          {task.status === 'queued' && <span className="status-chip">queued</span>}
          {task.status === 'failed' && task.error && (
            <span className="status-chip error" title={task.error}>
              failed
            </span>
          )}
          {closed && task.completedAt && <span className="muted">{timeAgo(task.completedAt)}</span>}
        </div>
        {task.status === 'running' && (
          <div className="bar">
            <div style={{ width: `${Math.round(task.progress)}%`, background: agent?.color ?? '#f28cb4' }} />
          </div>
        )}
        {task.result && task.status !== 'running' && <div className="task-result">{task.result}</div>}
      </div>
      <div className="task-actions">
        {ACTIONS[task.status].map((a) => (
          <button key={a.to} className={`icon-btn ${a.cls ?? ''}`} title={a.title} onClick={() => void transition(task.id, a.to)}>
            {a.icon}
          </button>
        ))}
        <button className="icon-btn danger" title="Delete" onClick={() => void deleteTask(task.id)}>
          🗑
        </button>
      </div>
    </div>
  )
}

function Section({ title, list, empty }: { title: string; list: Task[]; empty?: string }) {
  if (list.length === 0 && !empty) return null
  return (
    <section>
      <h3>
        {title} <span className="count">{list.length}</span>
      </h3>
      {list.length === 0 ? <p className="muted">{empty}</p> : list.map((t) => <TaskRow key={t.id} task={t} />)}
    </section>
  )
}

function TasksPanel() {
  const tasks = useStore((s) => s.tasks)
  const running = tasks.filter((t) => t.status === 'running')
  const review = tasks.filter((t) => t.status === 'review')
  const waiting = tasks.filter((t) => t.status === 'todo' || t.status === 'queued')
  const done = tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''))
  const dropped = tasks.filter((t) => t.status === 'failed' || t.status === 'cancelled')
  return (
    <>
      <Section title="🛠️ In progress" list={running} empty="Nobody is working right now. Cozy!" />
      <Section title="👀 Review" list={review} />
      <Section title="⏳ Waiting" list={waiting} empty="Nothing waiting. Add a task with ➕" />
      <Section title="✅ Done" list={done.slice(0, 20)} empty="No finished tasks yet." />
      <Section title="💤 Failed & cancelled" list={dropped} />
    </>
  )
}

function AddPanel() {
  const agents = useStore((s) => s.agents)
  const addTask = useStore((s) => s.addTask)
  const setPanel = useStore((s) => s.setPanel)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [xp, setXp] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await addTask({
      title,
      description: description.trim() || undefined,
      assigneeId: assignee || undefined,
      xp: xp ? Number(xp) : undefined,
    })
    setTitle('')
    setDescription('')
    setXp('')
    setPanel('tasks')
  }
  return (
    <form className="add-form" onSubmit={(e) => void submit(e)}>
      <label>
        Task
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cut 30s teaser" />
      </label>
      <label>
        Details <span className="muted">(optional, the agent will read this)</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Links, constraints, what good looks like…"
        />
      </label>
      <label>
        Assign to
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Auto (first idle agent)</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        XP reward
        <input type="number" min={1} max={1000} value={xp} onChange={(e) => setXp(e.target.value)} placeholder="random 12–40" />
      </label>
      <button className="primary" type="submit">
        Add to the board
      </button>
      <p className="muted">Saved to the server. With DEMO SIM on, an idle agent picks it up and walks home to work on it.</p>
    </form>
  )
}

function AgentsPanel() {
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const selectedId = useStore((s) => s.selectedAgentId)
  const selectAgent = useStore((s) => s.selectAgent)
  return (
    <div className="agent-list">
      {agents.map((a) => {
        const lv = levelFor(a.xp)
        const cur = xpForLevel(lv)
        const next = xpForLevel(lv + 1)
        const pct = Math.round(((a.xp - cur) / (next - cur)) * 100)
        const task = tasks.find((t) => t.assigneeId === a.id && t.status === 'running')
        const home = BUILDING_MAP[a.buildingId]
        return (
          <div
            key={a.id}
            className={`agent-row ${selectedId === a.id ? 'on' : ''}`}
            onClick={() => selectAgent(selectedId === a.id ? null : a.id)}
          >
            <div className="avatar" style={{ background: a.color }}>
              {a.emoji}
            </div>
            <div className="agent-main">
              <div className="agent-head">
                <b>{a.name}</b>
                <span className="lv">Lv{lv}</span>
              </div>
              {a.role && <div className="muted small">{a.role}</div>}
              <div className="bar thin">
                <div style={{ width: `${pct}%`, background: a.color }} />
              </div>
              <div className="muted small">
                {a.xp.toLocaleString()} XP · {home?.name ?? a.buildingId}
              </div>
              <div className="agent-task">{task ? `🛠️ ${task.title}` : '☕ wandering'}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LogPanel() {
  const events = useStore((s) => s.events)
  return (
    <div className="log-list">
      {events.length === 0 && <p className="muted">Nothing has happened yet.</p>}
      {events.map((e) => (
        <div key={e.id} className="log-row">
          <span className="muted small">{timeAgo(e.createdAt)}</span>
          <span>{e.message}</span>
        </div>
      ))}
    </div>
  )
}

const TITLES = { tasks: '📋 Task board', add: '➕ New task', agents: '👥 Villagers', log: '📜 Village log' }

export default function Panels() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  if (!panel) return null
  return (
    <aside className="panel card">
      <header>
        <h2>{TITLES[panel]}</h2>
        <button className="icon-btn" onClick={() => setPanel(null)} title="Close">
          ✕
        </button>
      </header>
      <div className="panel-body">
        {panel === 'tasks' && <TasksPanel />}
        {panel === 'add' && <AddPanel />}
        {panel === 'agents' && <AgentsPanel />}
        {panel === 'log' && <LogPanel />}
      </div>
    </aside>
  )
}
