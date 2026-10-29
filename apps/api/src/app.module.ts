import type { ApiEnvironment } from '@incidentlens/config';
import { RuntimeModule } from '@incidentlens/runtime';
import { Module, type DynamicModule } from '@nestjs/common';

@Module({})
export class AppModule {}

export function createAppModule(environment: ApiEnvironment): DynamicModule {
  return {
    module: AppModule,
    imports: [
      RuntimeModule.register({
        serviceName: 'incidentlens-api',
        logLevel: environment.LOG_LEVEL,
        databaseUrl: environment.DATABASE_URL,
        redisUrl: environment.REDIS_URL,
        dependencyTimeoutMs: environment.DEPENDENCY_TIMEOUT_MS,
        postgresPoolMax: environment.POSTGRES_POOL_MAX,
      }),
    ],
  };
}
