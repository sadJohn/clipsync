import { clipboard, ipcMain } from 'electron'
import { IpcChannels, localClipRecordSchema, type Settings } from '@clipsync/shared'
import * as authTokenStore from '../services/auth-token-store'
import { localClipService } from '../services/local-clip-service'
import * as settingsStore from '../services/settings-store'
import { openSettingsWindow } from '../services/settings-window'
import { beginShortcutCapture, endShortcutCapture } from '../services/shortcut-manager'
import { checkForUpdates, getUpdateStatus } from '../services/updater'
import { hideWindow } from '../window'

interface IpcHandlerOptions {
  /** 写回剪贴板后通知 watcher，避免重复入库 */
  onClipboardWrite: (content: string) => void
  /** 应用设置变更并返回最新设置；副作用失败时抛错，避免无效值落盘 */
  applySettings: (patch: Partial<Settings>) => Settings
}

let registered = false

export function registerIpcHandlers(options: IpcHandlerOptions): void {
  if (registered) return
  registered = true

  ipcMain.handle(IpcChannels.GET_LOCAL_CLIPS, () => localClipService.list())

  ipcMain.handle(IpcChannels.CLIPBOARD_WRITE, async (_event, content: unknown) => {
    if (typeof content !== 'string') {
      throw new Error('content 必须是字符串')
    }
    await clipboard.writeText(content)
    options.onClipboardWrite(content)
    hideWindow()
  })

  ipcMain.handle(IpcChannels.DELETE_LOCAL_CLIP, (_event, id: unknown) => {
    if (typeof id !== 'string') {
      throw new Error('id 必须是字符串')
    }
    localClipService.delete(id)
  })

  ipcMain.handle(IpcChannels.SET_LOCAL_CLIP_PINNED, (_event, id: unknown, isPinned: unknown) => {
    const parsedId = localClipRecordSchema.shape.id.safeParse(id)
    if (!parsedId.success) {
      throw new Error('id 必须是 UUID')
    }
    if (typeof isPinned !== 'boolean') {
      throw new Error('isPinned 必须是布尔值')
    }
    return localClipService.setPinned(parsedId.data, isPinned)
  })

  ipcMain.handle(IpcChannels.MARK_CLIP_SYNCED, (_event, id: unknown) => {
    if (typeof id !== 'string') {
      throw new Error('id 必须是字符串')
    }
    localClipService.markSynced(id)
  })

  ipcMain.handle(IpcChannels.UPSERT_REMOTE_CLIP, (_event, record: unknown) => {
    const parsed = localClipRecordSchema.safeParse(record)
    if (!parsed.success) {
      throw new Error('非法的剪贴板记录')
    }
    return localClipService.upsertRemote(parsed.data)
  })

  ipcMain.handle(IpcChannels.TOUCH_LOCAL_CLIP, (_event, id: unknown) => {
    if (typeof id !== 'string') {
      throw new Error('id 必须是字符串')
    }
    localClipService.touch(id)
  })

  ipcMain.handle(IpcChannels.LIST_EXPIRED_CLIPS, () => localClipService.listExpired())

  ipcMain.handle(IpcChannels.DELETE_LOCAL_CLIPS, (_event, ids: unknown) => {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new Error('ids 必须是字符串数组')
    }
    localClipService.deleteMany(ids)
  })

  ipcMain.handle(IpcChannels.WINDOW_HIDE, () => {
    hideWindow()
  })

  ipcMain.handle(IpcChannels.SETTINGS_GET, () => settingsStore.getSettings())

  ipcMain.handle(IpcChannels.SETTINGS_SET, (_event, patch: unknown) => {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('设置补丁必须是对象')
    }
    return options.applySettings(patch as Partial<Settings>)
  })

  ipcMain.handle(IpcChannels.SETTINGS_OPEN, () => {
    openSettingsWindow()
  })

  ipcMain.handle(IpcChannels.SHORTCUT_CAPTURE, (_event, capturing: unknown) => {
    if (typeof capturing !== 'boolean') {
      throw new Error('capturing 必须是布尔值')
    }
    if (capturing) {
      beginShortcutCapture()
    } else {
      endShortcutCapture()
    }
  })

  ipcMain.handle(IpcChannels.UPDATE_CHECK, () => {
    checkForUpdates()
  })

  ipcMain.handle(IpcChannels.UPDATE_STATUS_GET, () => getUpdateStatus())

  ipcMain.handle(IpcChannels.AUTH_TOKEN_GET, () => authTokenStore.getToken())

  ipcMain.handle(IpcChannels.AUTH_TOKEN_SET, (_event, token: unknown) => {
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('token 必须是非空字符串')
    }
    authTokenStore.setToken(token)
  })

  ipcMain.handle(IpcChannels.AUTH_TOKEN_CLEAR, () => {
    authTokenStore.clearToken()
  })
}
