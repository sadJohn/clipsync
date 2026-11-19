import { create } from 'zustand'
import i18n from '@/i18n'
import { authClient } from '@/lib/auth-client'
import { clearAuthToken, getAuthToken } from '@/lib/auth-token'

export interface AuthUser {
  id: string
  name: string
  email: string
}

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateName: (name: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return i18n.t('errors.operationFailed')
}

function toUser(user: { id: string; name: string; email: string }): AuthUser {
  return { id: user.id, name: user.name, email: user.email }
}

/** 服务端明确返回 401 才代表 Token 失效；网络错误 / 服务端未就绪不能据此删 Token */
function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: unknown }).status === 401
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** pnpm dev 会并行启动 server 与 desktop，启动时服务端可能尚未监听端口 */
const SESSION_RETRY_DELAYS_MS = [1000, 2000, 4000]

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  init: async () => {
    if (!getAuthToken()) {
      set({ status: 'anonymous', user: null })
      return
    }

    let lastError: unknown = null

    for (const waitMs of [0, ...SESSION_RETRY_DELAYS_MS]) {
      if (waitMs > 0) await delay(waitMs)

      try {
        const { data, error } = await authClient.getSession()
        if (data?.user) {
          set({ status: 'authenticated', user: toUser(data.user) })
          return
        }
        if (isUnauthorized(error)) {
          await clearAuthToken()
          set({ status: 'anonymous', user: null })
          return
        }
        lastError = error
      } catch (error) {
        // 网络异常：保留 Token，稍后重试
        lastError = error
      }
    }

    console.warn('[auth] 会话校验失败，已保留本地 Token', lastError)
    set({ status: 'anonymous', user: null })
  },

  signIn: async (email, password) => {
    const { data, error } = await authClient.signIn.email({ email, password })
    if (error) throw new Error(errorMessage(error))
    if (!data?.user) throw new Error(i18n.t('errors.signInFailed'))
    set({ status: 'authenticated', user: toUser(data.user) })
  },

  signUp: async (name, email, password) => {
    const { data, error } = await authClient.signUp.email({ name, email, password })
    if (error) throw new Error(errorMessage(error))
    if (!data?.user) throw new Error(i18n.t('errors.signUpFailed'))
    set({ status: 'authenticated', user: toUser(data.user) })
  },

  signOut: async () => {
    try {
      await authClient.signOut()
    } catch {
      // 网络异常时也允许本地退出
    }
    await clearAuthToken()
    set({ status: 'anonymous', user: null })
  },

  updateName: async (name) => {
    const { error } = await authClient.updateUser({ name })
    if (error) throw new Error(errorMessage(error))
    set((state) => ({ user: state.user ? { ...state.user, name } : state.user }))
  },

  changePassword: async (currentPassword, newPassword) => {
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false
    })
    if (error) throw new Error(errorMessage(error))
  },

  deleteAccount: async (password) => {
    const { error } = await authClient.deleteUser({ password })
    if (error) throw new Error(errorMessage(error))
    await clearAuthToken()
    set({ status: 'anonymous', user: null })
  }
}))
