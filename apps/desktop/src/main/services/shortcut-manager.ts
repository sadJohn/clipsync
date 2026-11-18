import { globalShortcut } from 'electron'

let toggleHandler: (() => void) | null = null
let currentAccelerator: string | null = null
/** 录制快捷键期间挂起全局快捷键，避免按下的组合键直接触发窗口显示 / 隐藏 */
let capturing = false

function register(accelerator: string): boolean {
  if (!toggleHandler) return false

  const registered = globalShortcut.register(accelerator, toggleHandler)
  if (registered) currentAccelerator = accelerator
  return registered
}

/** 按设置里的快捷键注册呼出 / 隐藏悬浮窗，返回是否注册成功 */
export function registerGlobalShortcuts(toggleWindow: () => void, accelerator: string): boolean {
  toggleHandler = toggleWindow
  capturing = false
  globalShortcut.unregisterAll()
  currentAccelerator = null
  return register(accelerator)
}

export function beginShortcutCapture(): void {
  capturing = true
  globalShortcut.unregisterAll()
}

/** 结束录制：恢复当前已保存的快捷键 */
export function endShortcutCapture(): void {
  capturing = false
  if (!currentAccelerator || globalShortcut.isRegistered(currentAccelerator)) return
  register(currentAccelerator)
}

/**
 * 修改全局快捷键：先注销旧快捷键再注册新的。
 * 注册失败（格式非法或被占用）时恢复旧快捷键并抛错，由调用方中止设置落盘。
 */
export function setToggleShortcut(accelerator: string): void {
  const previous = currentAccelerator
  globalShortcut.unregisterAll()
  currentAccelerator = null

  if (register(accelerator)) return

  if (previous) {
    if (capturing) {
      currentAccelerator = previous
    } else {
      register(previous)
    }
  }
  throw new Error(`快捷键 ${accelerator} 无效或已被其他应用占用`)
}

export function unregisterGlobalShortcuts(): void {
  capturing = false
  globalShortcut.unregisterAll()
  currentAccelerator = null
}
