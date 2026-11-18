import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IpcChannels, type UpdateStatus } from '@clipsync/shared'

/**
 * 自动更新封装。
 * 通过 GitHub Releases 的 latest*.yml 检查版本，发现新版本后自动下载，
 * 状态通过 UPDATE_STATUS 广播给所有窗口，设置页据此展示。
 */
let status: UpdateStatus | null = null
let initialized = false

function publish(next: Omit<UpdateStatus, 'currentVersion'>): void {
  status = { currentVersion: app.getVersion(), ...next }

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IpcChannels.UPDATE_STATUS, status)
    }
  }
}

export function getUpdateStatus(): UpdateStatus {
  return status ?? { state: 'idle', currentVersion: app.getVersion() }
}

export function initUpdater(): void {
  if (initialized) return
  initialized = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    publish({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    publish({ state: 'available', version: info.version })
    void autoUpdater.downloadUpdate().catch((error: Error) => {
      publish({ state: 'error', message: error.message })
    })
  })

  autoUpdater.on('update-not-available', () => {
    publish({ state: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    publish({
      state: 'downloading',
      version: status?.version,
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    publish({ state: 'downloaded', version: info.version, percent: 100 })
  })

  autoUpdater.on('error', (error) => {
    publish({ state: 'error', message: error.message })
  })
}

/** 手动 / 启动时检查更新；未打包的运行方式（开发态）直接给出提示 */
export function checkForUpdates(): void {
  if (!app.isPackaged) {
    publish({ state: 'unsupported', message: '开发模式不支持检查更新' })
    return
  }

  if (status?.state === 'checking' || status?.state === 'downloading') return

  void autoUpdater.checkForUpdates().catch((error: Error) => {
    publish({ state: 'error', message: error.message })
  })
}
