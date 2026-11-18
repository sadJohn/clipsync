import {
  IpcChannels,
  type ExpiredClipRef,
  type LocalClipRecord,
  type Settings,
  type UpdateStatus
} from '@clipsync/shared'
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

export interface DesktopApi {
  /** 订阅主进程监听到的新剪贴板内容，返回取消订阅函数 */
  onClipboardNew: (callback: (clip: LocalClipRecord) => void) => () => void
  /** 读取本地 SQLite 中的剪贴板历史 */
  getLocalClips: () => Promise<LocalClipRecord[]>
  /** 将内容写回系统剪贴板并隐藏窗口 */
  writeClipboard: (content: string) => Promise<void>
  /** 删除本地记录 */
  deleteLocalClip: (id: string) => Promise<void>
  /** 设置本地记录置顶状态，不存在时返回 null */
  setLocalClipPinned: (id: string, isPinned: boolean) => Promise<LocalClipRecord | null>
  /** 标记本地记录已同步至云端 */
  markClipSynced: (id: string) => Promise<void>
  /** 将云端 / 其他设备推送的记录写入本地 SQLite，返回落库后的记录 */
  upsertRemoteClip: (record: LocalClipRecord) => Promise<LocalClipRecord>
  /** 刷新记录的最近使用时间 */
  touchLocalClip: (id: string) => Promise<void>
  /** 列出超期未使用的本地记录 */
  listExpiredClips: () => Promise<ExpiredClipRef[]>
  /** 批量删除本地记录 */
  deleteLocalClips: (ids: string[]) => Promise<void>
  /** 隐藏悬浮窗 */
  hideWindow: () => Promise<void>
  /** 读取应用设置 */
  getSettings: () => Promise<Settings>
  /** 合并写入应用设置，返回最新设置 */
  setSettings: (patch: Partial<Settings>) => Promise<Settings>
  /** 打开设置窗口 */
  openSettings: () => Promise<void>
  /** 进入 / 退出快捷键录制；录制期间主进程会暂停全局快捷键 */
  setShortcutCapturing: (capturing: boolean) => Promise<void>
  /** 手动检查更新 */
  checkForUpdates: () => Promise<void>
  /** 读取当前更新状态 */
  getUpdateStatus: () => Promise<UpdateStatus>
  /** 订阅更新状态变化，返回取消订阅函数 */
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
  /** 读取主进程加密保存的认证 Token */
  getAuthToken: () => Promise<string | null>
  /** 交由主进程加密保存认证 Token */
  setAuthToken: (token: string) => Promise<void>
  /** 清除主进程保存的认证 Token */
  clearAuthToken: () => Promise<void>
}

const api: DesktopApi = {
  onClipboardNew: (callback) => {
    const listener = (_event: IpcRendererEvent, clip: LocalClipRecord): void => {
      callback(clip)
    }
    ipcRenderer.on(IpcChannels.CLIPBOARD_NEW, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannels.CLIPBOARD_NEW, listener)
    }
  },

  getLocalClips: () =>
    ipcRenderer.invoke(IpcChannels.GET_LOCAL_CLIPS) as Promise<LocalClipRecord[]>,

  writeClipboard: (content) =>
    ipcRenderer.invoke(IpcChannels.CLIPBOARD_WRITE, content) as Promise<void>,

  deleteLocalClip: (id) => ipcRenderer.invoke(IpcChannels.DELETE_LOCAL_CLIP, id) as Promise<void>,

  setLocalClipPinned: (id, isPinned) =>
    ipcRenderer.invoke(
      IpcChannels.SET_LOCAL_CLIP_PINNED,
      id,
      isPinned
    ) as Promise<LocalClipRecord | null>,

  markClipSynced: (id) => ipcRenderer.invoke(IpcChannels.MARK_CLIP_SYNCED, id) as Promise<void>,

  upsertRemoteClip: (record) =>
    ipcRenderer.invoke(IpcChannels.UPSERT_REMOTE_CLIP, record) as Promise<LocalClipRecord>,

  touchLocalClip: (id) => ipcRenderer.invoke(IpcChannels.TOUCH_LOCAL_CLIP, id) as Promise<void>,

  listExpiredClips: () =>
    ipcRenderer.invoke(IpcChannels.LIST_EXPIRED_CLIPS) as Promise<ExpiredClipRef[]>,

  deleteLocalClips: (ids) =>
    ipcRenderer.invoke(IpcChannels.DELETE_LOCAL_CLIPS, ids) as Promise<void>,

  hideWindow: () => ipcRenderer.invoke(IpcChannels.WINDOW_HIDE) as Promise<void>,

  getSettings: () => ipcRenderer.invoke(IpcChannels.SETTINGS_GET) as Promise<Settings>,

  setSettings: (patch) => ipcRenderer.invoke(IpcChannels.SETTINGS_SET, patch) as Promise<Settings>,

  openSettings: () => ipcRenderer.invoke(IpcChannels.SETTINGS_OPEN) as Promise<void>,

  setShortcutCapturing: (capturing) =>
    ipcRenderer.invoke(IpcChannels.SHORTCUT_CAPTURE, capturing) as Promise<void>,

  checkForUpdates: () => ipcRenderer.invoke(IpcChannels.UPDATE_CHECK) as Promise<void>,

  getUpdateStatus: () => ipcRenderer.invoke(IpcChannels.UPDATE_STATUS_GET) as Promise<UpdateStatus>,

  onUpdateStatus: (callback) => {
    const listener = (_event: IpcRendererEvent, status: UpdateStatus): void => {
      callback(status)
    }
    ipcRenderer.on(IpcChannels.UPDATE_STATUS, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannels.UPDATE_STATUS, listener)
    }
  },

  getAuthToken: () => ipcRenderer.invoke(IpcChannels.AUTH_TOKEN_GET) as Promise<string | null>,

  setAuthToken: (token) => ipcRenderer.invoke(IpcChannels.AUTH_TOKEN_SET, token) as Promise<void>,

  clearAuthToken: () => ipcRenderer.invoke(IpcChannels.AUTH_TOKEN_CLEAR) as Promise<void>
}

contextBridge.exposeInMainWorld('api', api)
