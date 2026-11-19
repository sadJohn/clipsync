import { z } from 'zod'

/**
 * 服务端环境变量契约。校验发生在实例化 Prisma / Better Auth 之前，
 * 缺项或格式错误直接终止启动，避免配置问题拖到运行期才暴露。
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET 至少需要 32 个字符'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  TRUSTED_ORIGINS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional()
})

export type Env = z.infer<typeof envSchema>
