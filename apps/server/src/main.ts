import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { toNodeHandler } from 'better-auth/node'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module.js'
import { auth } from './auth/auth.js'
import { trustedOrigins } from './auth/trusted-origins.js'

async function bootstrap(): Promise<void> {
  // 关闭 Nest 默认的 bodyParser，Better Auth 需要自行读取原始请求体
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  })

  const expressApp = app.getHttpAdapter().getInstance()

  // CORS 必须早于 Better Auth 挂载，否则预检请求会被其拦截
  app.enableCors({
    origin: trustedOrigins,
    credentials: true,
  })

  // /api/auth/* 交由 Better Auth 官方 Express 适配器处理
  expressApp.all(/^\/api\/auth(?:\/.*)?$/, toNodeHandler(auth))

  // 其余路由恢复 JSON / 表单解析（Clip 内容可能较大）
  app.use(json({ limit: '10mb' }))
  app.use(urlencoded({ extended: true, limit: '10mb' }))

  app.setGlobalPrefix('api')
  app.enableShutdownHooks()

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  console.log(`[ClipSync] server listening on http://localhost:${port}`)
}

bootstrap().catch((error: unknown) => {
  console.error('[ClipSync] server bootstrap failed', error)
  process.exit(1)
})
