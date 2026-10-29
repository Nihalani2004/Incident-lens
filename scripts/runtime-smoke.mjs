import assert from 'node:assert/strict';

const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
const workerUrl = process.env.WORKER_URL ?? 'http://localhost:4001';
const timeoutMs = 5_000;

async function request(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function verifyHealth(baseUrl, serviceName) {
  const correlationId = `smoke-${serviceName}`;
  const liveResponse = await request(`${baseUrl}/health/live`, {
    headers: { 'x-correlation-id': correlationId },
  });
  assert.equal(liveResponse.status, 200);
  assert.equal(liveResponse.headers.get('x-correlation-id'), correlationId);

  const live = await liveResponse.json();
  assert.equal(live.status, 'ok');
  assert.equal(live.service, serviceName);

  const readyResponse = await request(`${baseUrl}/health/ready`);
  assert.equal(readyResponse.status, 200);
  const ready = await readyResponse.json();
  assert.equal(ready.status, 'ok', JSON.stringify(ready));
  assert.equal(ready.dependencies.postgres.status, 'up');
  assert.equal(ready.dependencies.redis.status, 'up');
}

const webResponse = await request(webUrl);
assert.equal(webResponse.status, 200);
assert.match(await webResponse.text(), /IncidentLens/);

const preflightResponse = await request(`${apiUrl}/health/ready`, {
  method: 'OPTIONS',
  headers: {
    origin: webUrl,
    'access-control-request-method': 'GET',
    'access-control-request-headers': 'x-correlation-id',
  },
});
assert.equal(preflightResponse.status, 204);
assert.equal(preflightResponse.headers.get('access-control-allow-origin'), webUrl);

await verifyHealth(apiUrl, 'incidentlens-api');
await verifyHealth(workerUrl, 'incidentlens-worker');

console.log('IncidentLens local runtime smoke check passed.');
