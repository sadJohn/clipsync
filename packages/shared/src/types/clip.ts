/**
 * 剪贴板条目类型与数据模型。
 * 这里的类型同时被 Electron 主进程、渲染进程与 NestJS 服务端复用。
 */

export const CLIP_TYPES = ['TEXT', 'CODE', 'IMAGE', 'LINK'] as const

export type ClipType = (typeof CLIP_TYPES)[number]

/**
 * 单个剪贴板条目在客户端与服务端之间的传输模型。
 */
export interface ClipItemDto {
  /** UUID，由客户端本地生成，用于离线去重与云端幂等同步 */
  id: string
  content: string
  type: ClipType
  deviceName: string
  isPinned: boolean
  /** ISO 8601 时间字符串 */
  createdAt: string
  /** ISO 8601 时间字符串 */
  updatedAt: string
}

/**
 * 本地 SQLite (`local_clips` 表) 中的记录形态。
 */
export interface LocalClipRecord {
  id: string
  content: string
  type: ClipType
  deviceName: string
  isPinned: boolean
  /** 是否已成功同步至云端 PostgreSQL */
  isSynced: boolean
  /** ISO 8601 时间字符串 */
  createdAt: string
}

export const SYNC_STATUSES = ['pending', 'syncing', 'synced', 'failed'] as const

/**
 * 渲染进程中展示的云端同步状态。
 */
export type SyncStatus = (typeof SYNC_STATUSES)[number]

/**
 * 连接云端实时通道时需要携带的凭证。
 */
export interface SocketAuthPayload {
  token: string
}
