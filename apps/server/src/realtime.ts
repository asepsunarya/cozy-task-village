import { WebSocket } from 'ws'
import type { ServerMessage } from '@cozy/shared'

const clients = new Set<WebSocket>()

export function registerClient(socket: WebSocket) {
  clients.add(socket)
  const drop = () => clients.delete(socket)
  socket.on('close', drop)
  socket.on('error', drop)
}

/** Fan a message out to every connected village. */
export function publish(message: ServerMessage) {
  if (clients.size === 0) return
  const data = JSON.stringify(message)
  for (const socket of clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(data)
  }
}

export const clientCount = () => clients.size
