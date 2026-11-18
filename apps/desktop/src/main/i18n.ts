import { resolveLanguage, type Language, type ResolvedLanguage } from '@clipsync/shared'
import { app } from 'electron'

/** 主进程侧文案（托盘、窗口标题等），与渲染进程语言包保持同一套 key 语义 */
const messages = {
  'zh-CN': {
    trayTooltip: 'ClipSync - 跨端剪贴板',
    showHide: '显示 / 隐藏',
    settings: '设置…',
    quit: '退出 ClipSync',
    settingsWindowTitle: 'ClipSync 设置'
  },
  'en-US': {
    trayTooltip: 'ClipSync - Cross-device clipboard',
    showHide: 'Show / Hide',
    settings: 'Settings…',
    quit: 'Quit ClipSync',
    settingsWindowTitle: 'ClipSync Settings'
  }
} as const

export type MainMessages = (typeof messages)[ResolvedLanguage]

/** 主进程没有浏览器 locale，system 时用 Electron 的 app locale 解析 */
export function resolveAppLanguage(language: Language): ResolvedLanguage {
  return resolveLanguage(language, app.getLocale())
}

export function mainMessages(language: Language): MainMessages {
  return messages[resolveAppLanguage(language)]
}
