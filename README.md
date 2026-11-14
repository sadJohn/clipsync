# ClipSync

跨端剪贴板与灵感碎片管理器：Electron 桌面端常驻系统托盘，自动记录本地剪贴板；登录后与云端 PostgreSQL 同步，并通过 Socket.IO 在多设备间实时推送。

## 技术栈

- **Monorepo**：pnpm workspace + Turborepo
- **桌面端** `apps/desktop`：electron-vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Zustand + better-sqlite3 + Drizzle ORM
- **云端服务** `apps/server`：NestJS + Prisma + 云端 PostgreSQL + Better Auth + Socket.IO
- **共享包** `packages/shared`：DTO、IPC 通道、Socket 事件与 Zod Schema（ESM + CJS + d.ts）

## 目录结构

```text
clipsync/
├── apps/
│   ├── desktop/          # Electron 桌面客户端
│   │   ├── resources/    # 托盘图标
│   │   └── src/
│   │       ├── main/     # 主进程：本地 SQLite、托盘、快捷键、剪贴板监听、IPC
│   │       ├── preload/  # contextBridge 暴露类型安全的 window.api
│   │       └── renderer/ # React 界面与云同步逻辑
│   └── server/           # NestJS 云端服务
│       ├── prisma/       # PostgreSQL 数据模型
│       └── src/          # auth / clips / sync / prisma
├── packages/shared/      # 跨端共享类型与常量
└── README.md
```

## 环境要求

- Node.js >= 20
- pnpm >= 9
- 可访问的云端 PostgreSQL（Neon / Supabase / 阿里云 RDS 等）
- macOS / Windows / Linux 桌面环境

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

安装过程中会自动为 Electron 重建 `better-sqlite3` 原生模块。

### 2. 配置云端服务环境变量

```bash
cp apps/server/.env.example apps/server/.env
```

编辑 `apps/server/.env`：

```dotenv
# 云端 PostgreSQL 连接串（必须带 sslmode=require 的云库请保留该参数）
DATABASE_URL="postgresql://user:password@host:5432/clipsync?sslmode=require"

# Session / Token 签名密钥，填入足够长的随机字符串
BETTER_AUTH_SECRET="请替换为随机密钥"

# 云端服务对外地址，本地开发保持默认
BETTER_AUTH_URL="http://localhost:3000"

PORT=3000

# 额外允许的跨域来源，逗号分隔（默认已包含 5173 与 app://clipsync）
TRUSTED_ORIGINS="http://localhost:5173"
```

`apps/server/.env` 已被 `.gitignore` 忽略，请勿提交真实密钥。

### 3. 初始化数据库

```bash
# 生成 Prisma Client
pnpm --filter @clipsync/server prisma:generate

# 将 schema 推送到云端 PostgreSQL（含 Better Auth 表与 ClipItem 表）
pnpm --filter @clipsync/server prisma:push
```

### 4. 启动后端

```bash
pnpm --filter @clipsync/server dev
```

默认监听 `http://localhost:3000`，健康检查：

```bash
curl http://localhost:3000/api/health
```

### 5. 启动桌面端

另开一个终端：

```bash
pnpm --filter @clipsync/desktop dev
```

也可以从根目录同时拉起共享包 watch、后端与桌面端：

```bash
pnpm dev
```

> 桌面端默认不显示窗口，只驻留系统托盘。按 `Option+V`（macOS）或 `Alt+V`（Windows/Linux）呼出悬浮窗，点击菜单栏 / 托盘图标也可以切换显示。

## 使用说明

1. 启动后复制任意文本，内容会自动写入本地 SQLite 并出现在列表中。
2. 点击卡片会把内容写回系统剪贴板并隐藏窗口；卡片右上角可删除记录。
3. 点击右上角「登录」注册或登录账号：
   - 登录后，本地未同步记录会自动上传云端；
   - 云端历史会自动拉取到本地；
   - 其他设备新增 / 删除记录会通过 Socket.IO 实时推送到本机。
4. 未登录时完全离线可用，记录标记为「仅本地」。

本地数据库位置：

- macOS：`~/Library/Application Support/ClipSync/clipsync-local.db`
- Windows：`%APPDATA%/ClipSync/clipsync-local.db`
- Linux：`~/.config/ClipSync/clipsync-local.db`

## 生产构建

```bash
# 构建全部（shared -> server -> desktop）
pnpm build

# 预览已构建的桌面端
pnpm --filter @clipsync/desktop start

# 启动已构建的后端
pnpm --filter @clipsync/server start
```

构建后的桌面端通过 `app://clipsync` 协议加载页面，后端已将该来源加入 CORS 白名单。

### 生成安装包

```bash
# 仅生成未压缩的 .app（本地验证，最快）
pnpm --filter @clipsync/desktop pack:dir

# 生成对应平台安装包，产物在 apps/desktop/release/
pnpm --filter @clipsync/desktop dist:mac
pnpm --filter @clipsync/desktop dist:win
pnpm --filter @clipsync/desktop dist:linux
```

打包前注意：

- `apps/desktop/.env` 中的 `VITE_SERVER_URL` 会被打进产物，分享给别人前需指向云端后端；`dist:*` 脚本会先执行 `check:server-url` 预检，缺失、指向 localhost 或末尾带斜杠时直接中止
- `better-sqlite3` 是原生模块，需在目标平台上构建（Windows 包在 Windows 上打），并在 `electron-builder.yml` 中保持 `asarUnpack`
- 未签名 / 未公证的 macOS 包在别人机器上会被 Gatekeeper 拦截，需右键「打开」；正式分发需 Apple Developer ID + notarize
- 应用图标为 `resources/icon-1024.png`，托盘图标为 `resources/icon.png`（含 `@2x`）

## 部署后端

后端是长驻服务并依赖 Socket.IO，推荐部署到 Render Web Service（不建议 Vercel Serverless）。完整步骤见 [docs/deploy-render.md](docs/deploy-render.md)。

## 发布到 GitHub Releases

仓库内置工作流 [.github/workflows/release.yml](.github/workflows/release.yml)：推送 `v*` tag 时，在 macOS 与 Windows runner 上分别打包并上传安装包。

使用前：

1. 在仓库 **Settings → Secrets and variables → Actions → Variables** 添加 `VITE_SERVER_URL`，值为线上后端地址（会被打进安装包）
2. 推送 tag 触发构建：

```bash
git tag v0.1.0
git push origin v0.1.0
```

产物：macOS `.dmg` / `.zip`，Windows `.exe`，自动挂到对应 Release 下。

未配置签名证书时，macOS 包在别人机器上会被 Gatekeeper 拦截（需右键打开），Windows 会出现 SmartScreen 提示；正式分发需补充 Apple Developer ID 公证与 Windows 代码签名。

## 验证清单

```bash
# 1. 类型检查（全部工作区）
pnpm typecheck

# 2. 全量构建
pnpm build

# 3. 后端健康检查
curl http://localhost:3000/api/health

# 4. 剪贴板入库（桌面端运行中）
printf 'clipsync smoke test' | pbcopy   # Windows 使用 clip，Linux 使用 xclip
sqlite3 "$HOME/Library/Application Support/ClipSync/clipsync-local.db" \
  "select content, type, is_synced from local_clips order by created_at desc limit 1;"

# 5. 登录后同步：复制新文本，上述查询中 is_synced 应为 1
```

## 常用命令

| 命令                                         | 说明                                |
| -------------------------------------------- | ----------------------------------- |
| `pnpm dev`                                   | 同时启动 shared watch、后端与桌面端 |
| `pnpm build`                                 | 构建全部工作区                      |
| `pnpm typecheck`                             | 全部工作区类型检查                  |
| `pnpm lint`                                  | 全部工作区 ESLint 检查（共享配置）  |
| `pnpm format`                                | Prettier 格式化（单引号、无分号）   |
| `pnpm --filter @clipsync/shared build`       | 单独构建共享包                      |
| `pnpm --filter @clipsync/server prisma:push` | 同步 Prisma schema 到云端数据库     |
| `pnpm --filter @clipsync/desktop dev`        | 以开发模式启动桌面端                |
| `pnpm --filter @clipsync/desktop start`      | 启动已构建的桌面端                  |

## 常见问题

- **`turbo` 报 `Could not find task`**：命令里不要带 `#` 注释，直接执行 `pnpm dev`。
- **登录 / 同步失败**：确认后端已启动、`DATABASE_URL` 可连接、`apps/server/.env` 中 `BETTER_AUTH_SECRET` 已填写。
- **`better-sqlite3` 报 ABI 不匹配**：执行 `pnpm --filter @clipsync/desktop exec electron-rebuild -f -w better-sqlite3`，或重新 `pnpm install`。
- **快捷键无响应**：`Option+V` / `Alt+V` 可能被其他应用占用，可点击托盘图标呼出。
