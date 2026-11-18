import type { Settings } from '../types/settings'

/** 设置默认值：文件缺失或字段非法时回落到这里 */
export const DEFAULT_SETTINGS: Readonly<Settings> = {
  autoLaunch: false,
  toggleAccelerator: 'Alt+V',
  hideDelayMs: 0,
  autoUpdate: true,
  maxClips: 500,
  expireDays: 30,
  autoSyncNewClip: true,
  theme: 'system'
}
