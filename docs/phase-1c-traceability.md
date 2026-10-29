# Phase 1C acceptance-criteria traceability

| Acceptance criterion                         | Deliverable                                                | Verification                                     |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| PostgreSQL and Redis use Docker Compose      | `compose.yml` with pinned images and persistent volumes    | `docker compose config`, `pnpm runtime:up`       |
| PostgreSQL vector extension is enabled       | `infra/postgres/init/001-enable-vector.sql`                | Runtime integration test and readiness query     |
| API and worker health checks                 | Shared runtime module mounted in both NestJS processes     | `/health/live`, `/health/ready`, smoke test      |
| Unhealthy dependencies return failure        | Sanitized readiness evaluator and HTTP `503`               | Unit failure cases and stopped-dependency check  |
| Frontend can reach the API                   | Browser runtime status and explicit CORS policy            | Runtime smoke preflight and browser status       |
| API and worker reach PostgreSQL and Redis    | Shared pooled clients with bounded timeouts                | Runtime integration test and readiness endpoints |
| Structured correlation logging               | Pino request logger and validated correlation propagation  | Unit tests, smoke response-header assertions     |
| Missing production configuration is rejected | Production-only required dependency URLs                   | Configuration unit test                          |
| One documented startup command               | Root `pnpm dev` orchestration                              | Workspace acceptance test and manual startup     |
| Existing Phase 1A/1B behavior remains valid  | Reused contracts, workspace, and configuration packages    | Complete `pnpm check`                            |
| Phase boundary remains intact                | No schema, migration, queue, auth, integration, or AI work | Workspace test and repository review             |

## Definition of done

- Docker Compose validates and both dependency containers become healthy.
- PostgreSQL reports the installed `vector` extension and Redis returns `PONG`.
- API and worker liveness return `200`; readiness returns `200` when dependencies are healthy and
  `503` when a dependency is unavailable.
- Web-to-API CORS and correlation propagation pass the runtime smoke check.
- Logs are structured JSON and redact sensitive request headers.
- Unit, integration, workspace, contract, configuration, lint, type, formatting, and build checks
  pass.
- No Phase 1D implementation is present.
