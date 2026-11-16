import { IpcChannels, type LocalClipRecord } from '@clipsync/shared'
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
  /** 标记本地记录已同步至云端 */
  markClipSynced: (id: string) => Promise<void>
  /** 将云端 / 其他设备推送的记录写入本地 SQLite，返回落库后的记录 */
  upsertRemoteClip: (record: LocalClipRecord) => Promise<LocalClipRecord>
  /** 隐藏悬浮窗 */
  hideWindow: () => Promise<void>
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

  markClipSynced: (id) => ipcRenderer.invoke(IpcChannels.MARK_CLIP_SYNCED, id) as Promise<void>,

  upsertRemoteClip: (record) =>
    ipcRenderer.invoke(IpcChannels.UPSERT_REMOTE_CLIP, record) as Promise<LocalClipRecord>,

  hideWindow: () => ipcRenderer.invoke(IpcChannels.WINDOW_HIDE) as Promise<void>,

  getAuthToken: () => ipcRenderer.invoke(IpcChannels.AUTH_TOKEN_GET) as Promise<string | null>,

  setAuthToken: (token) => ipcRenderer.invoke(IpcChannels.AUTH_TOKEN_SET, token) as Promise<void>,

  clearAuthToken: () => ipcRenderer.invoke(IpcChannels.AUTH_TOKEN_CLEAR) as Promise<void>
}

contextBridge.exposeInMainWorld('api', api)
