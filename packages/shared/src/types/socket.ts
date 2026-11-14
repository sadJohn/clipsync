import { SocketEvents } from '../constants/socket'
import type { ClipItemDto } from './clip'

export interface SyncNewClipPayload {
  clip: ClipItemDto
}

export interface SyncDeleteClipPayload {
  id: string
}

export interface SyncPinClipPayload {
  id: string
  isPinned: boolean
  /** ISO 8601 时间字符串 */
  updatedAt: string
}

/**
 * 事件名 -> 载荷类型的映射，供客户端与服务端做类型安全的事件收发。
 */
export interface SocketEventPayloads {
  [SocketEvents.SYNC_NEW_CLIP]: SyncNewClipPayload
  [SocketEvents.SYNC_DELETE_CLIP]: SyncDeleteClipPayload
  [SocketEvents.SYNC_PIN_CLIP]: SyncPinClipPayload
}
