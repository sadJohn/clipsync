import { Menu, Tray, nativeImage } from 'electron'

interface TrayManagerOptions {
  iconPath: string
  /** 左键点击托盘：需要抵消「失焦先隐藏、点击又显示」的竞态 */
  onTrayClick: () => void
  /** 右键菜单里的显示 / 隐藏 */
  onToggle: () => void
  /** 右键菜单里的设置窗口 */
  onOpenSettings: () => void
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
    { label: '设置…', click: options.onOpenSettings },
    { type: 'separator' },
    { label: '退出 ClipSync', click: options.onQuit }
  ])

  tray.on('click', options.onTrayClick)
  tray.on('right-click', () => tray.popUpContextMenu(menu))

  return tray
}
