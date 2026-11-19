import type { Language, Theme, UpdateStatus } from '@clipsync/shared'
import type { TFunction } from 'i18next'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSettings } from '@/components/account-settings'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { applyLanguage } from '@/i18n'
import { applyTheme } from '@/lib/theme'
import { useSettingsStore } from '@/store/settings-store'

const HIDE_DELAY_VALUES = [0, 1000, 3000, 5000] as const

const MAX_CLIPS_VALUES = [200, 500, 1000, 2000] as const

const EXPIRE_DAYS_VALUES = [0, 7, 30, 90] as const

/** 更新状态对应的说明文案 */
function updateMessage(t: TFunction<'translation'>, status: UpdateStatus | null): string {
  if (!status) return ''

  switch (status.state) {
    case 'checking':
      return t('settings.update.checking')
    case 'available':
      return status.version
        ? t('settings.update.available', { version: status.version })
        : t('settings.update.availableNoVersion')
    case 'downloading':
      return status.version
        ? t('settings.update.downloadingWithVersion', {
            version: status.version,
            percent: status.percent ?? 0
          })
        : t('settings.update.downloading', { percent: status.percent ?? 0 })
    case 'downloaded':
      return status.version
        ? t('settings.update.downloadedWithVersion', { version: status.version })
        : t('settings.update.downloaded')
    case 'up-to-date':
      return t('settings.update.upToDate')
    case 'error':
      return status.message
        ? t('settings.update.error', { message: status.message })
        : t('settings.update.errorUnknown')
    case 'unsupported':
      return t('settings.update.unsupported')
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
  const { t } = useTranslation()
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
        setHint(t('settings.shortcutCapture.hint'))
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
  }, [recording, t])

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
        {recording ? t('settings.shortcutCapture.press') : value}
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
  const { t } = useTranslation()
  const settings = useSettingsStore((state) => state.settings)
  const loadSettings = useSettingsStore((state) => state.load)
  const update = useSettingsStore((state) => state.update)
  const loading = useSettingsStore((state) => state.loading)
  const error = useSettingsStore((state) => state.error)

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
  }, [loadSettings])

  const updateText = updateMessage(t, updateStatus)

  const hideDelayOptions: readonly Option[] = HIDE_DELAY_VALUES.map((value) => ({
    value,
    label:
      value === 0
        ? t('settings.options.immediate')
        : t('settings.options.seconds', { count: value / 1000 })
  }))

  const maxClipsOptions: readonly Option[] = MAX_CLIPS_VALUES.map((value) => ({
    value,
    label: String(value)
  }))

  const expireDaysOptions: readonly Option[] = EXPIRE_DAYS_VALUES.map((value) => ({
    value,
    label: value === 0 ? t('settings.options.never') : t('settings.options.days', { count: value })
  }))

  const themeOptions: readonly Option[] = [
    { value: 'system', label: t('settings.options.themeSystem') },
    { value: 'light', label: t('settings.options.themeLight') },
    { value: 'dark', label: t('settings.options.themeDark') }
  ]

  const languageOptions: readonly Option[] = [
    { value: 'system', label: t('settings.options.languageSystem') },
    { value: 'zh-CN', label: t('settings.options.languageZh') },
    { value: 'en-US', label: t('settings.options.languageEn') }
  ]

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-baseline justify-between border-b border-border/60 px-6 py-4">
        <h1 className="text-sm font-semibold tracking-tight">{t('settings.title')}</h1>
        <span className="text-[11px] text-muted-foreground">ClipSync</span>
      </header>

      <Tabs defaultValue="general" className="min-h-0 flex-1 gap-0">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="general">{t('settings.tabs.general')}</TabsTrigger>
            <TabsTrigger value="account">{t('settings.tabs.account')}</TabsTrigger>
            <TabsTrigger value="about">{t('settings.tabs.about')}</TabsTrigger>
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
                <SettingsRow
                  label={t('settings.autoLaunch.label')}
                  description={t('settings.autoLaunch.description')}
                >
                  <Switch
                    checked={settings.autoLaunch}
                    onCheckedChange={(checked) => void update({ autoLaunch: checked })}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.shortcut.label')}
                  description={t('settings.shortcut.description')}
                >
                  <ShortcutRecorder
                    value={settings.toggleAccelerator}
                    onChange={(accelerator) => update({ toggleAccelerator: accelerator })}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.hideDelay.label')}
                  description={t('settings.hideDelay.description')}
                >
                  <OptionGroup
                    value={settings.hideDelayMs}
                    options={hideDelayOptions}
                    onChange={(value) => void update({ hideDelayMs: Number(value) })}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.autoSync.label')}
                  description={t('settings.autoSync.description')}
                >
                  <Switch
                    checked={settings.autoSyncNewClip}
                    onCheckedChange={(checked) => void update({ autoSyncNewClip: checked })}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.maxClips.label')}
                  description={t('settings.maxClips.description')}
                >
                  <OptionGroup
                    value={settings.maxClips}
                    options={maxClipsOptions}
                    onChange={(value) => void update({ maxClips: Number(value) })}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.cleanup.label')}
                  description={t('settings.cleanup.description')}
                >
                  <OptionGroup
                    value={settings.expireDays}
                    options={expireDaysOptions}
                    onChange={(value) => void update({ expireDays: Number(value) })}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.theme.label')}
                  description={t('settings.theme.description')}
                >
                  <OptionGroup
                    value={settings.theme}
                    options={themeOptions}
                    onChange={(value) => {
                      const theme = value as Theme
                      applyTheme(theme)
                      void update({ theme })
                    }}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings.language.label')}
                  description={t('settings.language.description')}
                >
                  <OptionGroup
                    value={settings.language}
                    options={languageOptions}
                    onChange={(value) => {
                      const language = value as Language
                      applyLanguage(language)
                      void update({ language })
                    }}
                  />
                </SettingsRow>
              </section>
            )}
            {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          </TabsContent>

          <TabsContent value="account" className="flex flex-col gap-3">
            <AccountSettings />
          </TabsContent>

          <TabsContent value="about" className="flex flex-col gap-3">
            <section className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card/40">
              <SettingsRow
                label={t('settings.about.autoUpdate.label')}
                description={t('settings.about.autoUpdate.description')}
              >
                <Switch
                  checked={settings.autoUpdate}
                  onCheckedChange={(checked) => void update({ autoUpdate: checked })}
                />
              </SettingsRow>

              <SettingsRow
                label={t('settings.about.check')}
                description={t('settings.about.currentVersion', {
                  version: updateStatus?.currentVersion ?? '—'
                })}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    updateStatus?.state === 'checking' || updateStatus?.state === 'downloading'
                  }
                  onClick={() => void window.api.checkForUpdates()}
                >
                  {updateStatus?.state === 'checking'
                    ? t('settings.about.checking')
                    : t('settings.about.check')}
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
                {t('settings.about.description')}
              </p>
            </section>
          </TabsContent>
        </div>
      </Tabs>

      <Toaster theme={settings.theme} />
    </div>
  )
}
