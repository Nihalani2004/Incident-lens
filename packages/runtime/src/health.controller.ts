import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';

import { RuntimeHealthService } from './runtime.service.ts';
import type { LivenessReport, ReadinessReport } from './types.ts';

@Controller('health')
export class HealthController {
  constructor(@Inject(RuntimeHealthService) private readonly health: RuntimeHealthService) {}

  @Get('live')
  @Header('cache-control', 'no-store')
  liveness(): LivenessReport {
    return this.health.liveness();
  }

  @Get('ready')
  @Header('cache-control', 'no-store')
  async readiness(): Promise<ReadinessReport> {
    const report = await this.health.readiness();
    if (report.status === 'error') {
      throw new ServiceUnavailableException(report);
    }

    return report;
  }
}
