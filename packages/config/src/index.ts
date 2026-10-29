import { z } from 'zod';

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']);
const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

const commonEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  LOG_LEVEL: logLevelSchema.default('info'),
});

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
    message: 'Must use the postgres or postgresql protocol.',
  });

const redisUrlSchema = z
  .string()
  .url()
  .refine((value) => ['redis:', 'rediss:'].includes(new URL(value).protocol), {
    message: 'Must use the redis or rediss protocol.',
  });

const runtimeEnvironmentSchema = commonEnvironmentSchema.extend({
  DATABASE_URL: databaseUrlSchema,
  REDIS_URL: redisUrlSchema,
  DEPENDENCY_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(2_000),
  POSTGRES_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
});

const apiEnvironmentSchema = runtimeEnvironmentSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
});

const webEnvironmentSchema = commonEnvironmentSchema.extend({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).max(64).default('IncidentLens'),
});

const workerEnvironmentSchema = runtimeEnvironmentSchema.extend({
  WORKER_PORT: z.coerce.number().int().min(1).max(65_535).default(4001),
});

const localRuntimeDefaults = Object.freeze({
  DATABASE_URL: 'postgresql://incidentlens:incidentlens_local@localhost:5432/incidentlens',
  REDIS_URL: 'redis://localhost:6379',
});

export type ApiEnvironment = Readonly<z.infer<typeof apiEnvironmentSchema>>;
export type WebEnvironment = Readonly<z.infer<typeof webEnvironmentSchema>>;
export type WorkerEnvironment = Readonly<z.infer<typeof workerEnvironmentSchema>>;

export interface EnvironmentIssue {
  readonly path: string;
  readonly message: string;
}

export class EnvironmentValidationError extends Error {
  readonly scope: string;
  readonly issues: readonly EnvironmentIssue[];

  constructor(scope: string, issues: readonly EnvironmentIssue[]) {
    super(`Invalid ${scope} environment configuration.`);
    this.name = 'EnvironmentValidationError';
    this.scope = scope;
    this.issues = issues;
  }
}

function parseEnvironment<TSchema extends z.ZodType>(
  scope: string,
  schema: TSchema,
  source: EnvironmentSource,
): Readonly<z.output<TSchema>> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new EnvironmentValidationError(
      scope,
      parsed.error.issues.map((entry) => ({
        path: entry.path.join('.') || '$',
        message: entry.message,
      })),
    );
  }
  return Object.freeze(parsed.data);
}

function withLocalRuntimeDefaults(source: EnvironmentSource): EnvironmentSource {
  if (source.NODE_ENV === 'production') {
    return source;
  }

  return {
    ...localRuntimeDefaults,
    ...source,
  };
}

export function validateApiEnvironment(source: EnvironmentSource): ApiEnvironment {
  return parseEnvironment('API', apiEnvironmentSchema, withLocalRuntimeDefaults(source));
}

export function validateWebEnvironment(source: EnvironmentSource): WebEnvironment {
  return parseEnvironment('web', webEnvironmentSchema, source);
}

export function validateWorkerEnvironment(source: EnvironmentSource): WorkerEnvironment {
  return parseEnvironment('worker', workerEnvironmentSchema, withLocalRuntimeDefaults(source));
}
