import { z } from 'zod'
import { CLIP_TYPES } from '../types/clip'

export const clipTypeSchema = z.enum(CLIP_TYPES)

/** 完整的剪贴板条目传输模型校验 */
export const clipItemSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  type: clipTypeSchema,
  deviceName: z.string().min(1).max(64),
  isPinned: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

/** 本地 SQLite 记录校验（isPinned / isSynced 为布尔语义） */
export const localClipRecordSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  type: clipTypeSchema,
  deviceName: z.string().min(1).max(64),
  isPinned: z.boolean(),
  isSynced: z.boolean(),
  createdAt: z.string().datetime()
})

/** 桌面端上传新条目时的入参 */
export const createClipSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  type: clipTypeSchema,
  deviceName: z.string().min(1).max(64),
  isPinned: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional()
})

/** 更新条目（目前仅支持修改内容与置顶状态） */
export const updateClipSchema = z
  .object({
    content: z.string().min(1).optional(),
    isPinned: z.boolean().optional()
  })
  .refine((value) => value.content !== undefined || value.isPinned !== undefined, {
    message: '至少需要提供 content 或 isPinned 字段'
  })

/** 增量拉取查询参数 */
export const listClipsQuerySchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
})

export type ClipItemInput = z.input<typeof clipItemSchema>
export type ClipItemParsed = z.output<typeof clipItemSchema>
export type LocalClipRecordParsed = z.output<typeof localClipRecordSchema>
export type CreateClipInput = z.input<typeof createClipSchema>
export type CreateClipParsed = z.output<typeof createClipSchema>
export type UpdateClipInput = z.input<typeof updateClipSchema>
export type UpdateClipParsed = z.output<typeof updateClipSchema>
export type ListClipsQuery = z.input<typeof listClipsQuerySchema>
export type ListClipsQueryParsed = z.output<typeof listClipsQuerySchema>
