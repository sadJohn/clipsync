import { createAuthClient } from 'better-auth/react'
import { getAuthToken, setAuthToken } from './auth-token'
import { SERVER_URL } from './server'

/**
 * Better Auth 客户端（Bearer 模式）：
 * - 所有请求自动携带本地保存的会话 Token
 * - 登录 / 注册成功后从响应头 set-auth-token 捕获 Token 并持久化
 */
export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => getAuthToken() ?? undefined
    },
    onSuccess: (context) => {
      const token = context.response.headers.get('set-auth-token')
      if (token) {
        // 内存缓存同步更新，落盘由主进程异步完成，不阻塞后续请求
        void setAuthToken(token).catch((error: unknown) => {
          console.warn('[auth] Token 保存失败', error)
        })
      }
    }
  }
})
