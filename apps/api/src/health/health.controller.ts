import { Controller, Get } from '@nestjs/common';
import { Publica } from '../auth/publica.decorator';

@Publica()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'safety-nexo-api' };
  }
}
