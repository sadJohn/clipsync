import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { bearer } from 'better-auth/plugins'
import { env } from '../config/env.js'
import { prismaService } from '../prisma/prisma.service.js'
import { trustedOrigins } from './trusted-origins.js'

export const auth = betterAuth({
  appName: 'ClipSync',
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prismaService, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  trustedOrigins,
  plugins: [bearer()]
})
