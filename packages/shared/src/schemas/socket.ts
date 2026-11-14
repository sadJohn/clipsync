import { z } from 'zod'
import { clipItemSchema } from './clip'

/** Socket.IO 连接握手时携带的认证信息 */
export const socketAuthSchema = z.object({
  token: z.string().min(1)
})

export const syncNewClipSchema = z.object({
  clip: clipItemSchema
})

export const syncDeleteClipSchema = z.object({
  id: z.string().uuid()
})

export const syncPinClipSchema = z.object({
  id: z.string().uuid(),
  isPinned: z.boolean(),
  updatedAt: z.string().datetime()
})

export type SocketAuth = z.output<typeof socketAuthSchema>
export type SyncNewClip = z.output<typeof syncNewClipSchema>
export type SyncDeleteClip = z.output<typeof syncDeleteClipSchema>
export type SyncPinClip = z.output<typeof syncPinClipSchema>
