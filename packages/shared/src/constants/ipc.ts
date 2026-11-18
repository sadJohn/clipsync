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
  /** 渲染进程 -> 主进程：设置本地记录置顶状态 */
  SET_LOCAL_CLIP_PINNED: 'local-clips:set-pinned',
  /** 渲染进程 -> 主进程：标记本地记录已同步至云端 */
  MARK_CLIP_SYNCED: 'local-clips:mark-synced',
  /** 渲染进程 -> 主进程：将云端 / 其他设备推送的记录写入本地 SQLite */
  UPSERT_REMOTE_CLIP: 'local-clips:upsert-remote',
  /** 渲染进程 -> 主进程：刷新记录的最近使用时间 */
  TOUCH_LOCAL_CLIP: 'local-clips:touch',
  /** 渲染进程 -> 主进程：列出超期未使用的记录（自动清理用） */
  LIST_EXPIRED_CLIPS: 'local-clips:list-expired',
  /** 渲染进程 -> 主进程：批量删除本地记录 */
  DELETE_LOCAL_CLIPS: 'local-clips:delete-many',
  /** 渲染进程 -> 主进程：隐藏主窗口 */
  WINDOW_HIDE: 'window:hide',
  /** 渲染进程 -> 主进程：读取应用设置 */
  SETTINGS_GET: 'settings:get',
  /** 渲染进程 -> 主进程：合并写入应用设置，返回最新设置 */
  SETTINGS_SET: 'settings:set',
  /** 渲染进程 -> 主进程：打开设置窗口 */
  SETTINGS_OPEN: 'settings:open',
  /** 渲染进程 -> 主进程：进入 / 退出快捷键录制（录制期间暂停全局快捷键） */
  SHORTCUT_CAPTURE: 'shortcut:capture',
  /** 渲染进程 -> 主进程：手动检查更新 */
  UPDATE_CHECK: 'update:check',
  /** 渲染进程 -> 主进程：读取当前更新状态 */
  UPDATE_STATUS_GET: 'update:get-status',
  /** 主进程 -> 渲染进程：更新状态变化 */
  UPDATE_STATUS: 'update:status',
  /** 渲染进程 -> 主进程：读取加密保存的认证 Token */
  AUTH_TOKEN_GET: 'auth-token:get',
  /** 渲染进程 -> 主进程：加密保存认证 Token */
  AUTH_TOKEN_SET: 'auth-token:set',
  /** 渲染进程 -> 主进程：清除已保存的认证 Token */
  AUTH_TOKEN_CLEAR: 'auth-token:clear',
  /** 渲染进程 -> 主进程：转发开发态日志（仅主进程终端输出） */
  RENDERER_LOG: 'renderer:log'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
