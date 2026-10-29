import type { RedisOptions } from 'bullmq';

export type QueueConnectionRole = 'producer' | 'worker';

export function createQueueConnectionOptions(
  redisUrl: string,
  role: QueueConnectionRole,
): RedisOptions {
  const parsed = new URL(redisUrl);
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('Queue connections require a redis or rediss URL.');
  }

  const database = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0;
  if (!Number.isSafeInteger(database) || database < 0) {
    throw new Error('The Redis database index must be a non-negative integer.');
  }

  return {
    db: database,
    enableReadyCheck: true,
    host: parsed.hostname,
    maxRetriesPerRequest: role === 'worker' ? null : 1,
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
  };
}
