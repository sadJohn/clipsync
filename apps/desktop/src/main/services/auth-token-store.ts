import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'

/**
 * 认证 Token 的加密存储。
 * 使用 Electron safeStorage（macOS Keychain / Windows DPAPI）加密后写入 userData 下的文件，
 * 明文只存在于主进程与渲染进程内存中，不落盘、不进 localStorage。
 */
const FILE_NAME = 'auth-token.bin'

let cached: string | null = null
let loaded = false

function filePath(): string {
  return join(app.getPath('userData'), FILE_NAME)
}

function warnUnavailable(): void {
  console.warn('[auth-token] 系统加密不可用，Token 仅保存在本次会话内存中')
}

async function persist(token: string): Promise<void> {
  const encrypted = await safeStorage.encryptStringAsync(token)
  await writeFile(filePath(), encrypted.toString('base64'), { mode: 0o600 })
}

export async function getToken(): Promise<string | null> {
  if (loaded) return cached
  loaded = true

  let encrypted: string
  try {
    encrypted = (await readFile(filePath(), 'utf8')).trim()
  } catch {
    // 文件不存在或不可读：视为未登录
    return null
  }

  if (!encrypted) return null
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    warnUnavailable()
    return null
  }

  try {
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(
      Buffer.from(encrypted, 'base64')
    )
    cached = result
    // 系统密钥轮换后重新加密，避免后续解密失败
    if (shouldReEncrypt) await persist(result)
  } catch {
    console.warn('[auth-token] Token 解密失败，已忽略本地文件')
    cached = null
  }
  return cached
}

export async function setToken(token: string): Promise<void> {
  cached = token
  loaded = true

  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    warnUnavailable()
    return
  }

  await persist(token)
}

export async function clearToken(): Promise<void> {
  cached = null
  loaded = true
  await rm(filePath(), { force: true })
}
