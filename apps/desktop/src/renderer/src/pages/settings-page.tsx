import type { Theme, UpdateStatus } from '@clipsync/shared'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { applyTheme } from '@/lib/theme'
import { useAuthStore } from '@/store/auth-store'
import { useSettingsStore } from '@/store/settings-store'

const HIDE_DELAY_OPTIONS = [
  { value: 0, label: '立即' },
  { value: 1000, label: '1 秒' },
  { value: 3000, label: '3 秒' },
  { value: 5000, label: '5 秒' }
] as const

const MAX_CLIPS_OPTIONS = [
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: 1000, label: '1000' },
  { value: 2000, label: '2000' }
] as const

const EXPIRE_DAYS_OPTIONS = [
  { value: 0, label: '永不' },
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' }
] as const

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
] as const

/** 更新状态对应的说明文案 */
function updateMessage(status: UpdateStatus | null): string {
  if (!status) return ''

  switch (status.state) {
    case 'checking':
      return '正在检查更新…'
    case 'available':
      return status.version ? `发现新版本 ${status.version}，正在下载…` : '发现新版本，正在下载…'
    case 'downloading':
      return `正在下载新版本${status.version ? ` ${status.version}` : ''}（${status.percent ?? 0}%）`
    case 'downloaded':
      return `新版本${status.version ? ` ${status.version}` : ''} 已下载，退出应用后自动安装`
    case 'up-to-date':
      return '当前已是最新版本'
    case 'error':
      return `检查更新失败：${status.message ?? '未知错误'}`
    case 'unsupported':
      return status.message ?? '当前运行方式不支持检查更新'
    default:
      return ''
  }
}

const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight'
])

const SPECIAL_KEYS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown'
}

/** 把按键事件转成 electron accelerator；必须是「修饰键 + 普通键」的组合 */
function toAccelerator(event: KeyboardEvent): string | null {
  const modifiers: string[] = []
  if (event.metaKey || event.ctrlKey) modifiers.push('CommandOrControl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')

  let key: string | null = null
  if (/^Key[A-Z]$/.test(event.code)) {
    key = event.code.slice(3)
  } else if (/^Digit[0-9]$/.test(event.code)) {
    key = event.code.slice(5)
  } else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) {
    key = event.code
  } else {
    key = SPECIAL_KEYS[event.code] ?? null
  }

  if (!key || modifiers.length === 0) return null
  return [...modifiers, key].join('+')
}

interface ShortcutRecorderProps {
  value: string
  disabled?: boolean
  onChange: (accelerator: string) => Promise<void>
}

/** 点击后直接按组合键录制；录制期间主进程会暂停全局快捷键，避免按键直接切换窗口 */
function ShortcutRecorder({ value, disabled, onChange }: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!recording) return

    const stop = (): void => {
      setRecording(false)
      setHint(null)
      void window.api.setShortcutCapturing(false)
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        stop()
        return
      }
      if (MODIFIER_CODES.has(event.code)) return

      const accelerator = toAccelerator(event)
      if (!accelerator) {
        setHint('请按下包含修饰键（⌘ / Ctrl / Alt / Shift）的组合')
        return
      }

      setRecording(false)
      setHint(null)
      // 先写入新快捷键，无论成功失败都恢复全局快捷键
      void onChangeRef.current(accelerator).finally(() => {
        void window.api.setShortcutCapturing(false)
      })
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', stop)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', stop)
    }
  }, [recording])

  // 切换 Tab / 关闭设置窗口时确保恢复全局快捷键
  useEffect(() => {
    return () => {
      void window.api.setShortcutCapturing(false)
    }
  }, [])

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          if (recording) {
            setRecording(false)
            setHint(null)
            void window.api.setShortcutCapturing(false)
            return
          }
          setHint(null)
          setRecording(true)
          void window.api.setShortcutCapturing(true)
        }}
      >
        {recording ? '按下组合键…' : value}
      </Button>
      {hint ? <span className="text-[10px] text-destructive">{hint}</span> : null}
    </div>
  )
}

interface SettingsRowProps {
  label: string
  description: string
  children: ReactNode
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

interface Option {
  value: number | string
  label: string
}

interface OptionGroupProps {
  value: number | string
  options: readonly Option[]
  onChange: (value: number | string) => void
}

/** 单选按钮组，用于几档固定选项 */
function OptionGroup({ value, options, onChange }: OptionGroupProps) {
  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings)
  const loadSettings = useSettingsStore((state) => state.load)
  const update = useSettingsStore((state) => state.update)
  const loading = useSettingsStore((state) => state.loading)
  const error = useSettingsStore((state) => state.error)

  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const initAuth = useAuthStore((state) => state.init)

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    void window.api
      .getUpdateStatus()
      .then(setUpdateStatus)
      .catch(() => {})
    return window.api.onUpdateStatus(setUpdateStatus)
  }, [])

  useEffect(() => {
    void loadSettings()
    void initAuth()
  }, [loadSettings, initAuth])

  const updateText = updateMessage(updateStatus)

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
              <section className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card/40">
                <SettingsRow label="开机自启" description="登录系统后自动启动 ClipSync">
                  <Switch
                    checked={settings.autoLaunch}
                    onCheckedChange={(checked) => void update({ autoLaunch: checked })}
                  />
                </SettingsRow>

                <SettingsRow label="呼出快捷键" description="在任意应用中呼出或隐藏悬浮窗">
                  <ShortcutRecorder
                    value={settings.toggleAccelerator}
                    onChange={(accelerator) => update({ toggleAccelerator: accelerator })}
                  />
                </SettingsRow>

                <SettingsRow label="失焦隐藏" description="悬浮窗失去焦点后延迟收起">
                  <OptionGroup
                    value={settings.hideDelayMs}
                    options={HIDE_DELAY_OPTIONS}
                    onChange={(value) => void update({ hideDelayMs: Number(value) })}
                  />
                </SettingsRow>

                <SettingsRow label="自动同步" description="新复制的剪贴板内容自动上传到云端">
                  <Switch
                    checked={settings.autoSyncNewClip}
                    onCheckedChange={(checked) => void update({ autoSyncNewClip: checked })}
                  />
                </SettingsRow>

                <SettingsRow
                  label="最多显示"
                  description="列表中最多展示的记录数，超出部分不再显示"
                >
                  <OptionGroup
                    value={settings.maxClips}
                    options={MAX_CLIPS_OPTIONS}
                    onChange={(value) => void update({ maxClips: Number(value) })}
                  />
                </SettingsRow>

                <SettingsRow label="自动清理" description="删除超过设定天数未使用的记录">
                  <OptionGroup
                    value={settings.expireDays}
                    options={EXPIRE_DAYS_OPTIONS}
                    onChange={(value) => void update({ expireDays: Number(value) })}
                  />
                </SettingsRow>

                <SettingsRow label="主题" description="切换界面配色，跟随系统时自动适配">
                  <OptionGroup
                    value={settings.theme}
                    options={THEME_OPTIONS}
                    onChange={(value) => {
                      const theme = value as Theme
                      applyTheme(theme)
                      void update({ theme })
                    }}
                  />
                </SettingsRow>
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
            <section className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card/40">
              <SettingsRow label="自动更新" description="启动时自动检查并下载新版本">
                <Switch
                  checked={settings.autoUpdate}
                  onCheckedChange={(checked) => void update({ autoUpdate: checked })}
                />
              </SettingsRow>

              <SettingsRow
                label="检查更新"
                description={`当前版本 v${updateStatus?.currentVersion ?? '—'}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    updateStatus?.state === 'checking' || updateStatus?.state === 'downloading'
                  }
                  onClick={() => void window.api.checkForUpdates()}
                >
                  {updateStatus?.state === 'checking' ? '检查中…' : '检查更新'}
                </Button>
              </SettingsRow>
            </section>

            {updateText ? (
              <p
                className={
                  updateStatus?.state === 'error'
                    ? 'text-[11px] text-destructive'
                    : 'text-[11px] text-muted-foreground'
                }
              >
                {updateText}
              </p>
            ) : null}

            <section className="rounded-lg border border-border/60 bg-card/40 p-4">
              <p className="text-xs font-medium">ClipSync</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                本地优先的剪贴板历史工具，登录后可跨设备同步。
              </p>
            </section>
          </TabsContent>
        </div>
      </Tabs>

      <Toaster theme={settings.theme} />
    </div>
  )
}
