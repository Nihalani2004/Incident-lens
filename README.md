# IncidentLens

IncidentLens currently includes **Phase 1A: Product and Data Contracts** and **Phase 1B: Workspace
Foundation**.

The repository provides strictly validated domain contracts and separate foundations for the web,
API, and background-worker processes. Product workflows and infrastructure connections begin in
later roadmap phases.

## Phase 1A documentation

- [MVP scope and terminology](docs/product/mvp-scope.md)
- [Canonical data contracts](docs/domain/data-contracts.md)
- [Incident and regression policies](docs/domain/incident-policies.md)
- [Acceptance-criteria traceability](docs/phase-1a-traceability.md)

## Workspace requirements

- Node.js 22.6.0 or newer
- pnpm 10.28 or newer

Docker is not required.

## Setup and verification

From the repository root:

```powershell
pnpm install
pnpm check
```

Development processes can be started independently:

```powershell
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

The web foundation is available at `http://localhost:3000`; the API foundation listens on
`http://localhost:4000` but intentionally has no routes until Phase 1C.

## Phase 1B documentation

- [Workspace decisions and commands](docs/phase-1b-workspace.md)
- [Acceptance-criteria traceability](docs/phase-1b-traceability.md)
