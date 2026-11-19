import { DEFAULT_SETTINGS, type ClipType, type Theme } from '@clipsync/shared'
import { Loader2, LogIn, LogOut, Search, Settings } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthDialog } from '@/components/auth-dialog'
import { ClipCard } from '@/components/clip-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCloudSync } from '@/hooks/use-cloud-sync'
import { applyLanguage } from '@/i18n'
import { getAuthToken, hydrateAuthToken } from '@/lib/auth-token'
import { pushClip, purgeExpiredClips } from '@/lib/clip-sync'
import { notifySyncError } from '@/lib/sync-notice'
import { applyTheme } from '@/lib/theme'
import { useAuthStore } from '@/store/auth-store'
import { applyMaxClips, useClipStore } from '@/store/clip-store'

type Filter = 'all' | Extract<ClipType, 'TEXT' | 'CODE' | 'LINK'>

/** 定期清理超期未使用的记录（应用常驻托盘，不能只依赖启动时清理） */
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

function runCleanup(): void {
  void purgeExpiredClips().catch((cleanupError: unknown) => {
    console.warn('[cleanup] 自动清理失败', cleanupError)
  })
}

export default function App() {
  const { t } = useTranslation()
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
  const [accelerator, setAccelerator] = useState<string>(DEFAULT_SETTINGS.toggleAccelerator)
  const [theme, setTheme] = useState<Theme>(DEFAULT_SETTINGS.theme)
  const searchRef = useRef<HTMLInputElement>(null)

  useCloudSync(authStatus === 'authenticated' ? (user?.id ?? null) : null)

  useEffect(() => {
    void initAuth()
  }, [initAuth])

  // 设置可在独立窗口修改，窗口获得焦点时刷新快捷键 / 主题 / 保留数量，并重新载入本地记录
  useEffect(() => {
    const refresh = (): void => {
      void window.api
        .getSettings()
        .then((next) => {
          setAccelerator(next.toggleAccelerator)
          setTheme(next.theme)
          applyTheme(next.theme)
          applyLanguage(next.language)
          applyMaxClips(next.maxClips)
        })
        .catch(() => {})
      void load()
      // 设置窗口可能刚完成登录态变更（退出 / 删除账号 / 改昵称），
      // 重新从主进程读取 Token 并校验会话，保证两个窗口状态一致
      void hydrateAuthToken()
        .then(() => initAuth())
        .catch(() => {})
    }

    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [initAuth, load])

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
      if (!getAuthToken()) return

      // 每次按最新设置判断，避免设置窗口修改后主窗口仍使用旧值
      void (async () => {
        try {
          const { autoSyncNewClip } = await window.api.getSettings()
          if (!autoSyncNewClip) return
          await pushClip(clip)
        } catch (syncError) {
          console.warn('[sync] 新条目上传失败', syncError)
          notifySyncError(t('app.syncFailed'))
        }
      })()
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
  }, [addClip, t])

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
            {authStatus === 'authenticated' && user ? user.email : t('app.localMode')}
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
              {t('app.logout')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setAuthOpen(true)}>
              <LogIn className="size-3.5" />
              {t('app.login')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            title={t('app.settings')}
            onClick={() => void window.api.openSettings()}
          >
            <Settings className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={keyword}
            autoFocus
            placeholder={t('app.searchPlaceholder')}
            className="h-8 pl-8 text-xs"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="w-full">
            <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
            <TabsTrigger value="TEXT">{t('filters.text')}</TabsTrigger>
            <TabsTrigger value="CODE">{t('filters.code')}</TabsTrigger>
            <TabsTrigger value="LINK">{t('filters.link')}</TabsTrigger>
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
            <p>{keyword ? t('app.emptyNoMatch') : t('app.emptyHint')}</p>
            <p>{t('app.emptyShortcut', { accelerator })}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            <AnimatePresence initial={false} mode="popLayout">
              {filteredClips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      <footer className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
        <span>{t('app.footerShortcut', { accelerator })}</span>
        <span>{t('app.footerCount', { count: clips.length })}</span>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <Toaster theme={theme === 'system' ? 'system' : theme} />
    </div>
  )
}
