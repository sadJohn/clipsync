import { join } from 'node:path'
import { BrowserWindow, screen, shell } from 'electron'

const WINDOW_WIDTH = 420
const WINDOW_HEIGHT = 560

let mainWindow: BrowserWindow | null = null
let quitting = false
/** 最近一次因失焦隐藏的时间戳，用于抵消托盘点击时的「失焦先隐藏、点击又显示」竞态 */
let lastHiddenAt = 0

/**
 * 创建无边框悬浮窗（常驻置顶、不占任务栏），首次调用后复用同一实例。
 */
export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0f1115',
    resizable: false,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // 失焦自动收起（开发者工具打开时除外，方便调试）
  win.on('blur', () => {
    if (!win.isDestroyed() && !win.webContents.isDevToolsOpened()) {
      hideWindow()
    }
  })

  // 关闭按钮只隐藏，常驻托盘
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  loadRenderer(win)

  mainWindow = win
  return win
}

/** 加载渲染页；hash 用于在同一套产物里区分主窗口与设置窗口 */
export function loadRenderer(win: BrowserWindow, hash = ''): void {
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void win.loadURL(`${rendererUrl}${hash}`)
  } else {
    void win.loadURL(`app://clipsync/index.html${hash}`)
  }
}

/** 将窗口放在当前鼠标所在屏幕的中上部 */
function positionWindow(win: BrowserWindow): void {
  const cursor = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursor)
  const { width, height } = win.getBounds()

  win.setPosition(
    Math.round(workArea.x + (workArea.width - width) / 2),
    Math.round(workArea.y + Math.max(24, (workArea.height - height) / 3))
  )
}

export function showWindow(): void {
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createMainWindow()
  positionWindow(win)
  win.show()
  win.focus()
}

export function hideWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    return
  }
  lastHiddenAt = Date.now()
  mainWindow.hide()
}

export function toggleWindow(): void {
  if (mainWindow && mainWindow.isVisible()) {
    hideWindow()
  } else {
    showWindow()
  }
}

/** 托盘左键专用：点击会让窗口先失焦隐藏，紧接着的 click 需要被忽略 */
export function toggleWindowFromTray(): void {
  if (mainWindow && mainWindow.isVisible()) {
    hideWindow()
    return
  }
  if (Date.now() - lastHiddenAt < 300) {
    return
  }
  showWindow()
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function markQuitting(): void {
  quitting = true
}
