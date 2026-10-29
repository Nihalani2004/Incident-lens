import process from 'node:process';

import { Pool } from 'pg';

import { migrateDown, migrateUp } from './migrations.ts';

async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run database migrations.');
  }

  const direction = process.argv[2];
  if (direction !== 'up' && direction !== 'down') {
    throw new Error('Migration direction must be either "up" or "down".');
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const result = direction === 'up' ? await migrateUp(pool) : await migrateDown(pool);
    process.stdout.write(`${JSON.stringify({ direction, ...result })}\n`);
  } finally {
    await pool.end();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure.';
  process.stderr.write(`Database migration failed: ${message}\n`);
  process.exitCode = 1;
});
