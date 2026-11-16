import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    // 显式传入连接串，避免 Prisma 在运行期自行读取 process.env
    super({ datasourceUrl: env.DATABASE_URL })
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
