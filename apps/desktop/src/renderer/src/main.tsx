import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { hydrateAuthToken } from './lib/auth-token'
import SettingsPage from './pages/settings-page'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('未找到 #root 容器')
}

const root = createRoot(container)

/** 主窗口与设置窗口共用同一份产物，通过 hash 区分 */
const isSettingsWindow = window.location.hash.startsWith('#/settings')

/**
 * 先把加密保存的 Token 读入内存再渲染，
 * 保证首屏的 getSession / 同步请求已经能拿到 Bearer Token。
 */
async function bootstrap(): Promise<void> {
  try {
    await hydrateAuthToken()
  } catch (error) {
    console.warn('[auth] Token 读取失败，按未登录处理', error)
  }

  root.render(<StrictMode>{isSettingsWindow ? <SettingsPage /> : <App />}</StrictMode>)
}

void bootstrap()
