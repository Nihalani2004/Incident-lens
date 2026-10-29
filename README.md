# IncidentLens

IncidentLens currently includes **Phase 1A: Product and Data Contracts**, **Phase 1B: Workspace
Foundation**, **Phase 1C: Local Runtime**, and **Phase 1D: Quality Gates**.

The repository provides validated domain contracts plus connected web, API, worker, PostgreSQL with
pgvector, Redis/BullMQ runtime boundaries, reversible migration tooling, and automated quality
gates. Product persistence and incident workflows begin in later roadmap phases.

## Phase 1A documentation

- [MVP scope and terminology](docs/product/mvp-scope.md)
- [Canonical data contracts](docs/domain/data-contracts.md)
- [Incident and regression policies](docs/domain/incident-policies.md)
- [Acceptance-criteria traceability](docs/phase-1a-traceability.md)

## Workspace requirements

- Node.js 22.13.0 or newer
- pnpm 10.28 or newer
- Docker Desktop with Docker Compose

Docker is required for the Phase 1C local PostgreSQL and Redis services.

## Setup and verification

From the repository root, install JavaScript dependencies and the browser used by the smoke test:

```powershell
pnpm install
pnpm exec playwright install chromium
```

Start the complete local runtime with one command:

```powershell
pnpm dev
```

`pnpm dev` starts PostgreSQL/pgvector and Redis through Docker Compose, waits for them to become
healthy, and then starts the web, API, and worker processes. In a second terminal, verify the full
runtime:

The command prints the local web and health-check URLs before starting the application processes. In
terminals such as VS Code, hold `Ctrl` and click `http://localhost:3000` to open the web app.

```powershell
pnpm runtime:smoke
```

The local endpoints are:

- Web: `http://localhost:3000`
- API liveness/readiness: `http://localhost:4000/health/live` and `/health/ready`
- Worker liveness/readiness: `http://localhost:4001/health/live` and `/health/ready`

Run the complete static quality gate with `pnpm check`. The integration and browser checks are
separate because they require Docker services:

```powershell
pnpm test:integration
pnpm test:e2e
```

Stop the application processes with `Ctrl+C`, then stop infrastructure with `pnpm runtime:down`.

If file changes are not detected reliably from a OneDrive-synchronized checkout, use
`pnpm dev:poll`. It selects polling for TypeScript and the webpack-based web watcher. The normal
`pnpm dev` remains the faster default.

To run all services locally without file watchers, use the production builds:

```powershell
pnpm start
```

This command starts the Docker dependencies, builds the workspace, prints the local service URLs,
and starts the web, API, and worker processes. Rebuild and restart it after changing source files.

## Database migrations

Migration commands require an explicit database URL so production configuration can never silently
fall back to local credentials:

```powershell
$env:DATABASE_URL = "postgresql://incidentlens:incidentlens_local@localhost:5432/incidentlens"
pnpm db:migrate
pnpm db:rollback
```

The integration suite creates a disposable database and verifies migrate, idempotent migrate, and
rollback behavior without modifying the normal development database.

## Phase 1B documentation

- [Workspace decisions and commands](docs/phase-1b-workspace.md)
- [Acceptance-criteria traceability](docs/phase-1b-traceability.md)

## Phase 1C documentation

- [Local runtime operations and decisions](docs/phase-1c-local-runtime.md)
- [Acceptance-criteria traceability](docs/phase-1c-traceability.md)

## Phase 1D documentation

- [Quality gates, testing, migrations, and queue compatibility](docs/phase-1d-quality-gates.md)
- [Acceptance-criteria traceability](docs/phase-1d-traceability.md)
