import type { ClipType, LocalClipRecord } from '@clipsync/shared'
import { useCallback, useEffect, useMemo, useState } from 'react'

const TYPE_LABELS: Record<ClipType, string> = {
  TEXT: '文本',
  CODE: '代码',
  IMAGE: '图片',
  LINK: '链接',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [clips, setClips] = useState<LocalClipRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    window.api
      .getLocalClips()
      .then((list) => {
        if (active) setClips(list)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })

    const unsubscribe = window.api.onClipboardNew((clip) => {
      setClips((prev) => [clip, ...prev.filter((item) => item.id !== clip.id)].slice(0, 200))
    })

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') void window.api.hideWindow()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      active = false
      unsubscribe()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const filteredClips = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    if (!query) return clips
    return clips.filter((clip) => clip.content.toLowerCase().includes(query))
  }, [clips, keyword])

  const handleUse = useCallback(async (clip: LocalClipRecord) => {
    await window.api.writeClipboard(clip.content)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await window.api.deleteLocalClip(id)
    setClips((prev) => prev.filter((clip) => clip.id !== id))
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>ClipSync</h1>
          <p>本地剪贴板历史 · {clips.length} 条</p>
        </div>
        <button className="app__hide" type="button" title="隐藏窗口 (Esc)" onClick={() => void window.api.hideWindow()}>
          ×
        </button>
      </header>

      <input
        className="app__search"
        type="text"
        value={keyword}
        placeholder="搜索剪贴板内容…"
        autoFocus
        onChange={(event) => setKeyword(event.target.value)}
      />

      {error ? <p className="app__error">{error}</p> : null}

      <ul className="clip-list">
        {filteredClips.map((clip) => (
          <li key={clip.id} className="clip">
            <button className="clip__content" type="button" onClick={() => void handleUse(clip)}>
              <span className="clip__meta">
                <span className="clip__type">{TYPE_LABELS[clip.type]}</span>
                <span>{formatTime(clip.createdAt)}</span>
                <span>{clip.isSynced ? '已同步' : '仅本地'}</span>
              </span>
              <span className="clip__text">{clip.content}</span>
            </button>
            <button className="clip__delete" type="button" onClick={() => void handleDelete(clip.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>

      {filteredClips.length === 0 ? (
        <p className="app__empty">复制一段文本即可自动记录；按 Option+V / Alt+V 呼出窗口。</p>
      ) : null}
    </div>
  )
}
