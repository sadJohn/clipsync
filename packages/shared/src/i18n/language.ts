/** 语言设置项；system 表示跟随系统语言 */
export const LANGS = ['system', 'zh-CN', 'en-US'] as const

export type Language = (typeof LANGS)[number]

/** 实际生效的语言，system 会先解析成具体语言 */
export type ResolvedLanguage = Exclude<Language, 'system'>

/**
 * 把设置里的语言选项解析成实际使用的语言。
 * system 时按系统 / 浏览器语言判断：中文环境用 zh-CN，其余用 en-US。
 */
export function resolveLanguage(language: Language, systemLocale: string): ResolvedLanguage {
  if (language !== 'system') return language
  return systemLocale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}
