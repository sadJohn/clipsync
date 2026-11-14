# 项目初始化规范文档：ClipSync（跨端剪贴板与灵感碎片管理器）

> **致 AI Agent 的执行指令：**
> 你正在协助开发者从零初始化一个名为 `ClipSync` 的全栈桌面应用项目。
> 请严格遵循本文档的**技术栈选型、目录结构、架构避坑规范及分步执行计划**来搭建项目脚手架。在安装依赖或编写配置时，请确保各子包之间的 TypeScript 类型引用、ESM/CJS 兼容性及原生依赖构建完全正确。

---

## 1. 项目概述与核心架构

- **项目定位**：一款支持全局快捷键呼出、系统托盘常驻、自动监听本地剪贴板（文本/图片）、支持本地离线存储与云端多设备实时同步的跨端剪贴板工具。
- **仓库形态**：基于 `pnpm workspace` + `Turborepo` 的 Monorepo。
- **离线优先（Local-First）数据流**：
  1. `apps/desktop`（Electron 主进程）监听系统剪贴板变化后，**第一时间写入本地 SQLite 数据库**，并通过 IPC 通知 React 渲染进程立即更新 UI（保证离线可用与零延迟体验）。
  2. 若当前已登录且网络畅通，渲染进程/主进程将新条目推送至云端 NestJS 接口。
  3. `apps/server`（NestJS 云端服务）验证 Better Auth 会话，将数据持久化至云端 PostgreSQL，并通过 Socket.IO 向同一 `userId` 房间内的其他在线客户端广播同步事件。

---

## 2. 强制技术栈选型

- **包管理器 & 构建编排**：`pnpm` (>= 9.x) + `turborepo`
- **共享包 (`packages/shared`)**：纯 TypeScript 编写，使用 `tsup` 打包导出（同时生成 ESM/CJS 及 `.d.ts` 类型文件，防止 Electron 主进程与 NestJS 出现模块格式冲突）+ `zod`（共享表单与接口校验）。
- **桌面端 (`apps/desktop`)**：
  - 脚手架：`electron-vite` (React + TypeScript 模板)
  - UI 组件与样式：`Tailwind CSS` + `shadcn/ui` + `lucide-react`
  - 状态管理：`zustand`
  - 本地数据库：`better-sqlite3`（或 `@libsql/client`）+ `drizzle-orm`（用于本地剪贴板历史缓存、离线待同步队列与本地设置存储）
  - 认证客户端：`better-auth/react`（对接云端 Better Auth 接口）
  - 实时通信：`socket.io-client`
- **云端服务 (`apps/server`)**：
  - 框架：`NestJS` (TypeScript)
  - 云端数据库：`PostgreSQL` + `Prisma`（直接连接云端 PostgreSQL，通过 `apps/server/.env` 中的 `DATABASE_URL` 配置，不提供本地 Docker 容器）
  - 认证体系：`better-auth`（配合 `@thallesp/nestjs-better-auth` 或官方 Node/Express 适配器挂载到 `/api/auth/*`，使用 Prisma Adapter 持久化用户与 Session）
  - 实时通信：`@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io`

---

## 3. 关键技术集成与避坑规范（Agent 必读）

1. **Better Auth 与 NestJS 集成规范**：
   - 在 `apps/server/src/main.ts` 中，**必须禁用或延后全局 `bodyParser` 对 `/api/auth/*` 路由的接管**（Better Auth 需要自行解析原始请求体，否则会导致登录/注册接口挂起或报错）。
   - Better Auth 的数据库表（`user`, `session`, `account`, `verification`）通过 Better Auth CLI (`npx @better-auth/cli generate`) 生成至 `apps/server/prisma/schema.prisma` 中，与业务表 `ClipItem` 共用同一个 Prisma Client。
   - 桌面端（Electron 渲染进程）通过 `createAuthClient({ baseURL: 'http://localhost:3000' })` 连接后端；需注意在 Electron 中配置 CORS 的 `trustedOrigins`（包含 `http://localhost:5173` 及 `app://.` 等协议）以及支持 Bearer Token 插件（`bearer()`）以便在桌面端跨源环境下稳定传递凭证。
2. **Electron 本地 SQLite (`better-sqlite3`) 规范**：
   - `better-sqlite3` 属于 C++ 原生模块，**只能在 Electron 主进程 (`src/main`) 中运行**，严禁在渲染进程 (`src/renderer`) 中直接导入。
   - 在 `apps/desktop/package.json` 中配置 `postinstall` 脚本执行 `electron-rebuild -f -w better-sqlite3`（或通过 `electron-vite` 的 `externalizeDepsPlugin` 排除打包），确保 Node ABI 版本与 Electron 匹配。
   - 数据库文件存储在 `app.getPath('userData')/clipsync-local.db`。
3. **shadcn/ui 初始化规范**：
   - 在 `apps/desktop` 中配置好 Tailwind CSS 和路径别名（`@/*` 指向 `src/renderer/src/*`），创建 `components.json`，并预装基础高频组件：`button`、`input`、`scroll-area`、`badge`、`tabs`、`dialog`、`sonner`（Toast 提示）。

---

## 4. 目标 Monorepo 目录结构

```text
clipsync-monorepo/
├── apps/
│   ├── desktop/                      # Electron 桌面客户端 (electron-vite)
│   │   ├── resources/
│   │   │   └── icon.png              # 系统托盘占位图标 (16x16 PNG)
│   │   ├── src/
│   │   │   ├── main/                 # Electron 主进程
│   │   │   │   ├── db/               # 本地 SQLite (Drizzle schema & client)
│   │   │   │   ├── services/         # ClipboardWatcher, TrayManager, ShortcutManager
│   │   │   │   ├── ipc/              # IPC 处理器 (读写本地 SQLite、写回剪贴板)
│   │   │   │   └── index.ts
│   │   │   ├── preload/              # contextBridge 暴露类型安全的 window.api
│   │   │   └── renderer/             # React 渲染进程
│   │   │       └── src/
│   │   │           ├── components/ui/# shadcn/ui 组件目录
│   │   │           ├── lib/          # auth-client.ts (Better Auth), socket.ts
│   │   │           ├── store/        # Zustand 状态管理
│   │   │           └── App.tsx
│   │   ├── components.json           # shadcn/ui 配置文件
│   │   ├── electron.vite.config.ts
│   │   └── package.json
│   └── server/                       # NestJS 云端后端
│       ├── prisma/
│       │   └── schema.prisma         # PostgreSQL 模型 (Better Auth 表 + ClipItem)
│       ├── src/
│       │   ├── auth/                 # Better Auth 实例配置、AuthGuard 守卫
│       │   ├── clips/                # 剪贴板条目 CRUD、增量同步接口
│       │   ├── sync/                 # Socket.IO Gateway (按 userId 房间广播)
│       │   ├── prisma/               # PrismaService 全局模块
│       │   └── main.ts
│       └── package.json
├── packages/
│   └── shared/                       # 跨端共享模块 (@clipsync/shared)
│       ├── src/
│       │   ├── types/                # ClipItemDto, SyncStatus, LocalClipRecord
│       │   ├── constants/            # IpcChannels, SocketEvents
│       │   ├── schemas/              # Zod 校验 Schema
│       │   └── index.ts
│       ├── tsup.config.ts
│       ├── tsconfig.json
│       └── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

---

## 5. 核心契约与数据模型规范

### 5.1 共享包 (`@clipsync/shared`)

- `ClipType`：`TEXT` | `CODE` | `IMAGE` | `LINK`
- `ClipItemDto`：
  ```ts
  export interface ClipItemDto {
    id: string; // UUID，客户端本地生成以便离线去重与云端幂等同步
    content: string;
    type: ClipType;
    deviceName: string;
    isPinned: boolean;
    createdAt: string; // ISO 8601 时间字符串
    updatedAt: string;
  }
  ```
- `IpcChannels`：`CLIPBOARD_NEW`、`CLIPBOARD_WRITE`、`GET_LOCAL_CLIPS`、`DELETE_LOCAL_CLIP`、`MARK_CLIP_SYNCED`、`WINDOW_HIDE`
- `SocketEvents`：`SYNC_NEW_CLIP`、`SYNC_DELETE_CLIP`、`SYNC_PIN_CLIP`

### 5.2 本地 SQLite 表结构 (`apps/desktop/src/main/db/schema.ts`)

- 表名 `local_clips`：
  - `id` (text, primaryKey)
  - `content` (text, notNull)
  - `type` (text, notNull)
  - `deviceName` (text, notNull)
  - `isPinned` (integer, boolean mode, default false)
  - `isSynced` (integer, boolean mode, default false) —— 标记是否已成功同步至云端 PostgreSQL
  - `createdAt` (text, notNull)

---

## 6. Agent 分步执行计划（请按阶段逐步执行）

请严格按以下 5 个阶段依次推进，每完成一个阶段请验证编译与依赖无误后再进入下一阶段：

1. **阶段一：初始化 Monorepo 骨架、共享包与基础设施**
   - 创建根目录配置文件（`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`tsconfig.base.json`）。
   - 初始化 `packages/shared`，配置 `tsup` 打包输出与类型导出，编写所有 DTO、IPC 通道常量、Socket.IO 事件常量及 Zod Schema，并执行一次构建确保产物可用。
2. **阶段二：搭建 NestJS 云端服务 (`apps/server`)**
   - 初始化 NestJS，安装 `prisma`、`@prisma/client`、`better-auth`、`@nestjs/websockets`、`@nestjs/platform-socket.io`。
   - 配置 Better Auth（启用 Email/Password 登录与 `bearer` 插件），使用 Better Auth CLI 生成 Prisma Schema，并补充 `ClipItem` 业务模型（关联 `User.id`）。
   - 实现 `ClipsController`（增删查接口）和 `SyncGateway`（Socket.IO 连接时校验 Token 并将客户端加入 `user:${userId}` 房间，收到新剪贴板条目时向同房间其他设备广播）。
3. **阶段三：搭建 Electron 主进程与本地 SQLite (`apps/desktop/src/main`)**
   - 使用 `electron-vite` (React + TS) 初始化 `apps/desktop`。
   - 生成一张 `16x16` 的 PNG 托盘占位图放到 `apps/desktop/resources/icon.png`。
   - 安装 `better-sqlite3` 和 `drizzle-orm`，配置好原生依赖重建，封装本地 SQLite 增删改查服务。
   - 实现系统托盘（`Tray`）、全局快捷键呼出无边框悬浮窗（`Alt+V` / `Option+V`）、剪贴板文本监听服务（新复制内容自动入库 SQLite 并通知渲染进程），并在 `preload` 中暴露完整 IPC API。
4. **阶段四：配置 shadcn/ui 与渲染进程全链路联调 (`apps/desktop/src/renderer`)**
   - 配置 Tailwind CSS 和 `shadcn/ui`（安装 `button`, `input`, `scroll-area`, `badge`, `tabs`, `dialog`, `sonner`）。
   - 集成 `better-auth/react` 客户端与 `socket.io-client`。
   - 实现核心 UI：顶部搜索栏 + 登录状态入口 + 剪贴板卡片列表（显示内容预览、来源设备、云端同步状态小图标，点击卡片一键写回系统剪贴板并隐藏窗口）。
   - 打通离线与在线双链路：未登录时本地 SQLite 正常记录与展示；登录后自动将 `isSynced = false` 的本地记录同步至云端，并通过 Socket.IO 接收其他设备的新增推送并写入本地 SQLite。
5. **阶段五：编写启动文档与验证脚本**
   - 在根目录生成 `README.md`，给出从配置云端 PostgreSQL 的 `DATABASE_URL`、执行 `prisma db push`、启动后端到启动 Electron 桌面端的完整命令行步骤。
