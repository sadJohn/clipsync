import { DEFAULT_SETTINGS, type Settings } from '@clipsync/shared'
import { create } from 'zustand'

interface SettingsState {
  settings: Settings
  loading: boolean
  error: string | null
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      // 去掉 Electron IPC 包装的 "Error invoking remote method '...': Error:" 前缀
      return message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
    }
  }
  return '设置操作失败，请稍后重试'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const settings = await window.api.getSettings()
      set({ settings, loading: false })
    } catch (error) {
      console.warn('[settings] 读取失败', error)
      set({ loading: false, error: errorMessage(error) })
    }
  },

  update: async (patch) => {
    set({ error: null })
    try {
      const settings = await window.api.setSettings(patch)
      set({ settings })
    } catch (error) {
      console.warn('[settings] 保存失败', error)
      set({ error: errorMessage(error) })
    }
  }
}))
