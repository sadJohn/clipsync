import type { ClipboardApi } from '../../preload'

declare global {
  interface Window {
    api: ClipboardApi
  }
}

export {}
