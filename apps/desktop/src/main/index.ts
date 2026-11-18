import { join, normalize } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IpcChannels } from '@clipsync/shared'
import { app, net, protocol } from 'electron'
import { closeDb } from './db/client'
import { registerIpcHandlers } from './ipc'
import { ClipboardWatcher } from './services/clipboard-watcher'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './services/shortcut-manager'
import { openSettingsWindow } from './services/settings-window'
import { createTrayManager } from './services/tray-manager'
import {
  createMainWindow,
  getMainWindow,
  markQuitting,
  showWindow,
  toggleWindow,
  toggleWindowFromTray
} from './window'

app.setName('ClipSync')

// 生产环境使用自定义 app:// 协议加载渲染页，保证有稳定的 Origin 供云端 CORS 校验
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

function registerAppProtocol(): void {
  const rendererDir = join(__dirname, '../renderer')

  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    const relativePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
    const filePath = normalize(join(rendererDir, relativePath))

    if (!filePath.startsWith(rendererDir)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}

const watcher = new ClipboardWatcher()

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showWindow()
  })

  void app.whenReady().then(() => {
    registerAppProtocol()

    // 必须先隐藏 Dock 再建窗：createMainWindow 内的 setVisibleOnAllWorkspaces 依赖
    // 当前进程类型，顺序反了会让窗口只在创建时所在的 Space 显示
    if (process.platform === 'darwin') {
      app.dock?.hide()
    }

    createMainWindow()

    registerIpcHandlers({
      onClipboardWrite: (content) => watcher.markExternalWrite(content)
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
      onTrayClick: toggleWindowFromTray,
      onToggle: toggleWindow,
      onOpenSettings: () => {
        openSettingsWindow()
      },
      onQuit: () => {
        markQuitting()
        app.quit()
      }
    })

    registerGlobalShortcuts(toggleWindow)

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
