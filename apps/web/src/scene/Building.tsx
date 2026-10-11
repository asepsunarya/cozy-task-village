import type { Building as B } from '../types'

export default function Building({ b, lit }: { b: B; lit: boolean }) {
  const h = b.kind === 'tower' ? 3.4 : 2.1
  const windowColor = lit ? '#ffe8a3' : '#cfe9ff'
  return (
    <group position={[b.x, 0, b.z]}>
      {/* plaza */}
      <mesh position-y={0.05} receiveShadow>
        <boxGeometry args={[5.2, 0.1, 5.2]} />
        <meshStandardMaterial color="#f7f2e9" />
      </mesh>
      {/* body */}
      <mesh position-y={h / 2 + 0.1} castShadow receiveShadow>
        <boxGeometry args={[2.8, h, 2.6]} />
        <meshStandardMaterial color={b.body} />
      </mesh>
      {/* roof */}
      {b.kind === 'shop' ? (
        <group position-y={h + 0.1}>
          <mesh position-y={0.25} castShadow>
            <boxGeometry args={[3.4, 0.5, 3.2]} />
            <meshStandardMaterial color={b.roof} />
          </mesh>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 0.5, 2]} />
            <meshStandardMaterial color={b.body} />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[2.6, 0.3, 2.4]} />
            <meshStandardMaterial color={b.roof} />
          </mesh>
          {/* awning */}
          <mesh position={[0, -0.8, 1.55]} rotation-x={0.35} castShadow>
            <boxGeometry args={[2.4, 0.12, 0.9]} />
            <meshStandardMaterial color={b.roof} />
          </mesh>
        </group>
      ) : (
        <mesh position-y={h + 0.1 + 0.8} rotation-y={Math.PI / 4} castShadow>
          <coneGeometry args={[2.25, 1.6, b.kind === 'tower' ? 8 : 4]} />
          <meshStandardMaterial color={b.roof} flatShading />
        </mesh>
      )}
      {b.kind === 'house' && (
        <mesh position={[0.8, h + 0.9, -0.5]} castShadow>
          <boxGeometry args={[0.45, 1.0, 0.45]} />
          <meshStandardMaterial color="#e8c9b5" />
        </mesh>
      )}
      {/* door */}
      <mesh position={[0, 0.7, 1.32]}>
        <boxGeometry args={[0.75, 1.2, 0.1]} />
        <meshStandardMaterial color={b.roof} />
      </mesh>
      <mesh position={[0, 1.42, 1.33]}>
        <boxGeometry args={[0.95, 0.22, 0.1]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* windows */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, h - 0.6, 1.32]}>
          <boxGeometry args={[0.55, 0.55, 0.08]} />
          <meshStandardMaterial
            color={windowColor}
            emissive={windowColor}
            emissiveIntensity={lit ? 0.9 : 0.05}
          />
        </mesh>
      ))}
      {/* little step stones in front */}
      <mesh position={[0, 0.11, 2.0]} receiveShadow>
        <boxGeometry args={[1.0, 0.04, 0.6]} />
        <meshStandardMaterial color="#e9dfd2" />
      </mesh>
    </group>
  )
}
