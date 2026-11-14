import type { ClipItemDto, LocalClipRecord } from '@clipsync/shared'
import { useClipStore } from '@/store/clip-store'
import { clipsApi } from './api'

export function toClipDto(record: LocalClipRecord): ClipItemDto {
  return {
    id: record.id,
    content: record.content,
    type: record.type,
    deviceName: record.deviceName,
    isPinned: record.isPinned,
    createdAt: record.createdAt,
    updatedAt: record.createdAt
  }
}

/** 上传单条本地记录，成功后回写同步标记 */
export async function pushClip(record: LocalClipRecord): Promise<void> {
  await clipsApi.create(toClipDto(record))
  await window.api.markClipSynced(record.id)
  useClipStore.getState().markSynced(record.id)
}

/**
 * 登录后的全量同步：先上传本地未同步记录，再拉取云端历史写入本地 SQLite。
 */
export async function syncWithCloud(): Promise<void> {
  const localClips = await window.api.getLocalClips()

  for (const clip of localClips) {
    if (clip.isSynced) continue
    try {
      await pushClip(clip)
    } catch (error) {
      console.warn('[sync] 上传本地记录失败', clip.id, error)
    }
  }

  const remoteClips = await clipsApi.list()
  for (const item of remoteClips) {
    const record: LocalClipRecord = { ...item, isSynced: true }
    const saved = await window.api.upsertRemoteClip(record)
    useClipStore.getState().upsertClip(saved)
  }
}
