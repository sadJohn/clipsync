import { Module } from '@nestjs/common'
import { AppController } from './app.controller.js'
import { ClipsModule } from './clips/clips.module.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { SyncModule } from './sync/sync.module.js'

@Module({
  imports: [PrismaModule, ClipsModule, SyncModule],
  controllers: [AppController],
})
export class AppModule {}
