import { globalShortcut } from 'electron'

/** Alt+V（macOS 上即 Option+V）呼出/隐藏悬浮窗 */
export const TOGGLE_WINDOW_SHORTCUT = 'Alt+V'

export function registerGlobalShortcuts(toggleWindow: () => void): boolean {
  const registered = globalShortcut.register(TOGGLE_WINDOW_SHORTCUT, toggleWindow)
  if (!registered) {
    console.warn(`[shortcut] 注册全局快捷键 ${TOGGLE_WINDOW_SHORTCUT} 失败，可能已被其他应用占用`)
  }
  return registered
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}
