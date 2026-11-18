import { join, normalize } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_SETTINGS, IpcChannels, type Settings } from '@clipsync/shared'
import { app, net, protocol } from 'electron'
import { closeDb } from './db/client'
import { registerIpcHandlers } from './ipc'
import { ClipboardWatcher } from './services/clipboard-watcher'
import { getSettings, setSettings } from './services/settings-store'
import {
  registerGlobalShortcuts,
  setToggleShortcut,
  unregisterGlobalShortcuts
} from './services/shortcut-manager'
import { openSettingsWindow, updateSettingsWindowTitle } from './services/settings-window'
import { createTrayManager, type TrayController } from './services/tray-manager'
import { checkForUpdates, initUpdater } from './services/updater'
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

/**
 * 生产页面的内容安全策略。
 * 开发态页面由 Vite dev server 提供，不经过 app:// 协议，因此不会影响 HMR。
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://localhost:*",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join('; ')

function registerAppProtocol(): void {
  const rendererDir = join(__dirname, '../renderer')

  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url)
    const relativePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
    const filePath = normalize(join(rendererDir, relativePath))

    if (!filePath.startsWith(rendererDir)) {
      return new Response('Forbidden', { status: 403 })
    }

    const response = await net.fetch(pathToFileURL(filePath).toString())
    if (!filePath.endsWith('.html')) {
      return response
    }

    const headers = new Headers(response.headers)
    headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  })
}

const watcher = new ClipboardWatcher()

/** 托盘在 app ready 后创建，设置变更时需要据此同步菜单语言 */
let trayController: TrayController | null = null

/** 开发态与 Linux 不注册登录项，避免把 Electron 可执行文件加入开机启动 */
function applyAutoLaunch(enabled: boolean): void {
  if (!app.isPackaged || process.platform === 'linux') return
  app.setLoginItemSettings({ openAtLogin: enabled })
}

/** 应用设置变更；快捷键注册失败会抛错，保证无效值不会落盘 */
function applySettings(patch: Partial<Settings>): Settings {
  const current = getSettings()

  if (
    patch.toggleAccelerator !== undefined &&
    patch.toggleAccelerator !== current.toggleAccelerator
  ) {
    setToggleShortcut(patch.toggleAccelerator)
  }

  const settings = setSettings(patch)

  if (patch.language !== undefined) {
    trayController?.updateLanguage(settings.language)
    updateSettingsWindowTitle(settings.language)
  }

  if (patch.autoLaunch !== undefined) {
    applyAutoLaunch(settings.autoLaunch)
  }

  if (patch.autoUpdate === true) {
    checkForUpdates()
  }

  return settings
}

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
      onClipboardWrite: (content) => watcher.markExternalWrite(content),
      applySettings
    })

    watcher.onNewClip((clip) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send(IpcChannels.CLIPBOARD_NEW, clip)
      }
    })
    void watcher.start()
    trayController = createTrayManager({
      iconPath: join(__dirname, '../../resources/icon.png'),
      language: getSettings().language,
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

    const initialSettings = getSettings()
    applyAutoLaunch(initialSettings.autoLaunch)
    initUpdater()
    if (initialSettings.autoUpdate && app.isPackaged) {
      checkForUpdates()
    }

    if (!registerGlobalShortcuts(toggleWindow, initialSettings.toggleAccelerator)) {
      console.warn(
        `[shortcut] ${initialSettings.toggleAccelerator} 注册失败，回退 ${DEFAULT_SETTINGS.toggleAccelerator}`
      )
      registerGlobalShortcuts(toggleWindow, DEFAULT_SETTINGS.toggleAccelerator)
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
