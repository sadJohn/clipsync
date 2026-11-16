import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from './generated/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../config/env.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
    super({ adapter })
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}

/**
 * Better Auth 实例运行在 Nest DI 容器之外，复用同一个 PrismaClient，
 * 避免云端数据库出现多条独立连接池。
 */
export const prismaService = new PrismaService()
