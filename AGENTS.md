# AGENTS.md

ClipSync 是 pnpm + Turborepo monorepo：Electron 桌面端（本地优先 + 云端同步）、NestJS 后端、共享类型包。本文件面向后续开发 Agent，只记录代码中看不出来的约束。

## 常用命令

```bash
pnpm install                                  # 自动 electron-rebuild better-sqlite3
pnpm dev                                      # shared watch + server + desktop 一起启动
pnpm build                                    # 按依赖顺序构建全部工作区
pnpm typecheck                                # 全部工作区类型检查
pnpm lint                                     # 全部工作区 ESLint（共享配置）
pnpm format                                   # Prettier 格式化（单引号、无分号、2 空格）
pnpm --filter @clipsync/shared build          # 改 shared 后必须执行
pnpm --filter @clipsync/server prisma:push    # 同步 schema 到云端 PostgreSQL
```

不要给命令加 `#` 注释，zsh 默认不识别交互式注释，会把注释词当成 turbo 的 task 名。

## 硬性约束

- `@clipsync/shared` 的消费方读取 `dist`。修改 `packages/shared/src` 后，必须先 `pnpm --filter @clipsync/shared build`，否则 desktop / server 的类型和运行产物不会更新。
- `better-sqlite3` 只能在 Electron 主进程使用，严禁在 renderer / preload 中导入。electron-vite 6 用 `build.externalizeDeps` 保持外部化（`externalizeDepsPlugin` 已弃用）；`postinstall` 会执行 `electron-rebuild`。
- 渲染进程 Origin：开发态为 `http://localhost:5173`，生产态为自定义协议 `app://clipsync`（`src/main/index.ts` 中注册并加载）。服务端 `trustedOrigins` / CORS / Socket.IO 共用 [trusted-origins.ts](apps/server/src/auth/trusted-origins.ts) 白名单，新增来源要同步修改。
- 服务端关闭了 Nest 全局 `bodyParser`，Better Auth 需要自行读取原始请求体，不要改回默认值。
- 服务端是 ESM：`package.json` 为 `type: module`，相对导入必须带 `.js` 后缀。
- 认证使用 Better Auth 的 bearer 插件。桌面端 Token 由 [auth-client.ts](apps/desktop/src/renderer/src/lib/auth-client.ts) 从响应头 `set-auth-token` 捕获，经 IPC 交给主进程用 `safeStorage` 加密后写入 `userData/auth-token.bin`（[auth-token-store.ts](apps/desktop/src/main/services/auth-token-store.ts)）；渲染进程只在内存中缓存（[auth-token.ts](apps/desktop/src/renderer/src/lib/auth-token.ts)），严禁明文写入 localStorage。不要改成 cookie 方案。
- 本地 SQLite 文件为 `app.getPath('userData')/clipsync-local.db`，表 `local_clips` 由 [schema.ts](apps/desktop/src/main/db/schema.ts) 定义；所有数据库访问都在主进程。
- 新增 IPC 通道时需同时改四处：`packages/shared/src/constants/ipc.ts` 的 `IpcChannels`、`src/main/ipc/index.ts` 的 handler、`src/preload/index.ts` 的 `window.api`、renderer 中的调用与类型。
- 桌面端设计为托盘常驻：窗口启动不自动展示，`Alt+V`（macOS `Option+V`）或托盘图标呼出，失焦 / Esc 隐藏，关闭只隐藏不退出，macOS 隐藏 Dock 图标。不要改回普通窗口。
- 样式使用 Tailwind CSS v4（CSS-first，无 `tailwind.config.js`）+ 手写 shadcn/ui 组件（`src/renderer/src/components/ui`），路径别名为 `@/*`。不要运行 `shadcn` CLI 重新初始化，以免覆盖主题与别名。
- `apps/server/.env` 含真实密钥，已被 gitignore，禁止输出或提交。
- 桌面端 `dependencies` 只保留 `better-sqlite3`：其余依赖均被 Vite 打进产物，放 `devDependencies` 可避免 electron-builder 重复打包。新增原生模块时，必须同时加入 [electron-builder.yml](apps/desktop/electron-builder.yml) 的 `asarUnpack`。打包产物在 `apps/desktop/release/`（已 gitignore），`pack:dir` 用于快速验证，`dist:mac` / `dist:win` 生成安装包且需在对应平台执行；`dist:*` 会先执行 `check:server-url` 预检 `VITE_SERVER_URL`。
- Lint / 格式化是共享配置：规则在 [packages/eslint-config](packages/eslint-config)（导出 `@clipsync/eslint-config` 与 `@clipsync/eslint-config/react`），各 workspace 只保留一个 `eslint.config.mjs` 引用它；Prettier 配置在根 `.prettierrc.json`。新增 package 时复用共享配置，不要各自安装一套 ESLint 插件。
- 发布走 [.github/workflows/release.yml](.github/workflows/release.yml)：推送 `v*` tag 触发 macOS / Windows 打包并上传 Release，依赖仓库变量 `VITE_SERVER_URL`；`workflow_dispatch` 只构建不上传。

## 数据与同步链路

1. 主进程 `ClipboardWatcher` 轮询剪贴板 → 写入本地 SQLite → IPC `clipboard:new` 通知渲染进程。
2. 登录后渲染进程将 `isSynced = false` 的记录 `POST /api/clips`，成功后 IPC 标记已同步。
3. Socket.IO 以 `user:${userId}` 房间广播 `sync:new-clip` / `sync:delete-clip`；渲染进程收到后通过 `local-clips:upsert-remote` 写入本地，`isSynced` 为 true。
4. 服务端的 HTTP 删除也会广播给包括发起方在内的所有客户端，本地删除逻辑需保持幂等。

## 验证

```bash
pnpm typecheck && pnpm build
curl http://localhost:3000/api/health
printf 'smoke' | pbcopy   # 桌面端运行中，几秒后应出现在列表
sqlite3 "$HOME/Library/Application Support/ClipSync/clipsync-local.db" \
  "select content, is_synced from local_clips order by created_at desc limit 3;"
```

涉及 Electron 界面的改动，启动应用后按 `Option+V` 手动确认；窗口默认隐藏属于预期行为。
