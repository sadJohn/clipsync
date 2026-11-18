import { DEFAULT_SETTINGS, type LocalClipRecord } from '@clipsync/shared'
import { create } from 'zustand'
import { clipsApi } from '@/lib/api'
import { getAuthToken } from '@/lib/auth-token'

interface ClipState {
  clips: LocalClipRecord[]
  loading: boolean
  error: string | null
  pinningIds: ReadonlySet<string>
  /** 从本地 SQLite 载入历史 */
  load: () => Promise<void>
  addClip: (clip: LocalClipRecord) => void
  upsertClip: (clip: LocalClipRecord) => void
  /** 切换置顶状态；已同步且已登录的记录同时更新云端 */
  togglePin: (id: string) => Promise<void>
  /** 删除记录（已同步的会同时删除云端） */
  removeClip: (id: string) => Promise<void>
  /** 仅从内存中移除，供 Socket 删除事件使用 */
  removeLocal: (id: string) => void
  markSynced: (id: string) => void
}

/** 内存中最多保留的记录数，随设置里的 maxClips 变化 */
let maxClips = DEFAULT_SETTINGS.maxClips

/** 应用设置里的最大保留数，并立即裁剪内存列表 */
export function applyMaxClips(limit: number): void {
  maxClips = Math.max(1, Math.floor(limit))
  useClipStore.setState((state) => ({ clips: limitClips(state.clips) }))
}

const clipTasks = new Map<string, Promise<unknown>>()

/** 串行执行同一条目的上传与置顶任务，避免在途请求覆盖用户最新操作 */
export function enqueueClipTask<T>(id: string, task: () => Promise<T>): Promise<T> {
  const previous = clipTasks.get(id) ?? Promise.resolve()
  const result = previous.catch(() => undefined).then(task)
  const tracked = result.finally(() => {
    if (clipTasks.get(id) === tracked) clipTasks.delete(id)
  })
  clipTasks.set(id, tracked)
  return tracked
}

function sortClips(clips: LocalClipRecord[]): LocalClipRecord[] {
  return [...clips].sort(
    (left, right) =>
      Number(right.isPinned) - Number(left.isPinned) ||
      right.createdAt.localeCompare(left.createdAt)
  )
}

function limitClips(clips: LocalClipRecord[]): LocalClipRecord[] {
  return clips.length > maxClips ? clips.slice(0, maxClips) : clips
}

function mergeClip(clips: LocalClipRecord[], clip: LocalClipRecord): LocalClipRecord[] {
  return limitClips(sortClips([clip, ...clips.filter((item) => item.id !== clip.id)]))
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  loading: true,
  error: null,
  pinningIds: new Set<string>(),

  load: async () => {
    try {
      const clips = await window.api.getLocalClips()
      set({ clips: limitClips(sortClips(clips)), loading: false, error: null })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  },

  addClip: (clip) => {
    set((state) => ({ clips: mergeClip(state.clips, clip) }))
  },

  upsertClip: (clip) => {
    set((state) => ({ clips: mergeClip(state.clips, clip) }))
  },

  togglePin: async (id) => {
    if (!get().clips.some((item) => item.id === id) || get().pinningIds.has(id)) return

    set((state) => ({ pinningIds: new Set(state.pinningIds).add(id) }))

    try {
      await enqueueClipTask(id, async () => {
        const clip = get().clips.find((item) => item.id === id)
        if (!clip) return

        const nextPinned = !clip.isPinned
        const saved = await window.api.setLocalClipPinned(id, nextPinned)
        if (!saved) {
          get().removeLocal(id)
          return
        }
        get().upsertClip(saved)

        if (!saved.isSynced || !getAuthToken()) return

        try {
          await clipsApi.updatePin(id, nextPinned)
        } catch (error) {
          const current = get().clips.find((item) => item.id === id)
          if (current === saved) {
            const restored = await window.api.setLocalClipPinned(id, clip.isPinned)
            if (restored) get().upsertClip(restored)
          }
          throw error
        }
      })
    } finally {
      set((state) => {
        const pinningIds = new Set(state.pinningIds)
        pinningIds.delete(id)
        return { pinningIds }
      })
    }
  },

  removeClip: async (id) => {
    const clip = get().clips.find((item) => item.id === id)
    if (!clip) return

    // 乐观更新：立即从 UI 移除
    get().removeLocal(id)

    try {
      if (clip.isSynced) {
        await clipsApi.remove(id)
      }
      await window.api.deleteLocalClip(id)
    } catch (error) {
      // 回滚：恢复被移除的记录
      console.warn('[clip] 删除失败，恢复记录', error)
      get().upsertClip(clip)
      throw error
    }
  },

  removeLocal: (id) => {
    set((state) => ({ clips: state.clips.filter((item) => item.id !== id) }))
  },

  markSynced: (id) => {
    set((state) => ({
      clips: state.clips.map((item) => (item.id === id ? { ...item, isSynced: true } : item))
    }))
  }
}))
