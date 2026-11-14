import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request } from 'express'
import { auth } from './auth.js'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
}

export interface AuthenticatedSession {
  id: string
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
  session: AuthenticatedSession
}

/**
 * 通过 Better Auth 校验当前请求的会话（支持 Cookie 与 Bearer Token），
 * 校验通过后把 user / session 挂到请求对象上供业务层使用。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })

    if (!session) {
      throw new UnauthorizedException('未登录或会话已过期')
    }

    request.user = session.user as AuthenticatedUser
    request.session = session.session as AuthenticatedSession
    return true
  }
}
