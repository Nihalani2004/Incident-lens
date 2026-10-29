import { Module, type DynamicModule } from '@nestjs/common';
import { Redis } from 'ioredis';
import { LoggerModule } from 'nestjs-pino';
import { Pool } from 'pg';

import { HealthController } from './health.controller.ts';
import { createLoggerParameters } from './logging.ts';
import { RuntimeHealthService } from './runtime.service.ts';
import { POSTGRES_POOL, REDIS_CLIENT, RUNTIME_OPTIONS } from './tokens.ts';
import type { RuntimeOptions } from './types.ts';

@Module({})
export class RuntimeModule {
  static register(options: RuntimeOptions): DynamicModule {
    const immutableOptions = Object.freeze({ ...options });

    return {
      module: RuntimeModule,
      imports: [LoggerModule.forRoot(createLoggerParameters(immutableOptions))],
      controllers: [HealthController],
      providers: [
        {
          provide: RUNTIME_OPTIONS,
          useValue: immutableOptions,
        },
        {
          provide: POSTGRES_POOL,
          useFactory: (): Pool =>
            new Pool({
              application_name: immutableOptions.serviceName,
              connectionString: immutableOptions.databaseUrl,
              connectionTimeoutMillis: immutableOptions.dependencyTimeoutMs,
              idleTimeoutMillis: 30_000,
              max: immutableOptions.postgresPoolMax,
              statement_timeout: immutableOptions.dependencyTimeoutMs,
            }),
        },
        {
          provide: REDIS_CLIENT,
          useFactory: (): Redis =>
            new Redis(immutableOptions.redisUrl, {
              commandTimeout: immutableOptions.dependencyTimeoutMs,
              connectTimeout: immutableOptions.dependencyTimeoutMs,
              connectionName: immutableOptions.serviceName,
              enableOfflineQueue: false,
              lazyConnect: true,
              maxRetriesPerRequest: 1,
            }),
        },
        RuntimeHealthService,
      ],
      exports: [RuntimeHealthService],
    };
  }
}
