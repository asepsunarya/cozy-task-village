import { useEffect, useRef, type ComponentRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { useStore } from '../store'
import { BUILDINGS, TIME_PRESETS } from '../data'
import Island from './Island'
import Path from './Path'
import Decor from './Decor'
import Building from './Building'
import Castle from './Castle'
import AgentMesh from './AgentMesh'

function Agents() {
  const agents = useStore((s) => s.agents)
  const slots = new Map<string, number>()
  return (
    <>
      {agents.map((a) => {
        const slot = slots.get(a.buildingId) ?? 0
        slots.set(a.buildingId, slot + 1)
        return <AgentMesh key={a.id} agent={a} slot={slot} />
      })}
    </>
  )
}

export default function Village() {
  const time = useStore((s) => s.ui.time)
  const freeze = useStore((s) => s.ui.freeze)
  const selectAgent = useStore((s) => s.selectAgent)
  const viewNonce = useStore((s) => s.viewNonce)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const p = TIME_PRESETS[time]

  useEffect(() => {
    document.body.style.background = p.bg
  }, [p.bg])

  // "Reset view" from the HUD: jump back to the default isometric angle and zoom.
  useEffect(() => {
    if (viewNonce > 0) controls.current?.reset()
  }, [viewNonce])

  return (
    <Canvas shadows dpr={[1, 2]} className="canvas" onPointerMissed={() => selectAgent(null)}>
      <color attach="background" args={[p.bg]} />
      <OrthographicCamera makeDefault position={[36, 32, 36]} zoom={22} near={-500} far={1000} />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!freeze}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.9}
        zoomSpeed={1.2}
        panSpeed={0.9}
        zoomToCursor
        minZoom={4}
        maxZoom={220}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={[0, 0, 0]}
      />
      <ambientLight intensity={p.ambient} color={p.ambientColor} />
      <hemisphereLight args={[p.sky, p.ground, 0.6]} />
      <directionalLight
        position={p.sunPos}
        intensity={p.sun}
        color={p.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />

      <Island sea={p.sea} />
      <Path />
      <Decor />
      {BUILDINGS.map((b) => (
        <Building key={b.id} b={b} lit={p.windows} />
      ))}
      <Castle lit={p.windows} />
      <Agents />
    </Canvas>
  )
}
