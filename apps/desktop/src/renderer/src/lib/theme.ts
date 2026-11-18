import type { Theme } from '@clipsync/shared'

const media = window.matchMedia('(prefers-color-scheme: dark)')

let stopListening: (() => void) | null = null

/**
 * 把主题写到根元素 data-theme，CSS 变量据此切换。
 * system 模式跟随系统并监听变化。
 */
export function applyTheme(theme: Theme): void {
  stopListening?.()
  stopListening = null

  const apply = (): void => {
    const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    document.documentElement.dataset.theme = resolved
  }

  apply()

  if (theme === 'system') {
    media.addEventListener('change', apply)
    stopListening = () => media.removeEventListener('change', apply)
  }
}
