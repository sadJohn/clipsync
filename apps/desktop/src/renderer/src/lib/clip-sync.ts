import type { ClipItemDto, LocalClipRecord } from '@clipsync/shared'
import i18n from '@/i18n'
import { enqueueClipTask, useClipStore } from '@/store/clip-store'
import { ApiError, clipsApi } from './api'
import { getAuthToken } from './auth-token'
import { notifySyncError } from './sync-notice'

export function toClipDto(record: LocalClipRecord): ClipItemDto {
  return {
    id: record.id,
    content: record.content,
    type: record.type,
    deviceName: record.deviceName,
    isPinned: record.isPinned,
    createdAt: record.createdAt,
    updatedAt: record.createdAt,
    lastUsedAt: record.lastUsedAt
  }
}

/** 上传单条本地记录，成功后回写同步标记；与同条目的置顶操作串行执行 */
export function pushClip(record: LocalClipRecord): Promise<void> {
  return enqueueClipTask(record.id, async () => {
    const current = useClipStore.getState().clips.find((clip) => clip.id === record.id) ?? record
    await clipsApi.create(toClipDto(current))
    await window.api.markClipSynced(record.id)
    useClipStore.getState().markSynced(record.id)
  })
}

/** 上传本地所有未同步记录；单条失败不影响其它记录 */
export async function pushPendingClips(): Promise<void> {
  const localClips = await window.api.getLocalClips()
  let failed = 0

  for (const clip of localClips) {
    if (clip.isSynced) continue
    try {
      await pushClip(clip)
    } catch (error) {
      failed += 1
      console.warn('[sync] 上传本地记录失败', clip.id, error)
    }
  }

  if (failed > 0) {
    notifySyncError(i18n.t('errors.syncFailedCount', { count: failed }))
  }
}

/**
 * 登录后的全量同步：先上传本地未同步记录，再拉取云端历史写入本地 SQLite。
 */
export async function syncWithCloud(): Promise<void> {
  await pushPendingClips()

  const remoteClips = await clipsApi.list()
  for (const item of remoteClips) {
    const record: LocalClipRecord = { ...item, isSynced: true }
    const saved = await window.api.upsertRemoteClip(record)
    useClipStore.getState().upsertClip(saved)
  }
}

/**
 * 自动清理超过保留期未使用的记录。
 * 已同步的先删云端，删除失败则保留本地等待下次重试；未登录时只清理本地缓存。
 */
export async function purgeExpiredClips(): Promise<void> {
  const expired = await window.api.listExpiredClips()
  if (expired.length === 0) return

  const canDeleteRemote = getAuthToken() !== null
  const deletable: string[] = []

  for (const clip of expired) {
    if (clip.isSynced && canDeleteRemote) {
      try {
        await clipsApi.remove(clip.id)
      } catch (error) {
        // 云端已不存在视为删除成功，其余错误保留本地记录稍后重试
        if (!(error instanceof ApiError && error.status === 404)) {
          console.warn('[cleanup] 云端删除失败，保留本地待重试', clip.id, error)
          continue
        }
      }
    }
    deletable.push(clip.id)
  }

  if (deletable.length === 0) return

  await window.api.deleteLocalClips(deletable)
  for (const id of deletable) {
    useClipStore.getState().removeLocal(id)
  }
}
