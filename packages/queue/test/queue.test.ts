import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createQueueConnectionOptions, processQualityGateJob } from '../src/index.ts';

describe('queue connection configuration', () => {
  test('uses bounded producer retries and BullMQ-compatible worker retries', () => {
    assert.equal(
      createQueueConnectionOptions('redis://localhost:6379/2', 'producer').maxRetriesPerRequest,
      1,
    );
    const worker = createQueueConnectionOptions(
      'rediss://user:password@cache.example.com:6380/3',
      'worker',
    );
    assert.equal(worker.maxRetriesPerRequest, null);
    assert.equal(worker.db, 3);
    assert.deepEqual(worker.tls, {});
  });

  test('rejects invalid protocols and database indexes', () => {
    assert.throws(
      () => createQueueConnectionOptions('https://cache.example.com', 'producer'),
      /redis or rediss/,
    );
    assert.throws(
      () => createQueueConnectionOptions('redis://localhost/not-a-number', 'producer'),
      /database index/,
    );
  });
});

describe('quality-gate job processor', () => {
  test('returns a deterministic processed result', () => {
    const result = processQualityGateJob(
      { probeId: 'probe-001', requestedAt: '2026-10-30T00:00:00.000Z' },
      new Date('2026-10-30T00:00:01.000Z'),
    );
    assert.deepEqual(result, {
      probeId: 'probe-001',
      processedAt: '2026-10-30T00:00:01.000Z',
      status: 'processed',
    });
  });

  test('rejects malformed probe jobs', () => {
    assert.throws(
      () => processQualityGateJob({ probeId: ' ', requestedAt: '2026-10-30T00:00:00.000Z' }),
      /probe ID/,
    );
    assert.throws(
      () => processQualityGateJob({ probeId: 'probe-001', requestedAt: 'invalid' }),
      /ISO timestamp/,
    );
  });
});
