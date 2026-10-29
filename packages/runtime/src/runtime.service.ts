import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';

import { createLivenessReport, createReadinessReport } from './health.ts';
import { POSTGRES_POOL, REDIS_CLIENT, RUNTIME_OPTIONS } from './tokens.ts';
import type { LivenessReport, ReadinessReport, RuntimeOptions } from './types.ts';

@Injectable()
export class RuntimeHealthService implements OnModuleDestroy {
  constructor(
    @Inject(RUNTIME_OPTIONS) private readonly options: RuntimeOptions,
    @Inject(POSTGRES_POOL) private readonly postgres: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  liveness(): LivenessReport {
    return createLivenessReport(this.options.serviceName);
  }

  readiness(): Promise<ReadinessReport> {
    return createReadinessReport(this.options, this.postgres, this.redis);
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect(false);
    await this.postgres.end();
  }
}
