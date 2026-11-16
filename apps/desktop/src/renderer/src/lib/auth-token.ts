/**
 * 认证 Token 的内存缓存 + 主进程加密持久化。
 * 渲染进程不再把 Token 明文写入 localStorage：读写统一走 IPC，
 * 由主进程用 safeStorage 加密后落盘（见 main/services/auth-token-store.ts）。
 */
const LEGACY_STORAGE_KEY = 'clipsync:auth-token'

let cached: string | null = null

/**
 * 启动时调用一次：把 Token 从主进程读入内存。
 * 顺带把旧版本写在 localStorage 的明文 Token 迁移到加密存储并删除残留。
 */
export async function hydrateAuthToken(): Promise<void> {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacy) {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    cached = legacy
    await window.api.setAuthToken(legacy)
    return
  }

  cached = await window.api.getAuthToken()
}

export function getAuthToken(): string | null {
  return cached
}

export async function setAuthToken(token: string): Promise<void> {
  cached = token
  await window.api.setAuthToken(token)
}

export async function clearAuthToken(): Promise<void> {
  cached = null
  await window.api.clearAuthToken()
}
