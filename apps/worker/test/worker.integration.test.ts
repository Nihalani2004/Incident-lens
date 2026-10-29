import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { runQualityGateProbe } from '@incidentlens/queue';

import { startQualityGateWorker } from '../src/quality-gate.worker.ts';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

test('processes a quality-gate job through Redis and BullMQ', async () => {
  const worker = startQualityGateWorker(redisUrl);
  worker.on('error', () => undefined);

  try {
    await worker.waitUntilReady();
    const probeId = randomUUID();
    const result = await runQualityGateProbe(redisUrl, {
      probeId,
      requestedAt: new Date().toISOString(),
    });

    assert.equal(result.probeId, probeId);
    assert.equal(result.status, 'processed');
    assert.equal(Number.isFinite(Date.parse(result.processedAt)), true);
  } finally {
    await worker.close();
  }
});
