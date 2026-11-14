import type { ClipType } from '@clipsync/shared'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * 本地剪贴板历史表，对应 SQLite 中的 `local_clips`。
 * isPinned / isSynced 使用 integer 存储，drizzle 负责 boolean 转换。
 */
export const localClips = sqliteTable('local_clips', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type').$type<ClipType>().notNull(),
  deviceName: text('device_name').notNull(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export type LocalClipRow = typeof localClips.$inferSelect
export type LocalClipInsert = typeof localClips.$inferInsert
