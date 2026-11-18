import type { Language } from '@clipsync/shared'
import { Menu, Tray, nativeImage } from 'electron'
import { mainMessages } from '../i18n'

interface TrayManagerOptions {
  iconPath: string
  language: Language
  /** 左键点击托盘：需要抵消「失焦先隐藏、点击又显示」的竞态 */
  onTrayClick: () => void
  /** 右键菜单里的显示 / 隐藏 */
  onToggle: () => void
  /** 右键菜单里的设置窗口 */
  onOpenSettings: () => void
  onQuit: () => void
}

export interface TrayController {
  /** 设置里的语言变化后同步托盘文案 */
  updateLanguage: (language: Language) => void
}

/**
 * 创建系统托盘：左键切换悬浮窗，右键弹出菜单。
 */
export function createTrayManager(options: TrayManagerOptions): TrayController {
  const source = nativeImage.createFromPath(options.iconPath)
  const image = source.isEmpty()
    ? nativeImage.createEmpty()
    : source.resize({ width: 16, height: 16 })

  const tray = new Tray(image)
  let messages = mainMessages(options.language)

  const buildMenu = (): Menu =>
    Menu.buildFromTemplate([
      { label: messages.showHide, click: options.onToggle },
      { label: messages.settings, click: options.onOpenSettings },
      { type: 'separator' },
      { label: messages.quit, click: options.onQuit }
    ])

  let menu = buildMenu()
  tray.setToolTip(messages.trayTooltip)

  tray.on('click', options.onTrayClick)
  tray.on('right-click', () => tray.popUpContextMenu(menu))

  return {
    updateLanguage(language) {
      messages = mainMessages(language)
      tray.setToolTip(messages.trayTooltip)
      menu = buildMenu()
    }
  }
}
