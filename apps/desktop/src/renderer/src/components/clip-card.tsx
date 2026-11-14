import type { ClipType, LocalClipRecord } from '@clipsync/shared'
import { Cloud, CloudOff, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useClipStore } from '@/store/clip-store'

const TYPE_LABELS: Record<ClipType, string> = {
  TEXT: '文本',
  CODE: '代码',
  IMAGE: '图片',
  LINK: '链接',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ClipCardProps {
  clip: LocalClipRecord
}

export function ClipCard({ clip }: ClipCardProps) {
  const removeClip = useClipStore((state) => state.removeClip)

  const handleCopy = async (): Promise<void> => {
    await window.api.writeClipboard(clip.content)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void handleCopy()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          void handleCopy()
        }
      }}
      className="group relative cursor-pointer rounded-xl border border-border/70 bg-card/70 p-3 transition-colors hover:border-primary/40 hover:bg-card focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <p className="line-clamp-3 pr-6 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
        {clip.content}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {TYPE_LABELS[clip.type]}
        </Badge>
        <span className="max-w-[110px] truncate">{clip.deviceName}</span>
        <span>·</span>
        <span>{formatTime(clip.createdAt)}</span>
        <span className="ml-auto flex items-center gap-1">
          {clip.isSynced ? (
            <>
              <Cloud className="size-3 text-emerald-400" />
              已同步
            </>
          ) : (
            <>
              <CloudOff className="size-3" />
              仅本地
            </>
          )}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="删除记录"
        className="absolute top-2 right-2 size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        onClick={(event) => {
          event.stopPropagation()
          void removeClip(clip.id)
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
