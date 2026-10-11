import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Agent } from '../types'
import { BUILDING_MAP, POND } from '../data'
import { levelFor, useStore } from '../store'
import { insideIsland } from './geometry'

interface Runtime {
  x: number
  z: number
  tx: number
  tz: number
  wait: number
  yaw: number
  t: number
  arrived: boolean
}

const SPEED = 2.4

function randomWanderTarget(): [number, number] {
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() * 2 - 1) * 22
    const z = (Math.random() * 2 - 1) * 18
    const inPond = Math.hypot((POND.x - x) / (POND.rx + 1), (POND.z - z) / (POND.rz + 1)) < 1
    if (insideIsland(x, z, 0.85) && !inPond) return [x, z]
  }
  return [0, 0]
}

export default function AgentMesh({ agent, slot }: { agent: Agent; slot: number }) {
  const task = useStore((s) => s.tasks.find((t) => t.assigneeId === agent.id && t.status === 'running'))
  const showNames = useStore((s) => s.ui.showNames)
  const showBubbles = useStore((s) => s.ui.showBubbles)
  const selected = useStore((s) => s.selectedAgentId === agent.id)
  const toasts = useStore((s) => s.toasts)
  const selectAgent = useStore((s) => s.selectAgent)
  const setPanel = useStore((s) => s.setPanel)
  const myToasts = toasts.filter((t) => t.agentId === agent.id)

  const home = useMemo(() => {
    const b = BUILDING_MAP[agent.buildingId]
    return { x: b.x + (slot === 0 ? -0.9 : 0.9), z: b.z + 3.1 }
  }, [agent.buildingId, slot])

  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const rt = useRef<Runtime | null>(null)
  if (!rt.current) {
    const [tx, tz] = randomWanderTarget()
    rt.current = {
      x: home.x + (Math.random() - 0.5) * 2,
      z: home.z + 1 + Math.random() * 2,
      tx,
      tz,
      wait: Math.random() * 2,
      yaw: 0,
      t: Math.random() * 10,
      arrived: false,
    }
  }

  const working = !!task
  const level = levelFor(agent.xp)

  useFrame((_, delta) => {
    const r = rt.current!
    const dt = Math.min(delta, 0.05)
    r.t += dt

    if (working) {
      r.tx = home.x
      r.tz = home.z
    } else if (r.wait > 0) {
      r.wait -= dt
    } else if (r.arrived) {
      const [tx, tz] = randomWanderTarget()
      r.tx = tx
      r.tz = tz
      r.arrived = false
    }

    const dx = r.tx - r.x
    const dz = r.tz - r.z
    const dist = Math.hypot(dx, dz)
    let moving = false
    if (dist > 0.12) {
      moving = true
      const step = Math.min(dist, SPEED * dt)
      r.x += (dx / dist) * step
      r.z += (dz / dist) * step
      const targetYaw = Math.atan2(dx, dz)
      let diff = targetYaw - r.yaw
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      r.yaw += diff * Math.min(1, dt * 8)
      r.arrived = false
    } else if (!r.arrived) {
      r.arrived = true
      r.wait = 1.5 + Math.random() * 3.5
      if (working) r.yaw = Math.PI // face the building door
    }

    const g = group.current
    if (!g) return
    const bob = moving ? Math.abs(Math.sin(r.t * 11)) * 0.14 : working ? Math.abs(Math.sin(r.t * 5)) * 0.06 : 0
    g.position.set(r.x, bob, r.z)
    g.rotation.y = r.yaw
    if (body.current) {
      body.current.rotation.z = moving ? Math.sin(r.t * 11) * 0.08 : 0
      const squash = working && !moving ? 1 + Math.sin(r.t * 5) * 0.03 : 1
      body.current.scale.set(1 / squash, squash, 1 / squash)
    }
  })

  const skin = '#ffe3cf'
  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation()
        selectAgent(agent.id)
        setPanel('agents')
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <group ref={body}>
        {/* body */}
        <mesh position-y={0.62} castShadow>
          <capsuleGeometry args={[0.34, 0.45, 4, 10]} />
          <meshStandardMaterial color={agent.color} />
        </mesh>
        {/* head */}
        <mesh position-y={1.28} castShadow>
          <sphereGeometry args={[0.36, 14, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* hair cap */}
        <mesh position-y={1.42} scale={[1, 0.7, 1]} castShadow>
          <sphereGeometry args={[0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={agent.color} />
        </mesh>
        {/* eyes */}
        <mesh position={[-0.12, 1.3, 0.31]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#3a2b2b" />
        </mesh>
        <mesh position={[0.12, 1.3, 0.31]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#3a2b2b" />
        </mesh>
        {/* blush */}
        <mesh position={[-0.22, 1.2, 0.27]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#ffb0c0" />
        </mesh>
        <mesh position={[0.22, 1.2, 0.27]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#ffb0c0" />
        </mesh>
      </group>

      {/* selection ring */}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial color="#ff7eb3" />
        </mesh>
      )}

      {showNames && (
        <Html position={[0, -0.15, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`name-pill ${working ? 'is-working' : ''}`}>
            <span className="name-emoji">{agent.emoji}</span>
            <span>{agent.name}</span>
            <span className="lv">Lv{level}</span>
          </div>
        </Html>
      )}

      {showBubbles && task && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="task-bubble">
            <div className="task-bubble-title">{task.title}</div>
            <div className="task-bubble-bar">
              <div style={{ width: `${Math.round(task.progress)}%` }} />
            </div>
          </div>
        </Html>
      )}

      {myToasts.map((t, i) => (
        <Html key={t.id} position={[0, 2.6 + i * 0.6, 0]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div className="xp-toast">
            <div className="xp-toast-main">{t.text}</div>
            {t.sub && <div className="xp-toast-sub">{t.sub}</div>}
          </div>
        </Html>
      ))}
    </group>
  )
}
