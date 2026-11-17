# TODO

## 为 `createClipSchema.content` 增加长度上限

**状态**：待办

**背景**

- [main.ts](../apps/server/src/main.ts#L29-L32) 的 `json({ limit: '10mb' })` 是当前唯一的体积门槛。
- [clip.ts](../packages/shared/src/schemas/clip.ts#L29-L35) 的 `createClipSchema.content` 只有 `z.string().min(1)`，没有上限，校验层拦不住超大内容。
- 超限请求会由 body-parser 抛出 `PayloadTooLargeError`（413），该错误在 Express 中间件层抛出、绕过 Nest 异常过滤器，返回的不是项目统一的 JSON 错误结构。
- 桌面端上传失败会停留在 `isSynced = false`，下一轮继续重试、继续 413，形成永远同步不上去的记录。

**方案**

- 在 `createClipSchema` 中补充 `content` 上限，例如 `z.string().min(1).max(10_000_000)`，使超限在业务层返回结构化的 400。
- 待确认：Zod `.max()` 按字符数计，而 body-parser 的 `10mb` 按字节计（中文 UTF-8 约 3 字节/字符）。若要严格对齐请求体上限，字符数应取更小的值（如 `3_000_000`），或改为按 `Buffer.byteLength` 校验。
- 可选：同时给 `updateClipSchema.content` 加一致的上限。

**验收**

- 超过上限的 `POST /api/clips` 返回 400 与统一 JSON 错误格式，而非 413。
- `pnpm typecheck && pnpm build` 通过。

## 桌面端补齐 `isPinned`（置顶）功能

**状态**：待办

**背景**

- 服务端与共享层已完整支持置顶：[schema.prisma](../apps/server/prisma/schema.prisma#L82) 有 `isPinned` 字段，[clips.service.ts](../apps/server/src/clips/clips.service.ts#L32) 按 `isPinned desc, createdAt desc` 排序，`PATCH /api/clips/:id` 支持只改 `isPinned`，[sync.gateway.ts](../apps/server/src/sync/sync.gateway.ts#L105-L123) 也实现了 `sync:pin-clip` 上行与广播。
- 桌面端完全没有实现：`IpcChannels` 没有置顶相关通道，[local-clip-service.ts](../apps/desktop/src/main/services/local-clip-service.ts) 没有更新 `isPinned` 的方法，`localClipService.list()` 只按 `createdAt desc` 排序，渲染进程既没有置顶按钮 / 右键菜单，也从不调用 `PATCH /api/clips/:id`。
- [socket.ts](../apps/desktop/src/renderer/src/lib/socket.ts) 只监听 `sync:new-clip` 与 `sync:delete-clip`，遗漏了 `sync:pin-clip`，导致其他设备的置顶操作不会同步到本机。

**方案**

- 主进程：新增 `local-clips:set-pinned` IPC，`localClipService` 增加 `setPinned(id, isPinned)`，并把 `list()` 排序改为 `isPinned desc, createdAt desc`，与云端一致。同步修改 [ipc.ts](../packages/shared/src/constants/ipc.ts)、[ipc/index.ts](../apps/desktop/src/main/ipc/index.ts)、preload `window.api` 及渲染进程类型声明（四处联动）。
- 渲染进程：在条目上添加置顶 / 取消置顶入口，调用 `PATCH /api/clips/:id`（新增 `lib/clips-api` 包装，复用现有鉴权方式），成功后更新本地与 store；失败时回滚。
- 实时同步：`connectSyncSocket` 增加 `onPinClip` 处理，收到 `sync:pin-clip` 后写入本地 SQLite 并更新 store。

**验收**

- 置顶后的条目在列表顶部出现，重启应用后仍保持置顶状态。
- 设备 A 置顶后，设备 B 在 socket 连接正常时即时同步。
- `pnpm typecheck && pnpm build` 通过。

## HTTP 平台从 Express 迁移到 `@nestjs/platform-node`

**状态**：待评估

**背景**

- NestJS 官方文档（[HTTP adapters / NodeAdapter](https://docs.nestjs.com/http/performance#node-adapter)、[Nest vs Fastify, Express and Hono](https://docs.nestjs.com/faq/nest-vs-fastify-express-hono)）将 `NodeAdapter`（直接跑在 `node:http` 上）列为 Express / Fastify 之外的官方平台选项；官方基准中 Nest on Node 的 RPS 约为 Nest on Express 的 1.5 倍，接近 Fastify。
- 服务端目前使用 `@nestjs/platform-express`（[package.json](../apps/server/package.json#L17-L31)），并且在 [main.ts](../apps/server/src/main.ts) 里大量依赖 Express 能力：`NestExpressApplication`、`getHttpAdapter().getInstance()`、`express.json()/urlencoded()`。
- 版本已就绪：`@nestjs/platform-node@12.5.0` 与当前 `@nestjs/core@12.5.0` 对齐。

**迁移点**

- 依赖：`@nestjs/platform-express` → `@nestjs/platform-node`；确认 `express` / `@types/express` 是否可移除。
- [main.ts](../apps/server/src/main.ts)：`NestExpressApplication` → `NestNodeApplication`，`app.getHttpAdapter().getInstance()` 返回的是 `NodeRouter` 而非 Express 实例，Better Auth 的挂载方式需改写。
- body 解析：`NodeAdapter` 内置 body-parser（默认上限同为 `100kb`），改用 `app.useBodyParser('json', { limit: '10mb' })` 与 `useBodyParser('urlencoded', ...)`，并继续保持「auth 先于 body 解析」的顺序。`NodeJsonParserOptions` 提供 `verify`，可保留原始 body 供将来 webhook 验签。
- [auth.guard.ts](../apps/server/src/auth/auth.guard.ts)：`import type { Request } from 'express'` 需换成 `NodeRequest` / `IncomingMessage`；`fromNodeHeaders` 不受影响。
- 兼容性待验证：`app.enableCors` 在 `NestNodeApplication` 上有声明；Socket.IO 依赖 `listen()` 返回的 `http.Server`，需实测网关广播；Connect 风格中间件只支持 Node 原生 API 子集。

**验收**

- `pnpm typecheck && pnpm build` 通过，`GET /api/health` 正常。
- 邮箱密码登录（Bearer）→ 上传 Clip → Socket.IO `sync:new-clip` 广播链路端到端可用。
- 超大请求仍按 `10mb` 边界被拒，行为与迁移前一致。
