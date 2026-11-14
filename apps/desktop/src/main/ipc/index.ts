import { clipboard, ipcMain } from 'electron'
import { IpcChannels, localClipRecordSchema } from '@clipsync/shared'
import { localClipService } from '../services/local-clip-service'
import { hideWindow } from '../window'

interface IpcHandlerOptions {
  /** 写回剪贴板后通知 watcher，避免重复入库 */
  onClipboardWrite: (content: string) => void
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

  ipcMain.handle(IpcChannels.WINDOW_HIDE, () => {
    hideWindow()
  })
}
