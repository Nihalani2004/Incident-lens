import { readdir, readFile } from 'node:fs/promises';

import type { Pool, PoolClient } from 'pg';

const migrationFilePattern = /^(\d{4})_([a-z0-9_]+)\.(up|down)\.sql$/;
const migrationLockId = 20_261_030;

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly upSql: string;
  readonly downSql: string;
}

export interface MigrationResult {
  readonly applied: readonly number[];
  readonly rolledBack: readonly number[];
}

interface PartialMigration {
  version: number;
  name: string;
  upSql?: string;
  downSql?: string;
}

export const defaultMigrationsDirectory = new URL('../migrations/', import.meta.url);

export async function loadMigrations(
  directory: URL = defaultMigrationsDirectory,
): Promise<readonly Migration[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const migrations = new Map<number, PartialMigration>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const match = migrationFilePattern.exec(entry.name);
    if (!match) continue;

    const [, versionText, name, direction] = match;
    if (versionText === undefined || name === undefined || direction === undefined) continue;

    const version = Number(versionText);
    const existing = migrations.get(version);
    if (existing && existing.name !== name) {
      throw new Error(`Migration version ${versionText} has conflicting names.`);
    }

    const migration = existing ?? { version, name };
    const sql = await readFile(new URL(entry.name, directory), 'utf8');
    if (direction === 'up') migration.upSql = sql;
    else migration.downSql = sql;
    migrations.set(version, migration);
  }

  const complete = [...migrations.values()]
    .sort((left, right) => left.version - right.version)
    .map((migration): Migration => {
      if (migration.upSql === undefined || migration.downSql === undefined) {
        throw new Error(
          `Migration ${String(migration.version).padStart(4, '0')}_${migration.name} requires both up and down files.`,
        );
      }

      return Object.freeze({
        version: migration.version,
        name: migration.name,
        upSql: migration.upSql,
        downSql: migration.downSql,
      });
    });

  if (complete.length === 0) throw new Error('No database migrations were found.');
  return Object.freeze(complete);
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.incidentlens_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function withMigrationLock<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId]);
    await ensureMigrationTable(client);
    return await operation(client);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId]).catch(() => undefined);
    client.release();
  }
}

export async function migrateUp(
  pool: Pool,
  directory: URL = defaultMigrationsDirectory,
): Promise<MigrationResult> {
  const migrations = await loadMigrations(directory);

  return withMigrationLock(pool, async (client) => {
    const appliedRows = await client.query<{ version: number; name: string }>(
      'SELECT version, name FROM public.incidentlens_migrations ORDER BY version',
    );
    const applied = new Map(appliedRows.rows.map((row) => [row.version, row.name]));

    for (const migration of migrations) {
      const appliedName = applied.get(migration.version);
      if (appliedName !== undefined && appliedName !== migration.name) {
        throw new Error(`Applied migration ${migration.version} does not match ${migration.name}.`);
      }
    }

    const pending = migrations.filter((migration) => !applied.has(migration.version));
    const versions: number[] = [];
    for (const migration of pending) {
      await client.query('BEGIN');
      try {
        await client.query(migration.upSql);
        await client.query(
          'INSERT INTO public.incidentlens_migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name],
        );
        await client.query('COMMIT');
        versions.push(migration.version);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    return { applied: versions, rolledBack: [] };
  });
}

export async function migrateDown(
  pool: Pool,
  steps = 1,
  directory: URL = defaultMigrationsDirectory,
): Promise<MigrationResult> {
  if (!Number.isSafeInteger(steps) || steps < 1) {
    throw new Error('Rollback steps must be a positive integer.');
  }

  const migrations = await loadMigrations(directory);
  const byVersion = new Map(migrations.map((migration) => [migration.version, migration]));

  return withMigrationLock(pool, async (client) => {
    const appliedRows = await client.query<{ version: number; name: string }>(
      'SELECT version, name FROM public.incidentlens_migrations ORDER BY version DESC LIMIT $1',
      [steps],
    );
    const versions: number[] = [];

    for (const applied of appliedRows.rows) {
      const migration = byVersion.get(applied.version);
      if (!migration || migration.name !== applied.name) {
        throw new Error(`Cannot roll back unknown migration ${applied.version}.`);
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.downSql);
        await client.query('DELETE FROM public.incidentlens_migrations WHERE version = $1', [
          migration.version,
        ]);
        await client.query('COMMIT');
        versions.push(migration.version);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    return { applied: [], rolledBack: versions };
  });
}
