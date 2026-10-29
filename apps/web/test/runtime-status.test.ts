import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createApiReadinessUrl, getRuntimeStatusMessage } from '../app/runtime-status.model.ts';

describe('runtime status model', () => {
  test('provides accessible status messages for every state', () => {
    assert.equal(getRuntimeStatusMessage('checking'), 'Checking API and local dependencies…');
    assert.equal(
      getRuntimeStatusMessage('connected'),
      'API, PostgreSQL, pgvector, and Redis are connected.',
    );
    assert.match(getRuntimeStatusMessage('unavailable'), /runtime is unavailable/);
  });

  test('creates one canonical API readiness URL', () => {
    assert.equal(
      createApiReadinessUrl('http://localhost:4000/ignored/path'),
      'http://localhost:4000/health/ready',
    );
  });
});
