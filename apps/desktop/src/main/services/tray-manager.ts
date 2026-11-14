import { Menu, Tray, nativeImage } from 'electron'

interface TrayManagerOptions {
  iconPath: string
  onToggle: () => void
  onQuit: () => void
}

/**
 * 创建系统托盘：左键切换悬浮窗，右键弹出菜单。
 */
export function createTrayManager(options: TrayManagerOptions): Tray {
  const source = nativeImage.createFromPath(options.iconPath)
  const image = source.isEmpty()
    ? nativeImage.createEmpty()
    : source.resize({ width: 16, height: 16 })

  const tray = new Tray(image)
  tray.setToolTip('ClipSync - 跨端剪贴板')

  const menu = Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: options.onToggle },
    { type: 'separator' },
    { label: '退出 ClipSync', click: options.onQuit }
  ])

  tray.on('click', options.onToggle)
  tray.on('right-click', () => tray.popUpContextMenu(menu))

  return tray
}
