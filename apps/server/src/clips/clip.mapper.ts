import type { ClipItem } from '../prisma/generated/client.js'
import type { ClipItemDto, ClipType } from '@clipsync/shared'

export function toClipItemDto(clip: ClipItem): ClipItemDto {
  return {
    id: clip.id,
    content: clip.content,
    type: clip.type as ClipType,
    deviceName: clip.deviceName,
    isPinned: clip.isPinned,
    createdAt: clip.createdAt.toISOString(),
    updatedAt: clip.updatedAt.toISOString()
  }
}
