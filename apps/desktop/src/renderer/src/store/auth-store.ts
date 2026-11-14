import { create } from 'zustand'
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
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return '操作失败，请稍后重试'
}

function toUser(user: { id: string; name: string; email: string }): AuthUser {
  return { id: user.id, name: user.name, email: user.email }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  init: async () => {
    if (!getAuthToken()) {
      set({ status: 'anonymous', user: null })
      return
    }

    try {
      const { data, error } = await authClient.getSession()
      if (error || !data?.user) {
        clearAuthToken()
        set({ status: 'anonymous', user: null })
        return
      }
      set({ status: 'authenticated', user: toUser(data.user) })
    } catch {
      clearAuthToken()
      set({ status: 'anonymous', user: null })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await authClient.signIn.email({ email, password })
    if (error) throw new Error(errorMessage(error))
    if (!data?.user) throw new Error('登录失败，请检查邮箱与密码')
    set({ status: 'authenticated', user: toUser(data.user) })
  },

  signUp: async (name, email, password) => {
    const { data, error } = await authClient.signUp.email({ name, email, password })
    if (error) throw new Error(errorMessage(error))
    if (!data?.user) throw new Error('注册失败，请稍后重试')
    set({ status: 'authenticated', user: toUser(data.user) })
  },

  signOut: async () => {
    try {
      await authClient.signOut()
    } catch {
      // 网络异常时也允许本地退出
    }
    clearAuthToken()
    set({ status: 'anonymous', user: null })
  },
}))
