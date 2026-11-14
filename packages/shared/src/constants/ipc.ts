/**
 * IPC 通道常量：主进程 <-> 渲染进程（preload 中通过 contextBridge 暴露）。
 */
export const IpcChannels = {
  /** 主进程 -> 渲染进程：监听到新的剪贴板内容 */
  CLIPBOARD_NEW: 'clipboard:new',
  /** 渲染进程 -> 主进程：将指定内容写回系统剪贴板 */
  CLIPBOARD_WRITE: 'clipboard:write',
  /** 渲染进程 -> 主进程：读取本地 SQLite 剪贴板历史 */
  GET_LOCAL_CLIPS: 'local-clips:get',
  /** 渲染进程 -> 主进程：删除本地剪贴板记录 */
  DELETE_LOCAL_CLIP: 'local-clips:delete',
  /** 渲染进程 -> 主进程：标记本地记录已同步至云端 */
  MARK_CLIP_SYNCED: 'local-clips:mark-synced',
  /** 渲染进程 -> 主进程：将云端 / 其他设备推送的记录写入本地 SQLite */
  UPSERT_REMOTE_CLIP: 'local-clips:upsert-remote',
  /** 渲染进程 -> 主进程：隐藏主窗口 */
  WINDOW_HIDE: 'window:hide'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
