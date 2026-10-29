# IncidentLens

IncidentLens currently includes **Phase 1A: Product and Data Contracts**, **Phase 1B: Workspace
Foundation**, and **Phase 1C: Local Runtime**.

The repository provides validated domain contracts plus connected web, API, worker, PostgreSQL with
pgvector, and Redis runtime boundaries. Product persistence and workflows begin in later roadmap
phases.

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

From the repository root:

```powershell
pnpm install
pnpm dev
```

`pnpm dev` starts PostgreSQL/pgvector and Redis through Docker Compose, waits for them to become
healthy, and then starts the web, API, and worker processes. In a second terminal, verify the full
runtime:

```powershell
pnpm runtime:smoke
```

The local endpoints are:

- Web: `http://localhost:3000`
- API liveness/readiness: `http://localhost:4000/health/live` and `/health/ready`
- Worker liveness/readiness: `http://localhost:4001/health/live` and `/health/ready`

Run the complete static quality gate with `pnpm check`. Stop the application processes with
`Ctrl+C`, then stop infrastructure with `pnpm runtime:down`.

## Phase 1B documentation

- [Workspace decisions and commands](docs/phase-1b-workspace.md)
- [Acceptance-criteria traceability](docs/phase-1b-traceability.md)

## Phase 1C documentation

- [Local runtime operations and decisions](docs/phase-1c-local-runtime.md)
- [Acceptance-criteria traceability](docs/phase-1c-traceability.md)
