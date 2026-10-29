import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const repositoryRoot = new URL('../', import.meta.url);

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, repositoryRoot), 'utf8'));
}

async function exists(relativePath) {
  try {
    await access(new URL(relativePath, repositoryRoot));
    return true;
  } catch {
    return false;
  }
}

describe('workspace structure', () => {
  test('declares one package manager and all approved package boundaries', () => {
    const rootPackage = readJson('package.json');
    assert.match(rootPackage.packageManager, /^pnpm@10\./);

    const expectedPackages = new Map([
      ['apps/web/package.json', '@incidentlens/web'],
      ['apps/api/package.json', '@incidentlens/api'],
      ['apps/worker/package.json', '@incidentlens/worker'],
      ['contracts/package.json', '@incidentlens/contracts'],
      ['packages/config/package.json', '@incidentlens/config'],
      ['packages/database/package.json', '@incidentlens/database'],
      ['packages/queue/package.json', '@incidentlens/queue'],
      ['packages/runtime/package.json', '@incidentlens/runtime'],
    ]);

    for (const [manifestPath, packageName] of expectedPackages) {
      const manifest = readJson(manifestPath);
      assert.equal(manifest.name, packageName);
      assert.equal(manifest.private, true);
      assert.equal(typeof manifest.scripts.typecheck, 'string');
      assert.equal(typeof manifest.scripts.build, 'string');
      assert.equal(typeof manifest.scripts['test:unit'], 'string');
    }
  });

  test('keeps safe environment templates for every executable process', () => {
    const examples = ['apps/web/.env.example', 'apps/api/.env.example', 'apps/worker/.env.example'];
    const forbiddenAssignment = /(?:secret|password|token|api_key)\s*=\s*[^\s]/i;

    for (const example of examples) {
      const contents = readFileSync(new URL(example, repositoryRoot), 'utf8');
      assert.equal(
        forbiddenAssignment.test(contents),
        false,
        `${example} must not contain secrets`,
      );
      assert.match(contents, /^NODE_ENV=development$/m);
      assert.match(contents, /^LOG_LEVEL=info$/m);
    }
  });

  test('declares the complete Phase 1C local runtime boundary', async () => {
    const requiredArtifacts = [
      'compose.yml',
      'infra/postgres/init/001-enable-vector.sql',
      'scripts/runtime-smoke.mjs',
    ];

    for (const artifact of requiredArtifacts) {
      assert.equal(await exists(artifact), true, `${join('.', artifact)} is required by Phase 1C`);
    }

    const rootPackage = readJson('package.json');
    assert.match(rootPackage.scripts.dev, /runtime:up/);
    assert.equal(typeof rootPackage.scripts['runtime:smoke'], 'string');

    const compose = readFileSync(new URL('compose.yml', repositoryRoot), 'utf8');
    assert.match(compose, /pgvector\/pgvector:0\.8\.7-pg17-bookworm/);
    assert.match(compose, /redis:8\.10\.2-alpine/);
    assert.match(compose, /healthcheck:/);
  });

  test('declares the Phase 1D quality-gate boundary', async () => {
    const requiredArtifacts = [
      'packages/database/migrations/0001_create_incidentlens_schema.up.sql',
      'packages/database/migrations/0001_create_incidentlens_schema.down.sql',
      'packages/queue/src/quality-gate.ts',
      'playwright.config.ts',
      'tests/e2e/runtime-status.spec.ts',
      'scripts/workspace-boundaries.mjs',
    ];

    for (const artifact of requiredArtifacts) {
      assert.equal(await exists(artifact), true, `${join('.', artifact)} is required by Phase 1D`);
    }

    const rootPackage = readJson('package.json');
    assert.equal(typeof rootPackage.scripts['test:e2e'], 'string');
    assert.equal(typeof rootPackage.scripts['workspace:check'], 'string');
    assert.equal(typeof rootPackage.scripts['db:migrate'], 'string');
    assert.equal(typeof rootPackage.scripts['db:rollback'], 'string');
  });

  test('keeps synthetic incident scenarios reusable and Phase 2 out of scope', async () => {
    const fixtures = readFileSync(
      new URL('contracts/src/fixtures/synthetic-scenarios.ts', repositoryRoot),
      'utf8',
    );
    assert.match(fixtures, /export const syntheticScenarios/);
    assert.match(fixtures, /new_error/);
    assert.match(fixtures, /increased_error_rate/);
    assert.equal(await exists('apps/api/src/incidents'), false);
    assert.equal(await exists('apps/api/src/auth'), false);
  });
});
