import { join } from 'node:path'
import type { Language } from '@clipsync/shared'
import { app, BrowserWindow, shell } from 'electron'
import { mainMessages } from '../i18n'
import { loadRenderer } from '../window'
import { getSettings } from './settings-store'

const WINDOW_WIDTH = 560
const WINDOW_HEIGHT = 640

let settingsWindow: BrowserWindow | null = null

/**
 * 设置窗口：普通有边框窗口，单例复用。
 * 与悬浮窗不同，失焦不隐藏，并让应用重新出现在 Dock 中便于切回。
 */
export function openSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    title: mainMessages(getSettings().language).settingsWindowTitle,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  win.on('closed', () => {
    settingsWindow = null
    // 恢复托盘常驻形态
    if (process.platform === 'darwin') {
      app.dock?.hide()
    }
  })

  // 设置窗口需要 Dock 入口，否则 macOS 上隐藏 Dock 后无法切回
  if (process.platform === 'darwin') {
    void app.dock?.show()
  }

  loadRenderer(win, '#/settings')
  settingsWindow = win
  return win
}

/** 语言变化后同步窗口标题 */
export function updateSettingsWindowTitle(language: Language): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.setTitle(mainMessages(language).settingsWindowTitle)
  }
}
