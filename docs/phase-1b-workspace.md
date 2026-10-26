# Phase 1B workspace foundation

## Outcome

Phase 1B establishes one pnpm workspace with independently deployable web, API, and worker processes
plus shared contracts and environment validation. It deliberately contains no product workflow,
database connection, queue consumer, integration, or AI implementation.

## Workspace boundaries

| Package                   | Responsibility in Phase 1B                                            |
| ------------------------- | --------------------------------------------------------------------- |
| `@incidentlens/web`       | Next.js application shell and frontend build boundary.                |
| `@incidentlens/api`       | NestJS HTTP-process bootstrap boundary. No routes are introduced yet. |
| `@incidentlens/worker`    | Independent NestJS process boundary. Queue consumers are deferred.    |
| `@incidentlens/contracts` | Buildable Phase 1A domain contracts, policies, fixtures, and tests.   |
| `@incidentlens/config`    | Shared, typed runtime environment parsing with safe defaults.         |

The existing Phase 1A `contracts/` location is preserved to avoid a disruptive move. It is a first-
class workspace package and may be relocated only through a separately reviewed refactor.

## Tooling decisions

- pnpm is the only package manager; one lockfile is stored at the repository root.
- Node.js 20.20.0 is the documented baseline. Newer compatible Node versions may be used.
- NestJS 11 is intentionally selected because it supports the Node 20 baseline; NestJS 12 requires a
  newer Node LTS line and is therefore outside the current compatibility target.
- Strict TypeScript rules are inherited from `tsconfig.base.json`.
- Shared packages emit JavaScript and declarations before executable applications build, allowing
  future runtime consumers to use package exports without importing raw TypeScript.
- The web type-check command generates framework route types before invoking TypeScript, keeping a
  clean checkout reproducible without committed `.next` output.
- ESLint uses a shared flat configuration.
- Prettier and EditorConfig define formatting and line-ending behavior.
- Package scripts remain explicit; an orchestration framework is unnecessary at this scale.
- Tailwind CSS is configured for the web foundation. shadcn/ui and TanStack packages will be added
  only when a Phase requires their functionality.
- The shared configuration package uses Zod because environment values are untrusted runtime input.

## Environment management

Every executable process has a committed `.env.example` containing safe local defaults. Actual
`.env` files are ignored. The configuration validator:

- applies defaults for local development;
- validates URLs, enum values, and TCP port boundaries;
- returns immutable top-level configuration;
- reports field names without placing rejected values in the top-level error message; and
- validates configuration before an application begins accepting work.

No secret-valued environment variable exists in Phase 1B. Database, Redis, integration, and AI
credentials will be introduced only with the Phase that consumes them.

## Docker decision

Docker remains intentionally excluded. Local and hosted processes use package scripts and managed
dependencies. Docker compatibility can be added later without changing the workspace boundaries.

## Commands

From the repository root:

```sh
pnpm install
pnpm check
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

`pnpm check` runs formatting verification, linting, strict type checks, unit/contract tests,
workspace acceptance tests, and production builds.

## Deferred to Phase 1C or later

- PostgreSQL and Redis connectivity.
- Database schema and migrations.
- API health endpoints.
- BullMQ queues and workers.
- Request correlation IDs and production logging configuration.
- Authentication, integrations, incident workflows, and AI behavior.
- Dockerfiles and Compose configuration.
