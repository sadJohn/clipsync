import { toast } from 'sonner'

/** 同一类错误在该时间窗口内只提示一次，避免批量失败刷屏 */
const COOLDOWN_MS = 10_000

const lastShownAt = new Map<string, number>()

/**
 * 同步失败的用户提示。
 * 批量上传时可能连续失败多条，按文案去重并节流，详细错误仍由 console 记录。
 */
export function notifySyncError(message: string): void {
  const now = Date.now()

  for (const [key, time] of lastShownAt) {
    if (now - time >= COOLDOWN_MS) lastShownAt.delete(key)
  }

  const shownAt = lastShownAt.get(message)
  if (shownAt !== undefined) return

  lastShownAt.set(message, now)
  toast.error(message)
}
