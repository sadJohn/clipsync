import { Module } from '@nestjs/common'
import { ClipsModule } from '../clips/clips.module.js'
import { RealtimeModule } from './realtime.module.js'
import { SyncGateway } from './sync.gateway.js'

@Module({
  imports: [ClipsModule, RealtimeModule],
  providers: [SyncGateway]
})
export class SyncModule {}
