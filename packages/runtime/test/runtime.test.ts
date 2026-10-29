import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, test } from 'node:test';

import {
  createLivenessReport,
  createReadinessReport,
  type PostgresHealthClient,
  type RedisHealthClient,
} from '../src/health.ts';
import { assignRequestContext, requestContext } from '../src/logging.ts';

function postgresClient(implementation: PostgresHealthClient['query']): PostgresHealthClient {
  return { query: implementation };
}

function redisClient(overrides: Partial<RedisHealthClient> = {}): RedisHealthClient {
  return {
    status: 'ready',
    connect: async () => undefined,
    ping: async () => 'PONG',
    ...overrides,
  };
}

function responseRecorder(): {
  readonly response: ServerResponse;
  readonly headers: Map<string, string>;
} {
  const headers = new Map<string, string>();
  const response = {
    setHeader(name: string, value: string): void {
      headers.set(name.toLowerCase(), value);
    },
  } as unknown as ServerResponse;

  return { response, headers };
}

describe('request context', () => {
  test('preserves valid request and correlation IDs on the response', () => {
    const request = {
      headers: {
        'x-request-id': 'request-123',
        'x-correlation-id': 'incident-456',
      },
    } as unknown as IncomingMessage;
    const { response, headers } = responseRecorder();

    assert.equal(assignRequestContext(request, response), 'request-123');
    assert.deepEqual(requestContext(request), {
      requestId: 'request-123',
      correlationId: 'incident-456',
    });
    assert.equal(headers.get('x-request-id'), 'request-123');
    assert.equal(headers.get('x-correlation-id'), 'incident-456');
  });

  test('replaces unsafe or oversized identifiers', () => {
    const request = {
      headers: {
        'x-request-id': 'contains spaces',
        'x-correlation-id': 'x'.repeat(129),
      },
    } as unknown as IncomingMessage;
    const { response, headers } = responseRecorder();

    const generatedRequestId = assignRequestContext(request, response);
    assert.match(generatedRequestId, /^[0-9a-f-]{36}$/);
    assert.equal(headers.get('x-correlation-id'), generatedRequestId);
  });
});

describe('runtime health', () => {
  const options = { serviceName: 'incidentlens-test' } as const;
  const fixedTime = new Date('2026-01-01T00:00:00.000Z');

  test('returns an independent liveness result', () => {
    assert.deepEqual(createLivenessReport(options.serviceName, fixedTime), {
      status: 'ok',
      service: 'incidentlens-test',
      timestamp: fixedTime.toISOString(),
    });
  });

  test('reports ready only when PostgreSQL, pgvector, and Redis are healthy', async () => {
    const report = await createReadinessReport(
      options,
      postgresClient(async () => ({ rows: [{ extversion: '0.8.7' }] })),
      redisClient(),
      fixedTime,
    );

    assert.equal(report.status, 'ok');
    assert.equal(report.dependencies.postgres.status, 'up');
    assert.equal(report.dependencies.redis.status, 'up');
    assert.ok(report.dependencies.postgres.latencyMs >= 0);
  });

  test('reports an unavailable PostgreSQL connection without leaking its error', async () => {
    const report = await createReadinessReport(
      options,
      postgresClient(() => Promise.reject(new Error('password=must-not-appear'))),
      redisClient(),
      fixedTime,
    );

    assert.equal(report.status, 'error');
    assert.equal(report.dependencies.postgres.status, 'down');
    assert.equal(JSON.stringify(report).includes('must-not-appear'), false);
  });

  test('treats a missing vector extension as an unhealthy PostgreSQL dependency', async () => {
    const report = await createReadinessReport(
      options,
      postgresClient(async () => ({ rows: [] })),
      redisClient(),
      fixedTime,
    );

    assert.equal(report.status, 'error');
    assert.equal(report.dependencies.postgres.status, 'down');
  });

  test('reports Redis connection and ping failures as unhealthy', async () => {
    const report = await createReadinessReport(
      options,
      postgresClient(async () => ({ rows: [{ extversion: '0.8.7' }] })),
      redisClient({
        status: 'wait',
        connect: () => Promise.reject(new Error('connection refused')),
      }),
      fixedTime,
    );

    assert.equal(report.status, 'error');
    assert.equal(report.dependencies.redis.status, 'down');
  });
});
