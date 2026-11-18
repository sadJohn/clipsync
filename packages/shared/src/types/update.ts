/**
 * 自动更新的状态模型，主进程通过 IPC 推送给渲染进程展示。
 */
export const UPDATE_STATES = [
  'idle',
  'checking',
  'available',
  'downloading',
  'downloaded',
  'up-to-date',
  'error',
  'unsupported'
] as const

export type UpdateState = (typeof UPDATE_STATES)[number]

export interface UpdateStatus {
  state: UpdateState
  /** 当前应用版本 */
  currentVersion: string
  /** 新版本号（available / downloading / downloaded 时有值） */
  version?: string
  /** 下载进度 0-100 */
  percent?: number
  /** 错误或说明信息 */
  message?: string
}
