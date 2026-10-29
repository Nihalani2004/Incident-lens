# Phase 1D quality gates

## Outcome

Phase 1D makes the Phase 1 foundation reproducible on a clean checkout. It adds unit runners at
every workspace boundary, disposable database migration tests, a real Redis/BullMQ worker probe,
Playwright browser smoke coverage, workspace-cycle validation, and a CI quality gate. It does not
add incident persistence, authentication, external integrations, or AI workflows.

## Test layers

| Layer       | Command                 | Coverage                                                          |
| ----------- | ----------------------- | ----------------------------------------------------------------- |
| Static      | `pnpm check`            | Formatting, lint, boundaries, types, unit tests, production build |
| Integration | `pnpm test:integration` | PostgreSQL/pgvector, migrations/rollback, Redis, BullMQ worker    |
| Runtime     | `pnpm runtime:smoke`    | Web, CORS, API/worker readiness, correlation headers              |
| Browser     | `pnpm test:e2e`         | Chromium page load and visible API dependency health              |

The browser command starts Docker dependencies, builds production artifacts, starts the web and API
servers under Playwright, and then runs the smoke scenario. Install its browser once with
`pnpm exec playwright install chromium`.

## Migration safety

Migration files are immutable up/down SQL pairs under `packages/database/migrations`. The runner:

- serializes migration processes with a PostgreSQL advisory lock;
- applies each migration and tracking-row update in one transaction;
- rejects missing rollback pairs and applied-name mismatches;
- requires an explicit `DATABASE_URL` at the CLI boundary;
- supports an idempotent migrate and a bounded rollback.

The integration test creates a uniquely named disposable database, applies the baseline schema,
verifies an idempotent second run, rolls it back, and drops the database in `finally`. Phase 1D
creates only the `incidentlens` schema boundary; product tables remain deferred.

## Redis and BullMQ compatibility

IncidentLens pins BullMQ 6.5.1, ioredis 5.11.1, and Redis 8.10.2 for the local runtime. BullMQ
requires Redis 6.2 or newer. A future managed service must preserve the Redis commands and Lua
behavior BullMQ requires; this phase deliberately does not select a provider.

Worker connections use `maxRetriesPerRequest: null` and register an error listener so transient
Redis outages do not silently stop processing. Producer connections use one retry so request paths
fail quickly. Queue names and prefixes are stable and versioned.

References:

- <https://docs.bullmq.io/guide/redis-tm-compatibility/>
- <https://docs.bullmq.io/guide/connections>
- <https://docs.bullmq.io/guide/going-to-production>

## OneDrive and file watching

The regular `pnpm dev` uses native watchers. If OneDrive delays or locks filesystem notifications,
use:

```powershell
pnpm dev:poll
```

This enables TypeScript directory/file polling and webpack polling for the web process. Polling uses
more CPU, so it is opt-in. If sync software still locks build artifacts, keep the repository outside
a synchronized folder; generated `.next`, `dist`, coverage, Playwright reports, and test results are
ignored by Git.

## Clean-checkout workflow

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
pnpm test:integration
pnpm test:e2e
```

CI performs the same checks on Node 22.13 with clean PostgreSQL/pgvector and Redis containers. Its
cleanup step always stops containers, including after a failure.

## Phase boundary

The BullMQ job is a deterministic quality-gate probe only. The migration creates an empty schema
boundary only. Neither is a product incident workflow, and no hosted Redis provider is configured.
