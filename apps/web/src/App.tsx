import { useEffect } from 'react'
import Village from './scene/Village'
import HUD from './ui/HUD'
import Panels from './ui/Panels'
import { connectRealtime } from './ws'

export default function App() {
  useEffect(() => connectRealtime(), [])
  return (
    <div className="app">
      <Village />
      <HUD />
      <Panels />
    </div>
  )
}
