# 部署后端到 Render

ClipSync 后端（`apps/server`）是长驻 Node 服务并依赖 Socket.IO，适合部署到 Render Web Service；不建议部署到 Vercel（Serverless 不支持长连接 WebSocket）。

本文假设仓库已推送到 GitHub：`https://github.com/sadJohn/clipsync.git`。

## 0. 前置条件

- Render 账号（可用 GitHub 登录）：https://render.com
- 一个持久可用的 PostgreSQL：推荐 Neon（Render 免费数据库有 30 天限制）
- 本地已安装 `pnpm`，且 `pnpm -v` 记录版本号备用

## 1. 创建 PostgreSQL（Neon）

1. 登录 https://neon.tech，创建 Project，Region 选与 Render 相同区域（如 Singapore）。
2. 在 Connect 面板复制连接串，形如：

   ```text
   postgresql://USER:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/clipsync?sslmode=require
   ```

3. 记下该串，后面用于 `DATABASE_URL` 和本地初始化表结构。

> 如果直接使用 Render PostgreSQL，则从 Render 数据库页面复制 Internal / External Database URL；注意免费实例到期策略。

## 2. 首次初始化表结构

Prisma 的 `db push` 只需执行一次（schema 变更时再执行）。在本地执行，避免把数据库迁移放进每次构建：

```bash
cd apps/server
DATABASE_URL="postgresql://USER:PASSWORD@host/clipsync?sslmode=require" pnpm prisma:push
```

成功后会创建 Better Auth 的表与业务表 `ClipItem`。

## 3. 创建 Render Web Service

Render Dashboard → **New → Web Service** → 选择 GitHub 仓库 `sadJohn/clipsync`，按下表填写：

| 配置项 | 值 |
| --- | --- |
| Name | `clipsync-server`（决定域名 `https://clipsync-server.onrender.com`） |
| Region | Singapore（与数据库同区域） |
| Branch | `main` |
| Root Directory | 留空（仓库根目录） |
| Runtime | Node |
| Build Command | 见下方 |
| Start Command | `node apps/server/dist/main.js` |
| Health Check Path | `/api/health` |
| Instance Type | Free（或 Starter，避免冷启动） |

Build Command：

```bash
pnpm install --frozen-lockfile && pnpm --filter @clipsync/shared build && pnpm --filter @clipsync/server prisma:generate && pnpm --filter @clipsync/server build
```

说明：

- 必须先构建 `@clipsync/shared`，否则后端导入的是旧的 `dist`。
- `prisma:generate` 必须在 Render 的 Linux 环境执行，才能得到匹配的查询引擎。
- 若 `--frozen-lockfile` 报 lockfile 不一致，去掉该参数改为 `pnpm install`。

## 4. 配置环境变量

在 Web Service → **Environment** 中添加：

| 变量 | 值 |
| --- | --- |
| `DATABASE_URL` | Neon 连接串（保留 `?sslmode=require`） |
| `BETTER_AUTH_SECRET` | 随机密钥，生成：`openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://clipsync-server.onrender.com`（你的实际域名） |
| `TRUSTED_ORIGINS` | `https://clipsync-server.onrender.com` |
| `NODE_VERSION` | `22` |
| `PORT` | 不需要配置，Render 自动注入，服务端已读取 `process.env.PORT` |

补充：

- `app://clipsync` 与 `http://localhost:5173` 已写在代码默认白名单里，无需重复配置。
- 若 pnpm 版本解析失败，增加 `PNPM_VERSION` 为第 0 步记录的本地版本，然后重新部署。
- 不要提交任何 `.env` 文件，Render 环境变量即生产配置。

## 5. 部署与验证

保存配置后点击 **Create Web Service**，等待构建完成（首次约数分钟）。

```bash
curl https://clipsync-server.onrender.com/api/health
# {"status":"ok","service":"clipsync-server","time":"..."}
```

再验证认证接口可达（返回 401/400 均说明路由正常，不是 404）：

```bash
curl -i https://clipsync-server.onrender.com/api/auth/get-session
```

查看日志：Render → Service → **Logs**，应出现 `[ClipSync] server listening on ...`；若报 Prisma 引擎或数据库连接错误，检查 `DATABASE_URL` 与第 3 步的 `prisma:generate` 是否执行。

## 6. 让桌面端连接云端

云端地址通过构建时变量 `VITE_SERVER_URL` 注入，写在 `apps/desktop/.env`：

```dotenv
VITE_SERVER_URL=https://clipsync-server.onrender.com
```

然后重新构建 / 打包：

```bash
pnpm --filter @clipsync/desktop build
# 或生成安装包
pnpm --filter @clipsync/desktop dist:mac
```

临时联调也可以直接用环境变量：

```bash
VITE_SERVER_URL=https://clipsync-server.onrender.com pnpm --filter @clipsync/desktop dev
```

验证链路：启动桌面端 → 登录/注册 → 复制一段文本 → 云端列表可见，且本机 `local_clips.is_synced = 1`。

## 7. 常见问题

- **首屏/登录很慢**：Render 免费实例空闲 15 分钟休眠，唤醒需 30–60 秒；Socket.IO 会自动重连。需要常驻可升级 Starter。
- **浏览器报 CORS**：确认 `TRUSTED_ORIGINS` 包含实际前端来源；桌面端打包版来源是 `app://clipsync`，已在默认白名单。
- **401 / 登录态失效**：`BETTER_AUTH_URL` 必须与真实访问域名完全一致（含 https），修改后重新部署。
- **本地账号登录不了**：本地 `.env` 与 Render 的 `DATABASE_URL` 若不是同一个库，本地注册的账号在云端不存在，需要重新注册。
- **Socket.IO 连不上**：确认部署的是 Web Service（不是 Static Site），且客户端使用的 `VITE_SERVER_URL` 与 HTTP 请求一致；Render 免费 Web Service 支持 WebSocket。
- **Prisma 报 `Query engine ... not found`**：构建命令中缺少 `prisma:generate`，或本地 `node_modules` 被打包；确保在 Render 上重新构建。
- **数据库休眠/过期**：Render 免费 PostgreSQL 会过期，Neon 免费额度更适合长期使用。

## 8. 可选：Blueprint 部署

仓库根目录新增 `render.yaml` 后，Render 可用 **New → Blueprint** 自动创建服务：

```yaml
services:
  - type: web
    name: clipsync-server
    runtime: node
    plan: free
    region: singapore
    branch: main
    buildCommand: pnpm install --frozen-lockfile && pnpm --filter @clipsync/shared build && pnpm --filter @clipsync/server prisma:generate && pnpm --filter @clipsync/server build
    startCommand: node apps/server/dist/main.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: DATABASE_URL
        sync: false
      - key: BETTER_AUTH_SECRET
        sync: false
      - key: BETTER_AUTH_URL
        sync: false
      - key: TRUSTED_ORIGINS
        sync: false
```

`sync: false` 表示创建时手动填写，不会入库到仓库。
