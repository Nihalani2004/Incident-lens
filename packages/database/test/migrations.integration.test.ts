import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { Client, Pool } from 'pg';

import { migrateDown, migrateUp } from '../src/index.ts';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://incidentlens:incidentlens_local@localhost:5432/incidentlens';

test('applies and rolls back migrations on a disposable database', async () => {
  const databaseName = `incidentlens_test_${randomUUID().replaceAll('-', '')}`;
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  const testUrl = new URL(databaseUrl);
  testUrl.pathname = `/${databaseName}`;
  const admin = new Client({ connectionString: adminUrl.toString() });
  let pool: Pool | undefined;

  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    pool = new Pool({ connectionString: testUrl.toString(), max: 2 });

    const up = await migrateUp(pool);
    assert.deepEqual(up.applied, [1]);
    const schemaAfterUp = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'incidentlens') AS exists",
    );
    assert.equal(schemaAfterUp.rows[0]?.exists, true);

    const secondUp = await migrateUp(pool);
    assert.deepEqual(secondUp.applied, []);

    const down = await migrateDown(pool);
    assert.deepEqual(down.rolledBack, [1]);
    const schemaAfterDown = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'incidentlens') AS exists",
    );
    assert.equal(schemaAfterDown.rows[0]?.exists, false);
  } finally {
    await pool?.end();
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [
      databaseName,
    ]);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  }
});
