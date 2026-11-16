import { env } from '../config/env.js'

const DEFAULT_TRUSTED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'app://clipsync']

function parseOrigins(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

/**
 * Better Auth 的 trustedOrigins 与 Socket.IO / HTTP 的 CORS 共用同一份白名单：
 * 桌面端开发期为 electron-vite 的 5173 端口，打包后为 app:// 协议。
 */
export const trustedOrigins = Array.from(
  new Set([...DEFAULT_TRUSTED_ORIGINS, ...parseOrigins(env.TRUSTED_ORIGINS)])
)
