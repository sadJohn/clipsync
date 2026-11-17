import { randomUUID } from 'node:crypto'
import type { LocalClipRecord } from '@clipsync/shared'
import { clipboard } from 'electron'
import { localClipService } from './local-clip-service'

const POLL_INTERVAL_MS = 500
const MAX_CONTENT_LENGTH = 100_000

type NewClipListener = (clip: LocalClipRecord) => void

/**
 * 轮询系统剪贴板，发现新的文本内容后先写入本地 SQLite，再通知订阅者
 * （主进程据此转发给渲染进程）。
 */
export class ClipboardWatcher {
  private timer: NodeJS.Timeout | null = null
  private lastText = ''
  private started = false
  private polling = false
  private readonly listeners = new Set<NewClipListener>()

  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    // 启动时以当前剪贴板内容为基线，避免把历史内容重复入库
    this.lastText = await clipboard.readText()
    if (!this.started) return
    this.timer = setInterval(() => {
      void this.poll()
    }, POLL_INTERVAL_MS)
  }

  stop(): void {
    this.started = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  onNewClip(listener: NewClipListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 主动写回剪贴板前调用，避免 watcher 把「自己写入的内容」当成新复制内容重复入库。
   */
  markExternalWrite(text: string): void {
    this.lastText = text
  }

  private async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true

    try {
      const text = await clipboard.readText()
      if (!text || text === this.lastText) return
      this.lastText = text

      if (text.trim().length === 0 || text.length > MAX_CONTENT_LENGTH) return

      // 相同内容重复复制时复用原记录并刷新使用时间，避免重复条目堆积
      const existing = localClipService.findByContent(text)
      if (existing) {
        localClipService.touch(existing.id)
        return
      }

      const now = new Date().toISOString()
      const record: LocalClipRecord = {
        id: randomUUID(),
        content: text,
        type: localClipService.detectType(text),
        deviceName: localClipService.getDeviceName(),
        isPinned: false,
        isSynced: false,
        createdAt: now,
        lastUsedAt: now
      }

      localClipService.insert(record)
      for (const listener of this.listeners) {
        listener(record)
      }
    } finally {
      this.polling = false
    }
  }
}
