import { join } from 'node:path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

type AppDatabase = BetterSQLite3Database<typeof schema>

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS local_clips (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  device_name TEXT NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_clips_created_at ON local_clips (created_at);
`

let sqlite: Database.Database | null = null
let instance: AppDatabase | null = null

/**
 * 旧版本数据库没有 last_used_at 列：补列后用 created_at 回填，
 * 使存量记录在首次清理时按原始创建时间计算保留期。
 */
function migrate(db: Database.Database): void {
  const columns = db.pragma('table_info(local_clips)') as { name: string }[]
  if (!columns.some((column) => column.name === 'last_used_at')) {
    db.exec('ALTER TABLE local_clips ADD COLUMN last_used_at TEXT')
    db.exec('UPDATE local_clips SET last_used_at = created_at WHERE last_used_at IS NULL')
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_local_clips_last_used_at ON local_clips (last_used_at)')
}

/**
 * 懒加载本地数据库，首次调用时创建文件与表结构。
 * 数据库文件位于 app.getPath('userData')/clipsync-local.db。
 */
export function getDb(): AppDatabase {
  if (!instance) {
    const file = join(app.getPath('userData'), 'clipsync-local.db')
    sqlite = new Database(file)
    sqlite.pragma('journal_mode = WAL')
    sqlite.exec(CREATE_TABLES_SQL)
    migrate(sqlite)
    instance = drizzle(sqlite, { schema })
  }
  return instance
}

export function closeDb(): void {
  if (sqlite?.open) {
    sqlite.close()
  }
  sqlite = null
  instance = null
}
