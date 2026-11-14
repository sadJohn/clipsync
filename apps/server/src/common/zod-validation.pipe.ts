import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'

/**
 * 使用 @clipsync/shared 中的 Zod Schema 校验请求体 / 查询参数，
 * 保证云端与桌面端共用同一份数据契约。
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: '请求参数校验失败',
        issues: result.error.flatten(),
      })
    }
    return result.data
  }
}
