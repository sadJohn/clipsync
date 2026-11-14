import {
  SocketEvents,
  type LocalClipRecord,
  type SyncDeleteClipPayload,
  type SyncNewClipPayload,
} from '@clipsync/shared'
import { io, type Socket } from 'socket.io-client'
import { SERVER_URL } from './server'

interface SyncSocketHandlers {
  onNewClip: (clip: LocalClipRecord) => void
  onDeleteClip: (id: string) => void
}

/**
 * 建立云端实时同步连接，事件载荷统一转换为本地记录形态。
 */
export function connectSyncSocket(token: string, handlers: SyncSocketHandlers): Socket {
  const socket = io(SERVER_URL, {
    auth: { token },
    reconnection: true,
  })

  socket.on(SocketEvents.SYNC_NEW_CLIP, (payload: SyncNewClipPayload) => {
    handlers.onNewClip({
      id: payload.clip.id,
      content: payload.clip.content,
      type: payload.clip.type,
      deviceName: payload.clip.deviceName,
      isPinned: payload.clip.isPinned,
      isSynced: true,
      createdAt: payload.clip.createdAt,
    })
  })

  socket.on(SocketEvents.SYNC_DELETE_CLIP, (payload: SyncDeleteClipPayload) => {
    handlers.onDeleteClip(payload.id)
  })

  socket.on('connect_error', (error) => {
    console.warn('[sync] 实时连接失败', error.message)
  })

  return socket
}
