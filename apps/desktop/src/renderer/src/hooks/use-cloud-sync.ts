import { useEffect } from 'react'
import i18n from '@/i18n'
import { getAuthToken } from '@/lib/auth-token'
import { purgeExpiredClips, syncWithCloud } from '@/lib/clip-sync'
import { connectSyncSocket } from '@/lib/socket'
import { notifySyncError } from '@/lib/sync-notice'
import { useClipStore } from '@/store/clip-store'

/**
 * 登录后的云同步：上传未同步记录、拉取云端历史，并订阅其他设备的实时推送。
 */
export function useCloudSync(userId: string | null): void {
  useEffect(() => {
    if (!userId) return

    const token = getAuthToken()
    if (!token) return

    let disposed = false

    const socket = connectSyncSocket(token, {
      onNewClip: (clip) => {
        void window.api
          .upsertRemoteClip(clip)
          .then((saved) => {
            if (!disposed) useClipStore.getState().upsertClip(saved)
          })
          .catch((error: unknown) => {
            console.warn('[sync] 远端条目入库失败', error)
          })
      },
      onDeleteClip: (id) => {
        void window.api
          .deleteLocalClip(id)
          .then(() => {
            if (!disposed) useClipStore.getState().removeLocal(id)
          })
          .catch((error: unknown) => {
            console.warn('[sync] 远端删除同步失败', error)
          })
      },
      onPinClip: ({ id, isPinned }) => {
        void window.api
          .setLocalClipPinned(id, isPinned)
          .then((saved) => {
            if (disposed || !saved) return
            const exists = useClipStore.getState().clips.some((clip) => clip.id === id)
            if (exists) useClipStore.getState().upsertClip(saved)
          })
          .catch((error: unknown) => {
            console.warn('[sync] 置顶状态同步失败', error)
          })
      },
      onUseClip: (id) => {
        void window.api.touchLocalClip(id).catch((error: unknown) => {
          console.warn('[sync] 使用时间同步失败', error)
        })
      }
    })

    // 先同步云端再清理：避免刚清理的记录被拉取回来
    void (async () => {
      try {
        await syncWithCloud()
      } catch (error: unknown) {
        console.warn('[sync] 云同步失败', error)
        notifySyncError(i18n.t('errors.cloudSyncFailed'))
      }
      try {
        await purgeExpiredClips()
      } catch (error: unknown) {
        console.warn('[cleanup] 自动清理失败', error)
      }
    })()

    return () => {
      disposed = true
      socket.disconnect()
    }
  }, [userId])
}
