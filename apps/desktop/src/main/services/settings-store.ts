import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, type Settings } from '@clipsync/shared'
import { app } from 'electron'

/**
 * 应用设置存储。
 * 读写 userData/settings.json，缺失或类型不符的字段回落到默认值。
 */
let cached: Settings | null = null

function filePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/** 以默认值为底，只接受与默认值同类型的字段 */
function mergeSettings(raw: unknown): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return merged
  }

  const source = raw as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = source[key]
    if (typeof value === typeof DEFAULT_SETTINGS[key]) {
      Object.assign(merged, { [key]: value })
    }
  }
  return merged
}

export function getSettings(): Settings {
  if (cached) return { ...cached }

  try {
    cached = mergeSettings(JSON.parse(readFileSync(filePath(), 'utf8')))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      console.warn('[settings] 读取失败，使用默认值', error)
    }
    cached = { ...DEFAULT_SETTINGS }
  }

  return { ...cached }
}

/** 合并写入设置并返回写入后的完整设置 */
export function setSettings(patch: Partial<Settings>): Settings {
  const next = mergeSettings({ ...getSettings(), ...patch })

  writeFileSync(filePath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  cached = next

  return { ...next }
}
