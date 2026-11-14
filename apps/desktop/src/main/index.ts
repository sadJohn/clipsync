import { join } from 'node:path'
import { IpcChannels } from '@clipsync/shared'
import { app } from 'electron'
import { closeDb } from './db/client'
import { registerIpcHandlers } from './ipc'
import { ClipboardWatcher } from './services/clipboard-watcher'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './services/shortcut-manager'
import { createTrayManager } from './services/tray-manager'
import { createMainWindow, getMainWindow, markQuitting, showWindow, toggleWindow } from './window'

app.setName('ClipSync')

const watcher = new ClipboardWatcher()

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showWindow()
  })

  void app.whenReady().then(() => {
    createMainWindow()

    registerIpcHandlers({
      onClipboardWrite: (content) => watcher.markExternalWrite(content),
    })

    watcher.onNewClip((clip) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send(IpcChannels.CLIPBOARD_NEW, clip)
      }
    })
    void watcher.start()
    createTrayManager({
      iconPath: join(__dirname, '../../resources/icon.png'),
      onToggle: toggleWindow,
      onQuit: () => {
        markQuitting()
        app.quit()
      },
    })

    registerGlobalShortcuts(toggleWindow)

    // 常驻托盘 / 菜单栏，不占用 Dock
    if (process.platform === 'darwin') {
      app.dock?.hide()
    }

    app.on('activate', () => {
      showWindow()
    })
  })
}

app.on('before-quit', () => {
  markQuitting()
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
  watcher.stop()
  closeDb()
})

// 关闭所有窗口时保持后台运行（托盘常驻）
app.on('window-all-closed', () => {
  // no-op
})
