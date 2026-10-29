import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  EnvironmentValidationError,
  validateApiEnvironment,
  validateWebEnvironment,
  validateWorkerEnvironment,
} from '../src/index.ts';

describe('environment validation', () => {
  test('provides safe local defaults without secrets', () => {
    assert.deepEqual(validateApiEnvironment({}), {
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://incidentlens:incidentlens_local@localhost:5432/incidentlens',
      REDIS_URL: 'redis://localhost:6379',
      DEPENDENCY_TIMEOUT_MS: 2_000,
      POSTGRES_POOL_MAX: 10,
      API_PORT: 4000,
      WEB_ORIGIN: 'http://localhost:3000',
    });
    assert.deepEqual(validateWebEnvironment({}), {
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
      NEXT_PUBLIC_APP_NAME: 'IncidentLens',
    });
    assert.deepEqual(validateWorkerEnvironment({}), {
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://incidentlens:incidentlens_local@localhost:5432/incidentlens',
      REDIS_URL: 'redis://localhost:6379',
      DEPENDENCY_TIMEOUT_MS: 2_000,
      POSTGRES_POOL_MAX: 10,
      WORKER_PORT: 4001,
    });
  });

  test('coerces a valid API port and preserves explicit values', () => {
    assert.deepEqual(
      validateApiEnvironment({
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        DATABASE_URL: 'postgresql://app:local@database.example.com:5432/incidentlens',
        REDIS_URL: 'rediss://cache.example.com:6380',
        DEPENDENCY_TIMEOUT_MS: '5000',
        POSTGRES_POOL_MAX: '20',
        API_PORT: '5050',
        WEB_ORIGIN: 'https://incidentlens.example.com',
      }),
      {
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        DATABASE_URL: 'postgresql://app:local@database.example.com:5432/incidentlens',
        REDIS_URL: 'rediss://cache.example.com:6380',
        DEPENDENCY_TIMEOUT_MS: 5_000,
        POSTGRES_POOL_MAX: 20,
        API_PORT: 5050,
        WEB_ORIGIN: 'https://incidentlens.example.com',
      },
    );
  });

  test('accepts inclusive TCP port boundaries', () => {
    assert.equal(validateApiEnvironment({ API_PORT: '1' }).API_PORT, 1);
    assert.equal(validateApiEnvironment({ API_PORT: '65535' }).API_PORT, 65_535);
  });

  test('rejects invalid ports, URLs, and enum values', () => {
    const invalidSources = [
      { API_PORT: '0' },
      { API_PORT: '65536' },
      { API_PORT: 'not-a-number' },
      { WEB_ORIGIN: 'not-a-url' },
      { DATABASE_URL: 'https://database.example.com/incidentlens' },
      { REDIS_URL: 'https://cache.example.com' },
      { DEPENDENCY_TIMEOUT_MS: '99' },
      { DEPENDENCY_TIMEOUT_MS: '30001' },
      { POSTGRES_POOL_MAX: '0' },
      { NODE_ENV: 'staging' },
      { LOG_LEVEL: 'verbose' },
    ];

    for (const source of invalidSources) {
      assert.throws(() => validateApiEnvironment(source), EnvironmentValidationError);
    }
  });

  test('requires dependency URLs in production', () => {
    assert.throws(
      () => validateApiEnvironment({ NODE_ENV: 'production' }),
      (error: unknown) => {
        assert.ok(error instanceof EnvironmentValidationError);
        assert.deepEqual(error.issues.map((issue) => issue.path).sort(), [
          'DATABASE_URL',
          'REDIS_URL',
        ]);
        return true;
      },
    );
    assert.throws(
      () => validateWorkerEnvironment({ NODE_ENV: 'production' }),
      (error: unknown) => {
        assert.ok(error instanceof EnvironmentValidationError);
        assert.deepEqual(error.issues.map((issue) => issue.path).sort(), [
          'DATABASE_URL',
          'REDIS_URL',
        ]);
        return true;
      },
    );
  });

  test('validates the worker health port boundaries', () => {
    assert.equal(validateWorkerEnvironment({ WORKER_PORT: '1' }).WORKER_PORT, 1);
    assert.equal(validateWorkerEnvironment({ WORKER_PORT: '65535' }).WORKER_PORT, 65_535);
    assert.throws(
      () => validateWorkerEnvironment({ WORKER_PORT: '65536' }),
      EnvironmentValidationError,
    );
  });

  test('does not expose rejected environment values in the top-level error message', () => {
    const secretLikeValue = 'https://user:password@example.com extra-invalid-data';
    assert.throws(
      () => validateWebEnvironment({ NEXT_PUBLIC_API_BASE_URL: secretLikeValue }),
      (error: unknown) => {
        assert.ok(error instanceof EnvironmentValidationError);
        assert.equal(error.message.includes(secretLikeValue), false);
        assert.equal(error.scope, 'web');
        assert.ok(error.issues.some((entry) => entry.path === 'NEXT_PUBLIC_API_BASE_URL'));
        return true;
      },
    );
  });

  test('returns immutable top-level configuration', () => {
    assert.equal(Object.isFrozen(validateApiEnvironment({})), true);
  });
});
