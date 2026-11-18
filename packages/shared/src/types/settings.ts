import type { Language } from '../i18n/language'

/**
 * 应用设置模型。
 * 由主进程 SettingsStore 持久化到 userData/settings.json，渲染进程通过 IPC 读写。
 */
export const THEMES = ['light', 'dark', 'system'] as const

export type Theme = (typeof THEMES)[number]

export interface Settings {
  /** 开机自启 */
  autoLaunch: boolean
  /** 呼出 / 隐藏悬浮窗的全局快捷键（electron accelerator） */
  toggleAccelerator: string
  /** 失焦后隐藏窗口的延迟毫秒数，0 表示立即隐藏 */
  hideDelayMs: number
  /** 自动下载并安装更新 */
  autoUpdate: boolean
  /** 本地最多保留的剪贴板记录数 */
  maxClips: number
  /** 超期未使用记录的保留天数，0 表示永不清理 */
  expireDays: number
  /** 新复制的剪贴板内容自动上传到云端 */
  autoSyncNewClip: boolean
  /** 界面主题 */
  theme: Theme
  /** 界面语言，system 表示跟随系统 */
  language: Language
}
