import * as THREE from 'three'
import { PATH_POINTS } from '../data'

/** Island outline radius at angle a (before the x/z stretch). */
export const islandRadius = (a: number) => 19 + 2.4 * Math.sin(3 * a + 0.4) + 1.3 * Math.cos(5 * a)
export const ISLAND_SX = 1.25
export const ISLAND_SZ = 1.0

/** true when (x,z) lies inside the island, shrunk by `margin` (0..1). */
export function insideIsland(x: number, z: number, margin = 0.9) {
  const a = Math.atan2(z / ISLAND_SZ, x / ISLAND_SX)
  const r = Math.hypot(x / ISLAND_SX, z / ISLAND_SZ)
  return r < islandRadius(a) * margin
}

export function makeIslandGeometry() {
  const pts: THREE.Vector2[] = []
  const N = 120
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const r = islandRadius(a)
    // Shape y maps to -z after rotation, so negate to keep world coords intuitive.
    pts.push(new THREE.Vector2(Math.cos(a) * r * ISLAND_SX, -Math.sin(a) * r * ISLAND_SZ))
  }
  const shape = new THREE.Shape(pts)
  const depth = 2.2
  const bevel = 0.45
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: 0.5,
    bevelSegments: 3,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, -(depth + bevel), 0)
  g.computeVertexNormals()
  return g
}

export const pathCurve = new THREE.CatmullRomCurve3(
  PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  'catmullrom',
  0.5,
)

export const pathSamples: THREE.Vector3[] = pathCurve.getSpacedPoints(140)

export function distToPath(x: number, z: number) {
  let best = Infinity
  for (const p of pathSamples) {
    const d = Math.hypot(p.x - x, p.z - z)
    if (d < best) best = d
  }
  return best
}
