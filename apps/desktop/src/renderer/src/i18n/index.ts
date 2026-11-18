import { resolveLanguage, type Language } from '@clipsync/shared'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from './en-US'
import zhCN from './zh-CN'

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS }
  },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: {
    // React 会自动转义，无需 i18next 再处理
    escapeValue: false
  }
})

/**
 * 应用语言设置。
 * system 时按浏览器 / 系统语言解析，并同步 <html lang> 便于字体与无障碍工具选择语言。
 */
export function applyLanguage(language: Language): void {
  const resolved = resolveLanguage(language, navigator.language)
  if (i18n.language !== resolved) {
    void i18n.changeLanguage(resolved)
  }
  document.documentElement.lang = resolved
}

export default i18n
