import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { toNodeHandler } from 'better-auth/node'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module.js'
import { auth } from './auth/auth.js'
import { trustedOrigins } from './auth/trusted-origins.js'
import { env } from './config/env.js'

async function bootstrap(): Promise<void> {
  // 关闭 Nest 默认的 bodyParser，Better Auth 需要自行读取原始请求体
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false
  })

  const expressApp = app.getHttpAdapter().getInstance()

  // CORS 必须早于 Better Auth 挂载，否则预检请求会被其拦截
  app.enableCors({
    origin: trustedOrigins,
    credentials: true
  })

  // /api/auth/* 交由 Better Auth 官方 Express 适配器处理。
  // 顺序敏感：它自行读取原始请求流并直接结束响应，不会再 next()，所以必须排在 body 解析器之前
  expressApp.all(/^\/api\/auth(?:\/.*)?$/, toNodeHandler(auth))

  // 其余路由恢复 JSON / 表单解析。body-parser 默认上限仅 100kb，超限会直接返回 413 且绕过 Nest 异常过滤器，
  // 这里放宽容纳长文本 Clip；Nest 控制器在 listen() 时才注册，天然位于这两个中间件之后
  app.use(json({ limit: '10mb' }))
  app.use(urlencoded({ extended: true, limit: '10mb' }))

  app.setGlobalPrefix('api')
  // 优雅关闭：收到 SIGTERM / SIGINT 时先 app.close()，
  // 触发 PrismaService.onModuleDestroy 的 $disconnect() 并关闭 Socket.IO，再按原信号退出
  app.enableShutdownHooks()

  const port = env.PORT
  await app.listen(port)
  console.log(`[ClipSync] server listening on http://localhost:${port}`)
}

bootstrap().catch((error: unknown) => {
  console.error('[ClipSync] server bootstrap failed', error)
  process.exit(1)
})
