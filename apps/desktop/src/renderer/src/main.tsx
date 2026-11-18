import { DEFAULT_SETTINGS } from '@clipsync/shared'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { hydrateAuthToken } from './lib/auth-token'
import { applyTheme } from './lib/theme'
import SettingsPage from './pages/settings-page'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('未找到 #root 容器')
}

const root = createRoot(container)

/** 把参数转成可读文本，避免 Error / 对象被转成 [object Object] */
function formatLogArg(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  if (typeof arg === 'string') return arg
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/** 渲染进程的 console 只进 DevTools，转发到主进程终端便于排查同步问题 */
function forwardConsole(): void {
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      window.api.logRenderer(level, args.map(formatLogArg).join(' '))
    }
  }
}

forwardConsole()

/** 主窗口与设置窗口共用同一份产物，通过 hash 区分 */
const isSettingsWindow = window.location.hash.startsWith('#/settings')

/**
 * 先把主题与加密保存的 Token 准备好再渲染，
 * 保证首屏不会闪错主题，且 getSession / 同步请求已经能拿到 Bearer Token。
 */
async function bootstrap(): Promise<void> {
  try {
    const settings = await window.api.getSettings()
    applyTheme(settings.theme)
  } catch (error) {
    console.warn('[theme] 设置读取失败，使用默认主题', error)
    applyTheme(DEFAULT_SETTINGS.theme)
  }

  try {
    await hydrateAuthToken()
  } catch (error) {
    console.warn('[auth] Token 读取失败，按未登录处理', error)
  }

  root.render(<StrictMode>{isSettingsWindow ? <SettingsPage /> : <App />}</StrictMode>)
}

void bootstrap()
