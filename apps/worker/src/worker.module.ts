import type { WorkerEnvironment } from '@incidentlens/config';
import { RuntimeModule } from '@incidentlens/runtime';
import { Module, type DynamicModule } from '@nestjs/common';

@Module({})
export class WorkerModule {}

export function createWorkerModule(environment: WorkerEnvironment): DynamicModule {
  return {
    module: WorkerModule,
    imports: [
      RuntimeModule.register({
        serviceName: 'incidentlens-worker',
        logLevel: environment.LOG_LEVEL,
        databaseUrl: environment.DATABASE_URL,
        redisUrl: environment.REDIS_URL,
        dependencyTimeoutMs: environment.DEPENDENCY_TIMEOUT_MS,
        postgresPoolMax: environment.POSTGRES_POOL_MAX,
      }),
    ],
  };
}
