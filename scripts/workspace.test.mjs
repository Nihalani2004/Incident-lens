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

  test('does not introduce Phase 1C infrastructure', async () => {
    const forbiddenArtifacts = [
      'Dockerfile',
      'docker-compose.yml',
      'compose.yml',
      'prisma/schema.prisma',
    ];

    for (const artifact of forbiddenArtifacts) {
      assert.equal(await exists(artifact), false, `${join('.', artifact)} is outside Phase 1B`);
    }
  });
});
