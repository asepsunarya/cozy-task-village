import { CASTLE } from '../data'

export default function Castle({ lit }: { lit: boolean }) {
  const win = lit ? '#ffe8a3' : '#ffffff'
  const tower = (x: number, z: number, h: number, r: number, key: string) => (
    <group key={key} position={[x, 0, z]}>
      <mesh position-y={h / 2 + 0.1} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 12]} />
        <meshStandardMaterial color="#fbd3e3" />
      </mesh>
      <mesh position-y={h + 0.1 + r * 0.9} castShadow>
        <coneGeometry args={[r * 1.25, r * 1.9, 12]} />
        <meshStandardMaterial color="#f08cb0" />
      </mesh>
      <mesh position={[0, h - 1.2, r + 0.02]}>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial color={win} emissive={win} emissiveIntensity={lit ? 0.9 : 0.05} />
      </mesh>
    </group>
  )
  return (
    <group position={[CASTLE.x, 0, CASTLE.z]}>
      <mesh position-y={0.06} receiveShadow>
        <cylinderGeometry args={[4.2, 4.4, 0.12, 24]} />
        <meshStandardMaterial color="#f7f2e9" />
      </mesh>
      <mesh position-y={1.6} castShadow receiveShadow>
        <boxGeometry args={[4.2, 3, 3.2]} />
        <meshStandardMaterial color="#fde4ee" />
      </mesh>
      {tower(0, 0, 5.5, 1.1, 'main')}
      {tower(-2.1, 1.5, 3.6, 0.7, 'l')}
      {tower(2.1, 1.5, 3.6, 0.7, 'r')}
      {tower(-2.1, -1.5, 3.2, 0.6, 'bl')}
      {tower(2.1, -1.5, 3.2, 0.6, 'br')}
      {/* gate */}
      <mesh position={[0, 0.9, 1.63]}>
        <boxGeometry args={[1.2, 1.7, 0.1]} />
        <meshStandardMaterial color="#e86d9a" />
      </mesh>
      {/* flag */}
      <mesh position={[0, 9.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
        <meshStandardMaterial color="#8b6b4f" />
      </mesh>
      <mesh position={[0.4, 9.7, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.05]} />
        <meshStandardMaterial color="#ffd23f" />
      </mesh>
    </group>
  )
}
