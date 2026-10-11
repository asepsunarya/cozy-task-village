import type { TimeOfDay } from './types'

export { BUILDINGS, BUILDING_MAP } from '@cozy/shared'

export const PATH_POINTS: [number, number][] = [
  [-19, 12],
  [-13, 9],
  [-9, 4],
  [-6, 0],
  [-5, -5],
  [-1, -9],
  [5, -10],
  [10, -8],
  [13, -4],
  [12, 1],
  [9, 5],
  [5, 8],
  [0, 10],
  [-4, 14],
]

export const POND = { x: -15, z: 0, rx: 4.5, rz: 3.2 }
export const CASTLE = { x: 16, z: -9 }

export interface TimePreset {
  bg: string
  sea: string
  ambient: number
  ambientColor: string
  sun: number
  sunColor: string
  sunPos: [number, number, number]
  sky: string
  ground: string
  windows: boolean
}

export const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  day: {
    bg: '#f8cfe0',
    sea: '#f3bfd4',
    ambient: 0.7,
    ambientColor: '#ffffff',
    sun: 1.9,
    sunColor: '#fff4dc',
    sunPos: [25, 35, 15],
    sky: '#e3f4ff',
    ground: '#b8e986',
    windows: false,
  },
  cloudy: {
    bg: '#e8d9ea',
    sea: '#dcc9e0',
    ambient: 1.0,
    ambientColor: '#f1f3ff',
    sun: 0.9,
    sunColor: '#e9edf7',
    sunPos: [10, 35, 10],
    sky: '#e8ecf5',
    ground: '#a9c993',
    windows: false,
  },
  sunset: {
    bg: '#f9b58e',
    sea: '#f2a278',
    ambient: 0.55,
    ambientColor: '#ffd9c0',
    sun: 1.5,
    sunColor: '#ffb36b',
    sunPos: [-30, 14, 10],
    sky: '#ffd1a8',
    ground: '#c98c6b',
    windows: true,
  },
  night: {
    bg: '#3a3566',
    sea: '#2f2b55',
    ambient: 0.3,
    ambientColor: '#9aa6ff',
    sun: 0.5,
    sunColor: '#aab8ff',
    sunPos: [-15, 30, -20],
    sky: '#6e78c8',
    ground: '#2d3b5c',
    windows: true,
  },
}

export const TILE_COLORS = ['#ffb3c6', '#ffe29a', '#b8e0ff', '#c9f2c7', '#e2c6ff', '#ffd3a8']
