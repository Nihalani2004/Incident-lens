import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApiCorsOptions } from '../src/cors.ts';

test('restricts browser access to the configured web origin', () => {
  const options = createApiCorsOptions('https://incidentlens.example.com');

  assert.equal(options.origin, 'https://incidentlens.example.com');
  assert.equal(options.credentials, true);
  assert.deepEqual(options.allowedHeaders, ['Content-Type', 'X-Correlation-ID', 'X-Request-ID']);
  assert.deepEqual(options.exposedHeaders, ['X-Correlation-ID', 'X-Request-ID']);
});
