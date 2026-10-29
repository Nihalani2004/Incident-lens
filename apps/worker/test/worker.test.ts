import assert from 'node:assert/strict';
import { test } from 'node:test';

import { startQualityGateWorker, type ManagedQueueWorker } from '../src/quality-gate.worker.ts';

test('starts the worker with the validated Redis URL', () => {
  let receivedUrl: string | undefined;
  const fakeWorker: ManagedQueueWorker = {
    close: () => Promise.resolve(),
    on: () => undefined,
    waitUntilReady: () => Promise.resolve(),
  };

  const result = startQualityGateWorker('redis://localhost:6379', (redisUrl) => {
    receivedUrl = redisUrl;
    return fakeWorker;
  });

  assert.equal(receivedUrl, 'redis://localhost:6379');
  assert.equal(result, fakeWorker);
});
