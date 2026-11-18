/**
 * 应用设置模型。
 * 由主进程 SettingsStore 持久化到 userData/settings.json，渲染进程通过 IPC 读写。
 */
export interface Settings {
  /** 开机自启 */
  autoLaunch: boolean
  /** 呼出 / 隐藏悬浮窗的全局快捷键（electron accelerator） */
  toggleAccelerator: string
  /** 失焦后隐藏窗口的延迟毫秒数，0 表示立即隐藏 */
  hideDelayMs: number
  /** 自动下载并安装更新 */
  autoUpdate: boolean
}
