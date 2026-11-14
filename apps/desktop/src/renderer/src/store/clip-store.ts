import type { LocalClipRecord } from '@clipsync/shared'
import { create } from 'zustand'
import { clipsApi } from '@/lib/api'

interface ClipState {
  clips: LocalClipRecord[]
  loading: boolean
  error: string | null
  /** 从本地 SQLite 载入历史 */
  load: () => Promise<void>
  addClip: (clip: LocalClipRecord) => void
  upsertClip: (clip: LocalClipRecord) => void
  /** 删除记录（已同步的会同时删除云端） */
  removeClip: (id: string) => Promise<void>
  /** 仅从内存中移除，供 Socket 删除事件使用 */
  removeLocal: (id: string) => void
  markSynced: (id: string) => void
}

function sortByCreatedAtDesc(clips: LocalClipRecord[]): LocalClipRecord[] {
  return [...clips].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function mergeClip(clips: LocalClipRecord[], clip: LocalClipRecord): LocalClipRecord[] {
  return sortByCreatedAtDesc([clip, ...clips.filter((item) => item.id !== clip.id)])
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  loading: true,
  error: null,

  load: async () => {
    try {
      const clips = await window.api.getLocalClips()
      set({ clips: sortByCreatedAtDesc(clips), loading: false, error: null })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },

  addClip: (clip) => {
    set((state) => ({ clips: mergeClip(state.clips, clip) }))
  },

  upsertClip: (clip) => {
    set((state) => ({ clips: mergeClip(state.clips, clip) }))
  },

  removeClip: async (id) => {
    const clip = get().clips.find((item) => item.id === id)
    if (clip?.isSynced) {
      try {
        await clipsApi.remove(id)
      } catch (error) {
        console.warn('[clip] 云端删除失败', error)
      }
    }
    await window.api.deleteLocalClip(id)
    get().removeLocal(id)
  },

  removeLocal: (id) => {
    set((state) => ({ clips: state.clips.filter((item) => item.id !== id) }))
  },

  markSynced: (id) => {
    set((state) => ({
      clips: state.clips.map((item) => (item.id === id ? { ...item, isSynced: true } : item)),
    }))
  },
}))
