import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  ClipItemDto,
  ClipType,
  CreateClipParsed,
  ListClipsQueryParsed,
  UpdateClipParsed
} from '@clipsync/shared'
import { PrismaService } from '../prisma/prisma.service.js'
import { toClipItemDto } from './clip.mapper.js'

interface ClipUpsertInput {
  id: string
  content: string
  type: ClipType
  deviceName: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  lastUsedAt: string
}

@Injectable()
export class ClipsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListClipsQueryParsed): Promise<ClipItemDto[]> {
    const clips = await this.prisma.clipItem.findMany({
      where: {
        userId,
        ...(query.since ? { updatedAt: { gt: new Date(query.since) } } : {})
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: query.limit
    })
    return clips.map(toClipItemDto)
  }

  async create(userId: string, input: CreateClipParsed): Promise<ClipItemDto> {
    return this.upsert(userId, {
      id: input.id,
      content: input.content,
      type: input.type,
      deviceName: input.deviceName,
      isPinned: input.isPinned,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt ?? input.createdAt,
      lastUsedAt: input.lastUsedAt ?? input.createdAt
    })
  }

  /**
   * 客户端 ID 由本地生成，重复上传时保持幂等，直接返回已存在的云端记录。
   */
  async upsertClip(userId: string, clip: ClipItemDto): Promise<ClipItemDto> {
    return this.upsert(userId, clip)
  }

  async update(userId: string, id: string, input: UpdateClipParsed): Promise<ClipItemDto> {
    const existing = await this.prisma.clipItem.findFirst({ where: { id, userId } })
    if (!existing) {
      throw new NotFoundException('剪贴板条目不存在')
    }

    const updated = await this.prisma.clipItem.update({
      where: { id },
      data: {
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {})
      }
    })
    return toClipItemDto(updated)
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.clipItem.deleteMany({ where: { id, userId } })
    if (result.count === 0) {
      throw new NotFoundException('剪贴板条目不存在')
    }
  }

  /**
   * 记录一次使用：只刷新 lastUsedAt，不改变内容与置顶状态。
   * 返回写入的时间，供调用方广播给同账号其他设备。
   */
  async markUsed(userId: string, id: string): Promise<string> {
    const lastUsedAt = new Date()
    const result = await this.prisma.clipItem.updateMany({
      where: { id, userId },
      data: { lastUsedAt }
    })
    if (result.count === 0) {
      throw new NotFoundException('剪贴板条目不存在')
    }
    return lastUsedAt.toISOString()
  }

  private async upsert(userId: string, clip: ClipUpsertInput): Promise<ClipItemDto> {
    const existing = await this.prisma.clipItem.findUnique({ where: { id: clip.id } })
    if (existing) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('该条目属于其他用户')
      }
      return toClipItemDto(existing)
    }

    const created = await this.prisma.clipItem.create({
      data: {
        id: clip.id,
        userId,
        content: clip.content,
        type: clip.type,
        deviceName: clip.deviceName,
        isPinned: clip.isPinned,
        createdAt: new Date(clip.createdAt),
        updatedAt: new Date(clip.updatedAt),
        lastUsedAt: new Date(clip.lastUsedAt)
      }
    })
    return toClipItemDto(created)
  }
}
