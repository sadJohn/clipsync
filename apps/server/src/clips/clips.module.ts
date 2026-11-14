import { Module } from '@nestjs/common'
import { RealtimeModule } from '../sync/realtime.module.js'
import { ClipsController } from './clips.controller.js'
import { ClipsService } from './clips.service.js'

@Module({
  imports: [RealtimeModule],
  controllers: [ClipsController],
  providers: [ClipsService],
  exports: [ClipsService],
})
export class ClipsModule {}
