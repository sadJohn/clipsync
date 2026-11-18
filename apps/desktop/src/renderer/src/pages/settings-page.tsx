import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/auth-store'
import { useSettingsStore } from '@/store/settings-store'

export default function SettingsPage() {
  const loadSettings = useSettingsStore((state) => state.load)
  const loading = useSettingsStore((state) => state.loading)
  const error = useSettingsStore((state) => state.error)

  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const initAuth = useAuthStore((state) => state.init)

  useEffect(() => {
    void loadSettings()
    void initAuth()
  }, [loadSettings, initAuth])

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-baseline justify-between border-b border-border/60 px-6 py-4">
        <h1 className="text-sm font-semibold tracking-tight">设置</h1>
        <span className="text-[11px] text-muted-foreground">ClipSync</span>
      </header>

      <Tabs defaultValue="general" className="min-h-0 flex-1 gap-0">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="account">账号</TabsTrigger>
            <TabsTrigger value="about">关于</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <TabsContent value="general" className="flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : (
              <section className="rounded-lg border border-border/60 bg-card/40 px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">暂无可用设置项</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  开机自启、全局快捷键、失焦隐藏等设置项将在后续版本提供
                </p>
              </section>
            )}
            {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          </TabsContent>

          <TabsContent value="account" className="flex flex-col gap-3">
            {authStatus === 'loading' ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : authStatus === 'authenticated' && user ? (
              <section className="rounded-lg border border-border/60 bg-card/40 p-4">
                <p className="text-xs font-medium">{user.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{user.email}</p>
              </section>
            ) : (
              <section className="rounded-lg border border-border/60 bg-card/40 p-4">
                <p className="text-xs font-medium">未登录</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  在悬浮窗中登录后，可在此查看账号信息。
                </p>
              </section>
            )}
          </TabsContent>

          <TabsContent value="about" className="flex flex-col gap-3">
            <section className="rounded-lg border border-border/60 bg-card/40 p-4">
              <p className="text-xs font-medium">ClipSync</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                本地优先的剪贴板历史工具，登录后可跨设备同步。
              </p>
            </section>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
