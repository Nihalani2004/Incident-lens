import type { DependencyHealth, LivenessReport, ReadinessReport, RuntimeOptions } from './types.ts';

export interface PostgresHealthClient {
  query(queryText: string): Promise<{ readonly rows: readonly Record<string, unknown>[] }>;
}

export interface RedisHealthClient {
  readonly status: string;
  connect(): Promise<void>;
  ping(): Promise<string>;
}

function elapsedMilliseconds(startedAt: number): number {
  return Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100);
}

export async function probePostgres(client: PostgresHealthClient): Promise<DependencyHealth> {
  const startedAt = performance.now();

  try {
    const result = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector' LIMIT 1",
    );
    const extensionVersion = result.rows[0]?.extversion;

    return {
      status: typeof extensionVersion === 'string' && extensionVersion.length > 0 ? 'up' : 'down',
      latencyMs: elapsedMilliseconds(startedAt),
    };
  } catch {
    return {
      status: 'down',
      latencyMs: elapsedMilliseconds(startedAt),
    };
  }
}

export async function probeRedis(client: RedisHealthClient): Promise<DependencyHealth> {
  const startedAt = performance.now();

  try {
    if (client.status === 'wait') {
      await client.connect();
    }

    const response = await client.ping();
    return {
      status: response === 'PONG' ? 'up' : 'down',
      latencyMs: elapsedMilliseconds(startedAt),
    };
  } catch {
    return {
      status: 'down',
      latencyMs: elapsedMilliseconds(startedAt),
    };
  }
}

export function createLivenessReport(serviceName: string, now: Date = new Date()): LivenessReport {
  return {
    status: 'ok',
    service: serviceName,
    timestamp: now.toISOString(),
  };
}

export async function createReadinessReport(
  options: Pick<RuntimeOptions, 'serviceName'>,
  postgres: PostgresHealthClient,
  redis: RedisHealthClient,
  now: Date = new Date(),
): Promise<ReadinessReport> {
  const [postgresHealth, redisHealth] = await Promise.all([
    probePostgres(postgres),
    probeRedis(redis),
  ]);
  const healthy = postgresHealth.status === 'up' && redisHealth.status === 'up';

  return {
    status: healthy ? 'ok' : 'error',
    service: options.serviceName,
    timestamp: now.toISOString(),
    dependencies: {
      postgres: postgresHealth,
      redis: redisHealth,
    },
  };
}
