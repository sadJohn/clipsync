import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { hydrateAuthToken } from './lib/auth-token'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('未找到 #root 容器')
}

const root = createRoot(container)

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

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void bootstrap()
