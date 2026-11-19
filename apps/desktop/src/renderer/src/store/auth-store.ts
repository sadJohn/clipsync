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
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (email: string, otp: string, password: string) => Promise<void>
  requestEmailChange: (newEmail: string) => Promise<void>
  changeEmail: (newEmail: string, otp: string) => Promise<void>
}

type AuthErrorKey =
  | 'errors.invalidCredentials'
  | 'errors.invalidEmail'
  | 'errors.invalidPassword'
  | 'errors.passwordTooShort'
  | 'errors.userAlreadyExists'
  | 'errors.invalidOtp'
  | 'errors.otpExpired'
  | 'errors.tooManyAttempts'
  | 'errors.emailNotVerified'
  | 'errors.accountNotFound'
  | 'errors.sessionExpired'
  | 'errors.bannedUser'

/** Better Auth 返回的 message 是英文，按 code 映射到当前语言的提示 */
const AUTH_ERROR_KEYS: Record<string, AuthErrorKey> = {
  INVALID_EMAIL_OR_PASSWORD: 'errors.invalidCredentials',
  INVALID_EMAIL: 'errors.invalidEmail',
  INVALID_PASSWORD: 'errors.invalidPassword',
  PASSWORD_TOO_SHORT: 'errors.passwordTooShort',
  USER_ALREADY_EXISTS: 'errors.userAlreadyExists',
  INVALID_OTP: 'errors.invalidOtp',
  OTP_EXPIRED: 'errors.otpExpired',
  TOO_MANY_ATTEMPTS: 'errors.tooManyAttempts',
  EMAIL_NOT_VERIFIED: 'errors.emailNotVerified',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'errors.accountNotFound',
  SESSION_EXPIRED: 'errors.sessionExpired',
  BANNED_USER: 'errors.bannedUser'
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && AUTH_ERROR_KEYS[code]) {
      return i18n.t(AUTH_ERROR_KEYS[code])
    }
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
  },

  requestPasswordReset: async (email) => {
    const { error } = await authClient.emailOtp.requestPasswordReset({ email })
    if (error) throw new Error(errorMessage(error))
  },

  resetPassword: async (email, otp, password) => {
    const { error } = await authClient.emailOtp.resetPassword({ email, otp, password })
    if (error) throw new Error(errorMessage(error))
  },

  requestEmailChange: async (newEmail) => {
    const { error } = await authClient.emailOtp.requestEmailChange({ newEmail })
    if (error) throw new Error(errorMessage(error))
  },

  changeEmail: async (newEmail, otp) => {
    const { error } = await authClient.emailOtp.changeEmail({ newEmail, otp })
    if (error) throw new Error(errorMessage(error))
    set((state) => ({ user: state.user ? { ...state.user, email: newEmail } : state.user }))
  }
}))
