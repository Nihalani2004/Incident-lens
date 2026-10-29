# Phase 1C local runtime

## Outcome

Phase 1C connects the existing web, API, and worker boundaries to a reproducible local PostgreSQL
and Redis runtime. It adds health probes, structured request logging, and correlation propagation
without introducing product tables, migrations, queues, authentication, integrations, or AI
behavior.

## Runtime services

| Service    | Local address           | Responsibility                                    |
| ---------- | ----------------------- | ------------------------------------------------- |
| Web        | `http://localhost:3000` | Displays browser-to-API runtime connectivity.     |
| API        | `http://localhost:4000` | HTTP boundary and dependency health endpoints.    |
| Worker     | `http://localhost:4001` | Worker process with independent health endpoints. |
| PostgreSQL | `localhost:5432`        | PostgreSQL 17 with pgvector 0.8.7 enabled.        |
| Redis      | `localhost:6379`        | Redis 8.10.2 local runtime dependency.            |

PostgreSQL and Redis ports bind to loopback only. Their data is stored in named Docker volumes. The
committed database credentials are development-only defaults and must never be reused outside the
local Compose runtime.

## One-command startup

Install dependencies once, then start the complete local runtime:

```powershell
pnpm install
pnpm dev
```

`pnpm dev` runs `docker compose up --detach --wait`, builds shared packages, and starts the three
application processes. Keep that terminal open. Verify the complete path from a second terminal:

```powershell
pnpm runtime:smoke
```

The smoke check verifies the web response, browser CORS path, API and worker liveness/readiness,
PostgreSQL/pgvector, Redis, and correlation response headers.

Stop the application processes with `Ctrl+C`, then stop the infrastructure containers:

```powershell
pnpm runtime:down
```

Named volumes are intentionally preserved by this command.

## Health semantics

Both API and worker expose:

- `GET /health/live`: reports only whether the process can serve HTTP.
- `GET /health/ready`: returns `200` only when PostgreSQL is reachable, the `vector` extension is
  installed, and Redis responds to `PING`. Otherwise it returns `503` with dependency status but no
  connection error or credential details.

The PostgreSQL initialization script runs `CREATE EXTENSION IF NOT EXISTS vector`. Readiness checks
the installed extension independently, so a stale or incorrectly initialized database volume is
reported as unhealthy.

## Configuration

Development defaults match `compose.yml`. API and worker settings are documented in their respective
`.env.example` files. In `NODE_ENV=production`, `DATABASE_URL` and `REDIS_URL` are required and no
local connection defaults are applied.

Supported runtime settings:

| Variable                | Purpose                                  | Development default      |
| ----------------------- | ---------------------------------------- | ------------------------ |
| `DATABASE_URL`          | PostgreSQL connection string             | Local Compose URL        |
| `REDIS_URL`             | Redis connection string                  | `redis://localhost:6379` |
| `DEPENDENCY_TIMEOUT_MS` | Connection/command timeout, 100–30000 ms | `2000`                   |
| `POSTGRES_POOL_MAX`     | Maximum connections per process, 1–50    | `10`                     |
| `API_PORT`              | API HTTP port                            | `4000`                   |
| `WORKER_PORT`           | Worker health HTTP port                  | `4001`                   |

## Observability

API and worker logs are newline-delimited JSON through Pino. Each HTTP request receives an
`x-request-id`; a valid incoming `x-correlation-id` is preserved or defaults to the request ID. Both
values are returned as response headers. Authorization and cookie headers are redacted from request
logs. Identifiers are restricted to 128 safe characters to prevent log injection.

## Verification commands

```powershell
pnpm check
pnpm test:integration
pnpm runtime:smoke
```

`pnpm test:integration` starts the Compose dependencies and directly verifies PostgreSQL, pgvector,
and Redis. `pnpm runtime:smoke` expects `pnpm dev` to be running.

## Deferred beyond Phase 1C

- Product database schema, migrations, repositories, and seed data.
- BullMQ queues, processors, retries, and scheduled jobs.
- Authentication, tenant authorization, integrations, incident workflows, and AI analysis.
- Application container images and production infrastructure definitions.
