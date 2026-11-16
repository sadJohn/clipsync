import 'dotenv/config'
import type { ZodError } from 'zod'
import { envSchema, type Env } from './env.schema.js'

function formatIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
}

function parseEnv(source: Record<string, unknown>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`[ClipSync] 环境变量校验失败：\n${formatIssues(result.error)}`)
  }
  return result.data
}

/**
 * 进程内唯一的环境变量入口。PrismaService 与 Better Auth 都在 Nest DI 容器之外实例化，
 * 早于 ConfigModule 之类的加载动作，所以统一从这里读取；业务代码不要再直接访问 process.env。
 */
export const env = parseEnv(process.env)
