# TODO

---

## 一期：设置基础设施 + 核心功能 ✅

### 设置基础设施 ✅

1. **`@clipsync/shared` 定义 Settings 类型 + IPC 通道** ✅
   - 新增 `Settings` 接口（见下方分期设置项）
   - `IpcChannels` 增加 `SETTINGS_GET` / `SETTINGS_SET` / `SETTINGS_OPEN`

2. **主进程 SettingsStore** ✅
   - `src/main/services/settings-store.ts`
   - 读写路径：`app.getPath('userData')/settings.json`
   - 默认值合并（缺失字段填默认值）
   - 提供 `getSettings()` / `setSettings(patch)` 方法

3. **preload + IPC 链路** ✅
   - `src/main/ipc/index.ts` 注册 handler
   - `src/preload/index.ts` 暴露 `window.api.getSettings` / `window.api.setSettings`
   - 渲染进程类型声明同步

4. **设置窗口** ✅
   - `src/main/window.ts` 或独立 `src/main/services/settings-window.ts`
   - 单例复用（首次创建，后续 focus）
   - 窗口属性：可调大小、有 frame、有 Dock、不失焦隐藏、可移动
   - 推荐尺寸：560 × 640

5. **设置入口** ✅
   - Tray 右键菜单加「设置…」项 → 调用 `openSettingsWindow()`
   - 主窗口 header 右侧加齿轮图标（同一路径打开）

6. **渲染进程设置页面** ✅
   - `src/renderer/src/store/settings-store.ts`（zustand）
   - `src/renderer/src/pages/settings-page.tsx`
   - Tab 或分节：通用 / 账号 / 关于

### 设置项：一期 ✅

7. **开机自启** ✅
   - 主进程调用 `app.setLoginItemSettings({ openAtLogin })`
   - Settings 字段：`autoLaunch: boolean`（默认 `false`）
   - UI：Switch

8. **全局快捷键自定义** ✅
   - 当前硬编码 `Alt+V`（`shortcut-manager.ts`）
   - Settings 字段：`toggleAccelerator: string`（默认 `"Alt+V"`）
   - 修改流程：`unregisterAll()` → 读取新 accelerator → `register()` → 失败回滚
   - UI：按键录制 + electron accelerator 格式校验 + 冲突检测
   - 实现说明：录制期间主进程会挂起全局快捷键，避免按键直接切换窗口

9. **失焦隐藏延迟** ✅
   - 当前 `window.ts` blur 立即 hide
   - Settings 字段：`hideDelayMs: number`（默认 `0`，即立即）
   - 主进程 blur 改为 `setTimeout(hide, hideDelayMs)` + 再 show 时 `clearTimeout`
   - UI：Slider 或数字输入，建议 0 / 1000 / 3000 / 5000 档位

10. **检查更新** ✅
    - 安装 `electron-updater`
    - `electron-builder.yml` 配 publish provider（GitHub Releases）
    - 主进程 `src/main/services/updater.ts` 封装 `autoUpdater`，发送状态事件到 renderer
    - 设置页加「检查更新」按钮 + 版本信息 + 自动更新开关
    - Settings 字段：`autoUpdate: boolean`（默认 `true`）

---

## 二期：体验增强 ✅

11. **清理策略可配** ✅
    - 当前 clip-store 硬编码 `MAX_CLIPS = 500`
    - `purgeExpiredClips` 超期逻辑也需暴露
    - Settings 字段：`maxClips: number`（默认 `500`）、`expireDays: number`（默认 `30`，`0` 表示永不超期）
    - 设置变更后触发一次清理
    - 实现说明：`maxClips` 作为列表展示上限；修改 `maxClips` / `expireDays` 后立即触发一次过期清理

12. **自动同步新剪贴板开关** ✅
    - 当前 `App.tsx` 中 `pushClip` 无条件调用
    - Settings 字段：`autoSyncNewClip: boolean`（默认 `true`）
    - 关闭时本地记录 `isSynced = false`，后续手动触发
    - 实现说明：重新开启开关时自动补传关闭期间积压的未同步记录

13. **主题** ✅
    - Settings 字段：`theme: 'light' | 'dark' | 'system'`（默认 `'system'`）
    - renderer 根元素 `data-theme` 属性切换 CSS 变量
    - system 模式监听 `matchMedia('(prefers-color-scheme: dark)')`
    - 主进程无需参与（纯 renderer 侧）

---

## 三期：国际化 ✅

14. **中英文切换** ✅
    - Settings 字段：`language: 'system' | 'zh-CN' | 'en-US'`（默认 `'system'`）
    - 依赖 `i18next` + `react-i18next`，语言包在 `src/renderer/src/i18n/`
    - `system` 时渲染进程用 `navigator.language`、主进程用 `app.getLocale()` 解析
    - 设置页「通用」可切换；托盘菜单、tooltip 与设置窗口标题随语言变化重建

---

## 四期：账号 + 远期

15. **账号设置**
    - 改昵称：Better Auth `updateUser()` ✅ 默认支持
    - 改密码：Better Auth `changePassword()` ✅ 默认支持
    - 退出登录：已有 signOut
    - 删除账号：需加 `account-deletion` 插件
    - 改邮箱 / 忘记密码：需加 `email-verification` 插件（发验证邮件）—— 远期

16. **跳过特定应用的剪贴板**（远期）
    - 主进程 `ClipboardWatcher` 需读当前前台 app bundle id
    - macOS：`NSWorkspace`（ObjC bridge 或 electron 原生能力）
    - Windows：需另查方式
    - 代价较高，暂缓

---