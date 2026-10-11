import { isOpen } from '@cozy/shared'
import { useStore } from '../store'
import type { Panel, TimeOfDay } from '../types'

const TIMES: { key: TimeOfDay; icon: string; label: string }[] = [
  { key: 'day', icon: '☀️', label: 'Day' },
  { key: 'cloudy', icon: '⛅', label: 'Cloudy' },
  { key: 'sunset', icon: '🌇', label: 'Sunset' },
  { key: 'night', icon: '🌙', label: 'Night' },
]

const DOCK: { key: Exclude<Panel, null>; icon: string; label: string }[] = [
  { key: 'tasks', icon: '📋', label: 'Tasks' },
  { key: 'add', icon: '➕', label: 'New task' },
  { key: 'agents', icon: '👥', label: 'Agents' },
  { key: 'log', icon: '📜', label: 'Log' },
]

export default function HUD() {
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const ui = useStore((s) => s.ui)
  const server = useStore((s) => s.server)
  const connected = useStore((s) => s.connected)
  const loaded = useStore((s) => s.loaded)
  const error = useStore((s) => s.error)
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const setTime = useStore((s) => s.setTime)
  const toggleUi = useStore((s) => s.toggleUi)
  const resetView = useStore((s) => s.resetView)
  const setDemoSim = useStore((s) => s.setDemoSim)
  const resetDemo = useStore((s) => s.resetDemo)

  const working = new Set(tasks.filter((t) => t.status === 'running').map((t) => t.assigneeId)).size
  const waiting = tasks.filter((t) => t.status === 'todo' || t.status === 'queued').length
  const review = tasks.filter((t) => t.status === 'review').length
  const done = tasks.filter((t) => t.status === 'done').length
  const open = tasks.filter((t) => isOpen(t.status)).length
  const totalXp = agents.reduce((n, a) => n + a.xp, 0)
  const idle = Math.max(0, agents.length - working)

  return (
    <>
      <div className="hud-top-left card">
        <div className="stat-row">
          <span className="stat"><i className="dot" style={{ background: '#f3c35b' }} /> <b>{agents.length}</b> agents</span>
          <span className="stat"><i className="dot" style={{ background: '#6cc8ad' }} /> <b>{working}</b> working</span>
          <span className="stat"><i className="dot" style={{ background: '#f0a06a' }} /> <b>{waiting}</b> waiting</span>
          <span className="stat"><i className="dot" style={{ background: '#8ab6f0' }} /> <b>{idle}</b> idle</span>
        </div>
        <div className="stat-row">
          <span className="stat"><i className="dot" style={{ background: '#d87ba5' }} /> <b>{review}</b> review</span>
          <span className="stat"><i className="dot" style={{ background: '#e86d6d' }} /> <b>{done}</b> done</span>
          <span className="stat"><i className="dot" style={{ background: '#a98cf0' }} /> <b>{open}</b> tasks</span>
          <span className="stat">⭐ <b>{totalXp.toLocaleString()}</b> XP</span>
          <span className={`stat ${connected ? 'live' : 'offline'}`}>
            <i className={`dot ${connected ? 'pulse' : 'off'}`} /> {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="stat-row center">
          <button
            className={`pill ${server.demoSim ? 'on' : ''}`}
            onClick={() => void setDemoSim(!server.demoSim)}
            disabled={!loaded}
            title="Server-side simulation: agents pick up work and make progress on their own"
          >
            🎲 DEMO SIM {server.demoSim ? 'on' : 'off'}
          </button>
          <button className="pill ghost" onClick={() => void resetDemo()} disabled={!loaded} title="Reset agents, tasks and XP on the server">
            ↺ reset
          </button>
        </div>
      </div>

      <div className="hud-top-center">
        <div className="card segmented">
          {TIMES.map((t) => (
            <button key={t.key} className={`seg ${ui.time === t.key ? 'on' : ''}`} onClick={() => setTime(t.key)} title={t.label}>
              {t.icon}
            </button>
          ))}
        </div>
        <button className={`card pill-lg ${ui.freeze ? 'on' : ''}`} onClick={() => toggleUi('freeze')}>
          🧊 Freeze view
        </button>
        <button className={`card pill-lg ${ui.showNames ? 'on' : ''}`} onClick={() => toggleUi('showNames')}>
          🏷️ Names
        </button>
        <button className={`card pill-lg ${ui.showBubbles ? 'on' : ''}`} onClick={() => toggleUi('showBubbles')}>
          💬 Bubbles
        </button>
        <button className="card pill-lg" onClick={resetView} title="Back to the default isometric view">
          🎯 Reset view
        </button>
      </div>

      {error && <div className="hud-error card">⚠️ {error}</div>}
      {!loaded && !error && <div className="hud-error card muted">Connecting to the village server…</div>}

      <div className="hud-hint">🖱️ drag to rotate · scroll / pinch to zoom · right-drag or ⇧+drag to pan</div>

      <div className="dock card">
        {DOCK.map((d) => (
          <button
            key={d.key}
            className={`dock-btn ${panel === d.key ? 'on' : ''}`}
            onClick={() => setPanel(panel === d.key ? null : d.key)}
            title={d.label}
          >
            <span>{d.icon}</span>
            <small>{d.label}</small>
          </button>
        ))}
      </div>
    </>
  )
}
