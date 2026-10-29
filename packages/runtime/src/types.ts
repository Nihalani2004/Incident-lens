export interface RuntimeOptions {
  readonly serviceName: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly dependencyTimeoutMs: number;
  readonly postgresPoolMax: number;
}

export type DependencyStatus = 'up' | 'down';

export interface DependencyHealth {
  readonly status: DependencyStatus;
  readonly latencyMs: number;
}

export interface ReadinessReport {
  readonly status: 'ok' | 'error';
  readonly service: string;
  readonly timestamp: string;
  readonly dependencies: {
    readonly postgres: DependencyHealth;
    readonly redis: DependencyHealth;
  };
}

export interface LivenessReport {
  readonly status: 'ok';
  readonly service: string;
  readonly timestamp: string;
}
