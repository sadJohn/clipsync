import { Module } from '@nestjs/common'
import { SyncBroadcaster } from './sync.broadcaster.js'

@Module({
  providers: [SyncBroadcaster],
  exports: [SyncBroadcaster]
})
export class RealtimeModule {}
