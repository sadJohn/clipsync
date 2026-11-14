import { useEffect } from 'react'
import { getAuthToken } from '@/lib/auth-token'
import { syncWithCloud } from '@/lib/clip-sync'
import { connectSyncSocket } from '@/lib/socket'
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
    })

    void syncWithCloud().catch((error: unknown) => {
      console.warn('[sync] 云同步失败', error)
    })

    return () => {
      disposed = true
      socket.disconnect()
    }
  }, [userId])
}
