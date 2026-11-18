import type { ClipType } from '@clipsync/shared'
import { Loader2, LogIn, LogOut, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AuthDialog } from '@/components/auth-dialog'
import { ClipCard } from '@/components/clip-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCloudSync } from '@/hooks/use-cloud-sync'
import { getAuthToken } from '@/lib/auth-token'
import { pushClip, purgeExpiredClips } from '@/lib/clip-sync'
import { useAuthStore } from '@/store/auth-store'
import { useClipStore } from '@/store/clip-store'

type Filter = 'all' | Extract<ClipType, 'TEXT' | 'CODE' | 'LINK'>

/** 定期清理超期未使用的记录（应用常驻托盘，不能只依赖启动时清理） */
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

function runCleanup(): void {
  void purgeExpiredClips().catch((cleanupError: unknown) => {
    console.warn('[cleanup] 自动清理失败', cleanupError)
  })
}

export default function App() {
  const clips = useClipStore((state) => state.clips)
  const loading = useClipStore((state) => state.loading)
  const error = useClipStore((state) => state.error)
  const load = useClipStore((state) => state.load)
  const addClip = useClipStore((state) => state.addClip)

  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const initAuth = useAuthStore((state) => state.init)
  const signOut = useAuthStore((state) => state.signOut)

  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [authOpen, setAuthOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useCloudSync(authStatus === 'authenticated' ? (user?.id ?? null) : null)

  useEffect(() => {
    void load()
    void initAuth()
  }, [load, initAuth])

  // 已登录时由 useCloudSync 在拉取云端后清理，避免拉取前误删仍被其他设备使用的记录
  useEffect(() => {
    if (authStatus !== 'anonymous') return
    runCleanup()
  }, [authStatus])

  useEffect(() => {
    const timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.onClipboardNew((clip) => {
      addClip(clip)
      if (getAuthToken()) {
        void pushClip(clip).catch((syncError: unknown) => {
          console.warn('[sync] 新条目上传失败', syncError)
        })
      }
    })

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      // 有弹窗打开时由弹窗处理 Esc，避免同时隐藏悬浮窗
      if (document.querySelector('[role="dialog"]')) return
      void window.api.hideWindow()
    }
    const onFocus = (): void => {
      searchRef.current?.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('focus', onFocus)

    return () => {
      unsubscribe()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('focus', onFocus)
    }
  }, [addClip])

  const filteredClips = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    return clips.filter((clip) => {
      const matchesType = filter === 'all' || clip.type === filter
      const matchesKeyword =
        !query ||
        clip.content.toLowerCase().includes(query) ||
        clip.deviceName.toLowerCase().includes(query)
      return matchesType && matchesKeyword
    })
  }, [clips, filter, keyword])

  return (
    <div className="flex h-screen flex-col">
      <header className="drag-region flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">ClipSync</h1>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {authStatus === 'authenticated' && user ? user.email : '本地模式 · 登录后多设备同步'}
          </p>
        </div>

        <div className="no-drag flex items-center gap-1">
          {authStatus === 'authenticated' ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => void signOut()}
            >
              <LogOut className="size-3.5" />
              退出
            </Button>
          ) : (
            <Button size="sm" onClick={() => setAuthOpen(true)}>
              <LogIn className="size-3.5" />
              登录
            </Button>
          )}
        </div>
      </header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={keyword}
            autoFocus
            placeholder="搜索剪贴板内容…"
            className="h-8 pl-8 text-xs"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="w-full">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="TEXT">文本</TabsTrigger>
            <TabsTrigger value="CODE">代码</TabsTrigger>
            <TabsTrigger value="LINK">链接</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error ? <p className="px-4 pb-2 text-[11px] text-destructive">{error}</p> : null}

      <ScrollArea className="min-h-0 flex-1 px-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-[11px] text-muted-foreground">
            <p>{keyword ? '没有匹配的记录' : '复制一段文本，就会自动出现在这里'}</p>
            <p>按 Option+V / Alt+V 随时呼出窗口</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {filteredClips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        )}
      </ScrollArea>

      <footer className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
        <span>Option+V 呼出</span>
        <span>{clips.length} 条记录</span>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <Toaster />
    </div>
  )
}
