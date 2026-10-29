# Phase 1D acceptance-criteria traceability

| Acceptance criterion                        | Deliverable                                              | Verification                                    |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| Unit runners for every workspace boundary   | `test:unit` scripts in web, API, worker, shared packages | `pnpm test:unit`                                |
| Integration runners for stateful boundaries | Runtime, database, and worker integration tests          | `pnpm test:integration`                         |
| Browser loads and displays API health       | Playwright Chromium smoke test                           | `pnpm test:e2e`                                 |
| Static and production quality gates         | Root scripts and clean-checkout CI workflow              | `pnpm check`, GitHub Actions                    |
| One command starts all services             | Existing `pnpm dev` orchestration                        | Runtime smoke test and documentation            |
| API verifies PostgreSQL and Redis           | Existing readiness probes                                | Runtime integration and smoke tests             |
| Worker processes a test job                 | BullMQ quality-gate worker and probe                     | Worker integration test                         |
| Missing configuration fails clearly         | Production environment and migration CLI validation      | Configuration and migration tests               |
| Synthetic fixtures remain reusable          | Canonical exported fixture module                        | Contract and workspace tests                    |
| Migrations apply and roll back safely       | Transactional paired-SQL migration runner                | Disposable PostgreSQL integration test          |
| Redis queue smoke path works                | Versioned BullMQ queue and real Redis round trip         | Worker integration test                         |
| Workspace boundaries have no cycles         | Package graph validator                                  | `pnpm workspace:check`                          |
| OneDrive watcher fallback is available      | Cross-platform polling development command               | Workspace test and documented `pnpm dev:poll`   |
| Redis/BullMQ compatibility is explicit      | Version and connection-policy documentation              | Queue unit tests and quality-gate documentation |
| Phase 2 remains out of scope                | No auth, incident persistence, integrations, or AI       | Workspace acceptance test and repository review |

## Definition of done

- A clean checkout can be installed and verified using documentation alone.
- Formatting, linting, dependency boundaries, strict types, unit tests, and production builds pass.
- PostgreSQL/pgvector, reversible migrations, Redis, and BullMQ integration tests pass.
- Chromium loads the frontend and observes connected API dependencies.
- CI reproduces all checks with deterministic service setup and unconditional cleanup.
- No Phase 2 product behavior is present.
