import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Redis } from 'ioredis';
import { Pool } from 'pg';

import { createReadinessReport } from '../src/health.ts';

test('connects to the local PostgreSQL/pgvector and Redis services', async () => {
  const timeout = Number.parseInt(process.env.DEPENDENCY_TIMEOUT_MS ?? '2000', 10);
  const postgres = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://incidentlens:incidentlens_local@localhost:5432/incidentlens',
    connectionTimeoutMillis: timeout,
    max: 1,
    statement_timeout: timeout,
  });
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    commandTimeout: timeout,
    connectTimeout: timeout,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  try {
    const report = await createReadinessReport(
      { serviceName: 'incidentlens-runtime-integration' },
      postgres,
      redis,
    );
    assert.equal(report.status, 'ok', JSON.stringify(report));
  } finally {
    redis.disconnect(false);
    await postgres.end();
  }
});
