import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { bearer } from 'better-auth/plugins'
import { prismaService } from '../prisma/prisma.service.js'
import { trustedOrigins } from './trusted-origins.js'

const secret = process.env.BETTER_AUTH_SECRET || 'clipsync-development-secret'

if (!process.env.BETTER_AUTH_SECRET) {
  console.warn('[ClipSync] 未配置 BETTER_AUTH_SECRET，当前使用开发占位密钥，请勿用于生产环境')
}

export const auth = betterAuth({
  appName: 'ClipSync',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  secret,
  database: prismaAdapter(prismaService, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  trustedOrigins,
  plugins: [bearer()]
})
