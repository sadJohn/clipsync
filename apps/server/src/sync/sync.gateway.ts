import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import {
  SocketEvents,
  syncDeleteClipSchema,
  syncNewClipSchema,
  syncPinClipSchema,
} from '@clipsync/shared'
import { auth } from '../auth/auth.js'
import { trustedOrigins } from '../auth/trusted-origins.js'
import { ClipsService } from '../clips/clips.service.js'
import { SyncBroadcaster } from './sync.broadcaster.js'
import { userRoom } from './sync.rooms.js'

@WebSocketGateway({
  cors: {
    origin: trustedOrigins,
    credentials: true,
  },
})
export class SyncGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(SyncGateway.name)

  @WebSocketServer()
  private server!: Server

  constructor(
    private readonly clips: ClipsService,
    private readonly broadcaster: SyncBroadcaster,
  ) {}

  afterInit(server: Server): void {
    this.broadcaster.attach(server)
  }

  async handleConnection(client: Socket): Promise<void> {
    // 握手鉴权是异步的（需要查库），事件处理器会等待同一个 Promise，
    // 避免客户端在 join 房间之前发来的事件丢失。
    const authPromise = this.authenticate(client)
    client.data.auth = authPromise

    try {
      const userId = await authPromise
      this.logger.log(`设备已连接 client=${client.id} user=${userId}`)
    } catch (error) {
      this.logger.warn(
        `拒绝连接 client=${client.id}: ${error instanceof Error ? error.message : '未知错误'}`,
      )
      client.disconnect(true)
    }
  }

  private async authenticate(client: Socket): Promise<string> {
    const token = extractToken(client)
    if (!token) throw new Error('缺少访问令牌')

    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    })
    if (!session) throw new Error('无效的访问令牌')

    client.data.userId = session.user.id
    await client.join(userRoom(session.user.id))
    return session.user.id
  }

  @SubscribeMessage(SocketEvents.SYNC_NEW_CLIP)
  async handleNewClip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<{ ok: true }> {
    const userId = await this.requireUserId(client)
    const parsed = syncNewClipSchema.safeParse(payload)
    if (!parsed.success) throw new WsException('非法的剪贴板条目载荷')

    const clip = await this.clips.upsertClip(userId, parsed.data.clip)
    client.to(userRoom(userId)).emit(SocketEvents.SYNC_NEW_CLIP, { clip })
    return { ok: true }
  }

  @SubscribeMessage(SocketEvents.SYNC_DELETE_CLIP)
  async handleDeleteClip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<{ ok: true }> {
    const userId = await this.requireUserId(client)
    const parsed = syncDeleteClipSchema.safeParse(payload)
    if (!parsed.success) throw new WsException('非法的删除事件载荷')

    await this.clips.remove(userId, parsed.data.id)
    client.to(userRoom(userId)).emit(SocketEvents.SYNC_DELETE_CLIP, { id: parsed.data.id })
    return { ok: true }
  }

  @SubscribeMessage(SocketEvents.SYNC_PIN_CLIP)
  async handlePinClip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<{ ok: true }> {
    const userId = await this.requireUserId(client)
    const parsed = syncPinClipSchema.safeParse(payload)
    if (!parsed.success) throw new WsException('非法的置顶事件载荷')

    const clip = await this.clips.update(userId, parsed.data.id, {
      isPinned: parsed.data.isPinned,
    })
    client.to(userRoom(userId)).emit(SocketEvents.SYNC_PIN_CLIP, {
      id: clip.id,
      isPinned: clip.isPinned,
      updatedAt: clip.updatedAt,
    })
    return { ok: true }
  }

  private async requireUserId(client: Socket): Promise<string> {
    const authPromise = client.data.auth as Promise<string> | undefined
    if (!authPromise) throw new WsException('连接未认证')
    try {
      return await authPromise
    } catch {
      throw new WsException('连接未认证')
    }
  }
}

function extractToken(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token as unknown
  if (typeof authToken === 'string' && authToken.length > 0) return authToken

  const authorization = client.handshake.headers.authorization
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length)
  }
  return undefined
}
