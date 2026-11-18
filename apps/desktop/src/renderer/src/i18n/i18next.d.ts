import 'i18next'
import type enUS from './en-US'

/** 让 t() 的 key 获得补全与类型校验，语言包缺 key 时在编译期报错 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof enUS
    }
  }
}
