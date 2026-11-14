/**
 * Socket.IO 同步事件常量：云端 Gateway 与桌面客户端共用。
 */
export const SocketEvents = {
  /** 有新剪贴板条目需要同步给同账号其他设备 */
  SYNC_NEW_CLIP: 'sync:new-clip',
  /** 有剪贴板条目被删除 */
  SYNC_DELETE_CLIP: 'sync:delete-clip',
  /** 剪贴板条目的置顶状态发生变化 */
  SYNC_PIN_CLIP: 'sync:pin-clip'
} as const

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents]
