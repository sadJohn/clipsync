import { hostname } from 'node:os'
import type { ClipType, LocalClipRecord } from '@clipsync/shared'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { localClips, type LocalClipRow } from '../db/schema'

const DEFAULT_LIMIT = 200

function toRecord(row: LocalClipRow): LocalClipRecord {
  return {
    id: row.id,
    content: row.content,
    type: row.type,
    deviceName: row.deviceName,
    isPinned: row.isPinned,
    isSynced: row.isSynced,
    createdAt: row.createdAt,
  }
}

/**
 * 本地剪贴板历史的增删改查服务，仅在 Electron 主进程中使用。
 */
export const localClipService = {
  list(limit = DEFAULT_LIMIT): LocalClipRecord[] {
    return getDb()
      .select()
      .from(localClips)
      .orderBy(desc(localClips.createdAt))
      .limit(limit)
      .all()
      .map(toRecord)
  },

  getById(id: string): LocalClipRecord | null {
    const row = getDb().select().from(localClips).where(eq(localClips.id, id)).get()
    return row ? toRecord(row) : null
  },

  insert(record: LocalClipRecord): LocalClipRecord {
    getDb().insert(localClips).values(record).run()
    return record
  },

  /**
   * 写入来自云端 / 其他设备的记录：已存在则更新并标记为已同步，否则插入。
   */
  upsertRemote(record: LocalClipRecord): LocalClipRecord {
    const db = getDb()
    const syncedRecord: LocalClipRecord = { ...record, isSynced: true }
    const existing = db.select().from(localClips).where(eq(localClips.id, record.id)).get()

    if (existing) {
      db.update(localClips)
        .set({
          content: syncedRecord.content,
          type: syncedRecord.type,
          deviceName: syncedRecord.deviceName,
          isPinned: syncedRecord.isPinned,
          isSynced: true,
        })
        .where(eq(localClips.id, record.id))
        .run()
    } else {
      db.insert(localClips).values(syncedRecord).run()
    }

    return this.getById(record.id) ?? syncedRecord
  },

  delete(id: string): void {
    getDb().delete(localClips).where(eq(localClips.id, id)).run()
  },

  markSynced(id: string): void {
    getDb().update(localClips).set({ isSynced: true }).where(eq(localClips.id, id)).run()
  },

  /** 当前设备名称，写入记录时标记来源设备 */
  getDeviceName(): string {
    return hostname()
  },

  /** 简单的内容类型推断，用于 UI 分类展示 */
  detectType(content: string): ClipType {
    const trimmed = content.trim()
    if (/^(https?:\/\/|www\.)\S+$/i.test(trimmed)) {
      return 'LINK'
    }
    if (trimmed.includes('\n') || /(?:=>|function\s|const\s|let\s|class\s|import\s|<\/?[a-z][^>]*>)/.test(trimmed)) {
      return 'CODE'
    }
    return 'TEXT'
  },
}
