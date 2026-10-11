import type { ServerMessage } from '@cozy/shared'
import { api } from './api'
import { useStore } from './store'

/**
 * Keeps a WebSocket to the server alive with exponential backoff.
 * Every (re)connect pulls a fresh snapshot so the village never drifts from the database.
 */
export function connectRealtime(): () => void {
  let socket: WebSocket | null = null
  let attempt = 0
  let stopped = false
  let timer: number | undefined

  const resync = async () => {
    try {
      useStore.getState().applySnapshot(await api.state())
    } catch (err) {
      useStore.getState().setError(err instanceof Error ? err.message : 'Failed to load village state')
    }
  }

  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${proto}://${location.host}/ws`)
    socket.onopen = () => {
      attempt = 0
      useStore.getState().setConnected(true)
      void resync()
    }
    socket.onmessage = (e) => {
      try {
        useStore.getState().applyMessage(JSON.parse(e.data as string) as ServerMessage)
      } catch (err) {
        console.warn('bad realtime message', err)
      }
    }
    socket.onclose = () => {
      useStore.getState().setConnected(false)
      if (stopped) return
      const delay = Math.min(10_000, 1000 * 2 ** attempt++)
      timer = window.setTimeout(open, delay)
    }
    socket.onerror = () => socket?.close()
  }

  void resync()
  open()

  return () => {
    stopped = true
    window.clearTimeout(timer)
    socket?.close()
  }
}
