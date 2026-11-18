import type { ClipItemDto } from '@clipsync/shared'
import i18n from '@/i18n'
import { getAuthToken } from './auth-token'
import { SERVER_URL } from './server'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken()
  if (!token) {
    throw new ApiError(i18n.t('errors.notSignedIn'), 401)
  }

  const response = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  })

  if (!response.ok) {
    let message = i18n.t('errors.requestFailed', { status: response.status })
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join('，')
      else if (body.message) message = body.message
    } catch {
      // 响应体不是 JSON 时使用默认文案
    }
    console.warn(`[api] ${init?.method ?? 'GET'} ${path} -> ${response.status}`, message)
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export const clipsApi = {
  list: () => request<ClipItemDto[]>('/api/clips?limit=200'),
  create: (clip: ClipItemDto) =>
    request<ClipItemDto>('/api/clips', {
      method: 'POST',
      body: JSON.stringify(clip)
    }),
  updatePin: (id: string, isPinned: boolean) =>
    request<ClipItemDto>(`/api/clips/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned })
    }),
  remove: (id: string) =>
    request<{ id: string }>(`/api/clips/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  /** 上报一次使用，仅刷新服务端的 lastUsedAt，用于多端共享保留期 */
  use: (id: string) =>
    request<{ id: string; lastUsedAt: string }>(`/api/clips/${encodeURIComponent(id)}/use`, {
      method: 'POST'
    })
}
