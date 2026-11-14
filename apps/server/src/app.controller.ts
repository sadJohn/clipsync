import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get('health')
  health(): { status: string; service: string; time: string } {
    return {
      status: 'ok',
      service: 'clipsync-server',
      time: new Date().toISOString(),
    }
  }
}
