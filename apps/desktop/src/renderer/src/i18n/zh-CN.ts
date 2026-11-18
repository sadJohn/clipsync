import type enUS from './en-US'

/** 简体中文语言包；用英文包约束结构，避免漏翻 key */
const zhCN: typeof enUS = {
  app: {
    localMode: '本地模式 · 登录后多设备同步',
    login: '登录',
    logout: '退出',
    settings: '设置',
    searchPlaceholder: '搜索剪贴板内容…',
    syncFailed: '新剪贴板内容同步失败',
    emptyNoMatch: '没有匹配的记录',
    emptyHint: '复制一段文本，就会自动出现在这里',
    emptyShortcut: '按 {{accelerator}} 随时呼出窗口',
    footerShortcut: '{{accelerator}} 呼出',
    footerCount_one: '{{count}} 条记录',
    footerCount_other: '{{count}} 条记录'
  },
  filters: {
    all: '全部',
    text: '文本',
    code: '代码',
    link: '链接'
  },
  clipTypes: {
    TEXT: '文本',
    CODE: '代码',
    IMAGE: '图片',
    LINK: '链接'
  },
  clip: {
    synced: '已同步',
    localOnly: '仅本地',
    pin: '置顶记录',
    unpin: '取消置顶',
    delete: '删除记录',
    pinFailed: '置顶操作失败，请重试',
    deleteFailed: '删除失败，请重试',
    confirmDeleteTitle: '删除置顶记录？',
    confirmDeleteDescription: '删除后无法恢复，并会同步从云端及其他设备移除。',
    cancel: '取消'
  },
  auth: {
    signInTitle: '登录 ClipSync',
    signUpTitle: '创建账号',
    description: '登录后本地记录会自动同步到云端，并在多台设备间实时推送。',
    signInTab: '登录',
    signUpTab: '注册',
    namePlaceholder: '昵称',
    emailPlaceholder: '邮箱',
    passwordPlaceholder: '密码（至少 8 位）',
    submitting: '请稍候…',
    submitSignIn: '登录',
    submitSignUp: '注册并登录',
    signInSuccess: '登录成功',
    signUpSuccess: '注册成功，已自动登录',
    actionFailed: '操作失败'
  },
  settings: {
    title: '设置',
    tabs: {
      general: '通用',
      account: '账号',
      about: '关于'
    },
    autoLaunch: {
      label: '开机自启',
      description: '登录系统后自动启动 ClipSync'
    },
    shortcut: {
      label: '呼出快捷键',
      description: '在任意应用中呼出或隐藏悬浮窗'
    },
    hideDelay: {
      label: '失焦隐藏',
      description: '悬浮窗失去焦点后延迟收起'
    },
    autoSync: {
      label: '自动同步',
      description: '新复制的剪贴板内容自动上传到云端'
    },
    maxClips: {
      label: '最多显示',
      description: '列表中最多展示的记录数，超出部分不再显示'
    },
    cleanup: {
      label: '自动清理',
      description: '删除超过设定天数未使用的记录'
    },
    theme: {
      label: '主题',
      description: '切换界面配色，跟随系统时自动适配'
    },
    language: {
      label: '语言',
      description: '切换界面语言，跟随系统时自动适配'
    },
    options: {
      immediate: '立即',
      seconds: '{{count}} 秒',
      never: '永不',
      days_one: '{{count}} 天',
      days_other: '{{count}} 天',
      themeSystem: '跟随系统',
      themeLight: '浅色',
      themeDark: '深色',
      languageSystem: '跟随系统',
      languageZh: '中文',
      languageEn: 'English'
    },
    shortcutCapture: {
      press: '按下组合键…',
      hint: '请按下包含修饰键（⌘ / Ctrl / Alt / Shift）的组合'
    },
    account: {
      notSignedIn: '未登录',
      notSignedInDescription: '在悬浮窗中登录后，可在此查看账号信息。'
    },
    about: {
      autoUpdate: {
        label: '自动更新',
        description: '启动时自动检查并下载新版本'
      },
      check: '检查更新',
      checking: '检查中…',
      currentVersion: '当前版本 v{{version}}',
      description: '本地优先的剪贴板历史工具，登录后可跨设备同步。'
    },
    update: {
      checking: '正在检查更新…',
      available: '发现新版本 {{version}}，正在下载…',
      availableNoVersion: '发现新版本，正在下载…',
      downloading: '正在下载新版本（{{percent}}%）',
      downloadingWithVersion: '正在下载新版本 {{version}}（{{percent}}%）',
      downloaded: '新版本已下载，退出应用后自动安装',
      downloadedWithVersion: '新版本 {{version}} 已下载，退出应用后自动安装',
      upToDate: '当前已是最新版本',
      error: '检查更新失败：{{message}}',
      errorUnknown: '检查更新失败',
      unsupported: '当前运行方式不支持检查更新'
    },
    saveFailed: '设置操作失败，请稍后重试',
    pushPendingFailed: '补传本地记录失败，请稍后重试'
  },
  errors: {
    operationFailed: '操作失败，请稍后重试',
    signInFailed: '登录失败，请检查邮箱与密码',
    signUpFailed: '注册失败，请稍后重试',
    notSignedIn: '尚未登录',
    requestFailed: '请求失败 ({{status}})',
    syncFailedCount_one: '{{count}} 条本地记录同步失败，请稍后重试',
    syncFailedCount_other: '{{count}} 条本地记录同步失败，请稍后重试',
    cloudSyncFailed: '云端同步失败，请检查网络后重试'
  },
  common: {
    close: '关闭'
  }
}

export default zhCN
