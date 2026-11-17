import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common'
import {
  SocketEvents,
  createClipSchema,
  listClipsQuerySchema,
  updateClipSchema,
  type CreateClipParsed,
  type ListClipsQueryParsed,
  type UpdateClipParsed
} from '@clipsync/shared'
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { SyncBroadcaster } from '../sync/sync.broadcaster.js'
import { ClipsService } from './clips.service.js'

@Controller('clips')
@UseGuards(AuthGuard)
export class ClipsController {
  constructor(
    private readonly clips: ClipsService,
    private readonly broadcaster: SyncBroadcaster
  ) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listClipsQuerySchema)) query: ListClipsQueryParsed
  ) {
    return this.clips.list(request.user.id, query)
  }

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createClipSchema)) body: CreateClipParsed
  ) {
    const clip = await this.clips.create(request.user.id, body)
    this.broadcaster.emitToUser(request.user.id, SocketEvents.SYNC_NEW_CLIP, { clip })
    return clip
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateClipSchema)) body: UpdateClipParsed
  ) {
    const clip = await this.clips.update(request.user.id, id, body)
    this.broadcaster.emitToUser(request.user.id, SocketEvents.SYNC_PIN_CLIP, {
      id: clip.id,
      isPinned: clip.isPinned,
      updatedAt: clip.updatedAt
    })
    return clip
  }

  @Post(':id/use')
  async use(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const lastUsedAt = await this.clips.markUsed(request.user.id, id)
    this.broadcaster.emitToUser(request.user.id, SocketEvents.SYNC_USE_CLIP, { id, lastUsedAt })
    return { id, lastUsedAt }
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.clips.remove(request.user.id, id)
    this.broadcaster.emitToUser(request.user.id, SocketEvents.SYNC_DELETE_CLIP, { id })
    return { id }
  }
}
