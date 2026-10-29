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
      ['packages/runtime/package.json', '@incidentlens/runtime'],
    ]);

    for (const [manifestPath, packageName] of expectedPackages) {
      const manifest = readJson(manifestPath);
      assert.equal(manifest.name, packageName);
      assert.equal(manifest.private, true);
      assert.equal(typeof manifest.scripts.typecheck, 'string');
      assert.equal(typeof manifest.scripts.build, 'string');
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

  test('does not introduce Phase 1D persistence or queue behavior', async () => {
    const forbiddenArtifacts = ['prisma/schema.prisma', 'drizzle.config.ts'];

    for (const artifact of forbiddenArtifacts) {
      assert.equal(await exists(artifact), false, `${join('.', artifact)} is outside Phase 1C`);
    }
  });
});
