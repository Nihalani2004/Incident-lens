import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, test } from 'node:test';

import { loadMigrations, migrateDown } from '../src/index.ts';

describe('database migrations', () => {
  test('loads ordered, reversible migration pairs', async () => {
    const migrations = await loadMigrations();
    assert.deepEqual(
      migrations.map(({ version, name }) => ({ version, name })),
      [{ version: 1, name: 'create_incidentlens_schema' }],
    );
    assert.match(migrations[0]?.upSql ?? '', /CREATE SCHEMA/);
    assert.match(migrations[0]?.downSql ?? '', /DROP SCHEMA/);
  });

  test('rejects a migration without a rollback file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'incidentlens-migrations-'));
    try {
      await writeFile(join(directory, '0001_incomplete.up.sql'), 'SELECT 1;', 'utf8');
      await assert.rejects(
        loadMigrations(new URL(`${pathToFileURL(directory).href}/`)),
        /requires both up and down files/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects invalid rollback boundaries before opening a connection', async () => {
    await assert.rejects(migrateDown({} as never, 0), /positive integer/);
    await assert.rejects(migrateDown({} as never, 1.5), /positive integer/);
  });
});
