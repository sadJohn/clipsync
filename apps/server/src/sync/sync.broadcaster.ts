import { Injectable } from '@nestjs/common'
import type { Server } from 'socket.io'
import type { SocketEvent } from '@clipsync/shared'
import { userRoom } from './sync.rooms.js'

/**
 * 供 HTTP 接口在写入云端后广播实时事件。
 * Socket.IO Server 由 SyncGateway 初始化时注入。
 */
@Injectable()
export class SyncBroadcaster {
  private server?: Server

  attach(server: Server): void {
    this.server = server
  }

  emitToUser<T>(userId: string, event: SocketEvent, payload: T): void {
    this.server?.to(userRoom(userId)).emit(event, payload)
  }
}
