import { hostname } from 'node:os'
import type { ClipType, ExpiredClipRef, LocalClipRecord } from '@clipsync/shared'
import { and, desc, eq, inArray, lt } from 'drizzle-orm'
import { getDb } from '../db/client'
import { localClips, type LocalClipRow } from '../db/schema'

const DEFAULT_LIMIT = 500
/** 超过该时长未被使用的记录会被自动清理 */
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000

function toRecord(row: LocalClipRow): LocalClipRecord {
  return {
    id: row.id,
    content: row.content,
    type: row.type,
    deviceName: row.deviceName,
    isPinned: row.isPinned,
    isSynced: row.isSynced,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt
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
      .orderBy(desc(localClips.isPinned), desc(localClips.createdAt))
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

  /** 按内容查找已有记录，用于相同内容重复复制时去重 */
  findByContent(content: string): LocalClipRecord | null {
    const row = getDb().select().from(localClips).where(eq(localClips.content, content)).get()
    return row ? toRecord(row) : null
  },

  /**
   * 写入来自云端 / 其他设备的记录：已存在则更新并标记为已同步，否则插入。
   * last_used_at 取本地与云端较新的值，保证任一设备使用过都会延长保留期。
   */
  upsertRemote(record: LocalClipRecord): LocalClipRecord {
    const db = getDb()
    const syncedRecord: LocalClipRecord = { ...record, isSynced: true }
    const existing = db.select().from(localClips).where(eq(localClips.id, record.id)).get()
    const lastUsedAt =
      existing && existing.lastUsedAt > record.lastUsedAt ? existing.lastUsedAt : record.lastUsedAt

    if (existing) {
      db.update(localClips)
        .set({
          content: syncedRecord.content,
          type: syncedRecord.type,
          deviceName: syncedRecord.deviceName,
          isPinned: syncedRecord.isPinned,
          isSynced: true,
          lastUsedAt
        })
        .where(eq(localClips.id, record.id))
        .run()
    } else {
      db.insert(localClips)
        .values({ ...syncedRecord, lastUsedAt })
        .run()
    }

    return this.getById(record.id) ?? syncedRecord
  },

  /** 更新置顶状态，返回更新后的记录 */
  setPinned(id: string, isPinned: boolean): LocalClipRecord | null {
    getDb().update(localClips).set({ isPinned }).where(eq(localClips.id, id)).run()
    return this.getById(id)
  },

  /** 刷新最近使用时间（写回剪贴板时调用） */
  touch(id: string): void {
    getDb()
      .update(localClips)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(localClips.id, id))
      .run()
  },

  /** 列出超过保留期未使用的非置顶记录 */
  listExpired(retentionMs = RETENTION_MS): ExpiredClipRef[] {
    const cutoff = new Date(Date.now() - retentionMs).toISOString()
    return getDb()
      .select({ id: localClips.id, isSynced: localClips.isSynced })
      .from(localClips)
      .where(and(eq(localClips.isPinned, false), lt(localClips.lastUsedAt, cutoff)))
      .all()
  },

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return
    getDb().delete(localClips).where(inArray(localClips.id, ids)).run()
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
    if (
      trimmed.includes('\n') ||
      /(?:=>|function\s|const\s|let\s|class\s|import\s|<\/?[a-z][^>]*>)/.test(trimmed)
    ) {
      return 'CODE'
    }
    return 'TEXT'
  }
}
