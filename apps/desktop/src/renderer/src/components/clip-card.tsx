import type { ClipType, LocalClipRecord } from '@clipsync/shared'
import { Cloud, CloudOff, Pin, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { clipsApi } from '@/lib/api'
import { getAuthToken } from '@/lib/auth-token'
import { useClipStore } from '@/store/clip-store'

const TYPE_LABEL_KEYS = {
  TEXT: 'clipTypes.TEXT',
  CODE: 'clipTypes.CODE',
  IMAGE: 'clipTypes.IMAGE',
  LINK: 'clipTypes.LINK'
} as const

const TYPE_BADGE_STYLES: Record<ClipType, string> = {
  TEXT: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  CODE: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  IMAGE: 'bg-pink-500/15 text-pink-500 border-pink-500/30',
  LINK: 'bg-amber-500/15 text-amber-500 border-amber-500/30'
}

function formatTime(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface ClipCardProps {
  clip: LocalClipRecord
}

/**
 * 列表项按 clip 引用比较；store 更新时未变化的条目引用保持不变，可直接跳过重渲染。
 */
export const ClipCard = memo(function ClipCard({ clip }: ClipCardProps) {
  const { t, i18n } = useTranslation()
  const removeClip = useClipStore((state) => state.removeClip)
  const togglePin = useClipStore((state) => state.togglePin)
  const isPinning = useClipStore((state) => state.pinningIds.has(clip.id))
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleCopy = async (): Promise<void> => {
    await window.api.touchLocalClip(clip.id)
    if (clip.isSynced && getAuthToken()) {
      void clipsApi.use(clip.id).catch((error: unknown) => {
        console.warn('[sync] 使用记录上报失败', error)
      })
    }
    await window.api.writeClipboard(clip.content)
  }

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: 'easeOut' } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
      onClick={() => void handleCopy()}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          void handleCopy()
        }
      }}
      className="group relative cursor-pointer rounded-xl border border-border/70 bg-card/70 p-3 transition-colors hover:border-primary/40 hover:bg-card focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <p className="line-clamp-3 pr-14 text-[13px] leading-relaxed wrap-break-words whitespace-pre-wrap">
        {clip.content}
      </p>

      <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
        <Badge variant="outline" className={`shrink-0 ${TYPE_BADGE_STYLES[clip.type]}`}>
          {t(TYPE_LABEL_KEYS[clip.type])}
        </Badge>
        <span className="min-w-0 max-w-27.5 truncate">{clip.deviceName}</span>
        <span>·</span>
        <span>{formatTime(clip.createdAt, i18n.language)}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {clip.isSynced ? (
            <>
              <Cloud className="size-3 text-emerald-400" />
              {t('clip.synced')}
            </>
          ) : (
            <>
              <CloudOff className="size-3" />
              {t('clip.localOnly')}
            </>
          )}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={clip.isPinned ? t('clip.unpin') : t('clip.pin')}
        aria-label={t('clip.pin')}
        aria-pressed={clip.isPinned}
        disabled={isPinning}
        className={`absolute top-2 right-8 size-6 transition-opacity focus-visible:opacity-100 ${
          clip.isPinned
            ? 'text-primary opacity-100'
            : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary'
        }`}
        onClick={(event) => {
          event.stopPropagation()
          void togglePin(clip.id).catch((error: unknown) => {
            console.warn('[clip] 置顶操作失败', error)
            toast.error(t('clip.pinFailed'))
          })
        }}
      >
        <Pin className="size-3.5" fill={clip.isPinned ? 'currentColor' : 'none'} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={t('clip.delete')}
        aria-label={t('clip.delete')}
        className="absolute top-2 right-2 size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        onClick={(event) => {
          event.stopPropagation()
          if (clip.isPinned) {
            setConfirmOpen(true)
            return
          }
          void removeClip(clip.id).catch((error: unknown) => {
            console.warn('[clip] 删除失败', error)
            toast.error(t('clip.deleteFailed'))
          })
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>

      {clip.isPinned ? (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent
            showCloseButton={false}
            className="max-w-80"
            onClick={(event) => event.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>{t('clip.confirmDeleteTitle')}</DialogTitle>
              <DialogDescription>{t('clip.confirmDeleteDescription')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                {t('clip.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false)
                  void removeClip(clip.id).catch((error: unknown) => {
                    console.warn('[clip] 删除失败', error)
                    toast.error(t('clip.deleteFailed'))
                  })
                }}
              >
                {t('clip.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </motion.div>
  )
})
