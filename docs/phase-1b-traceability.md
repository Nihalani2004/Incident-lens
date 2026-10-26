# Phase 1B acceptance-criteria traceability

| Acceptance criterion                             | Deliverable                                                                    | Verification                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| One reproducible TypeScript workspace            | Root manifest, pnpm workspace, root lockfile                                   | Clean `pnpm install`, workspace test                          |
| Explicit web, API, worker, and shared boundaries | `apps/*`, `contracts/`, `packages/config/`                                     | Workspace structure test, production builds                   |
| Existing Phase 1A behavior remains valid         | Unmodified contract behavior                                                   | Contract tests                                                |
| Strict shared TypeScript configuration           | `tsconfig.base.json`, package configs                                          | Recursive type check                                          |
| Shared linting and formatting                    | ESLint flat config, Prettier, EditorConfig                                     | `pnpm lint`, `pnpm format:check`                              |
| Typed runtime environment validation             | `@incidentlens/config`                                                         | Positive, negative, boundary, secrecy, and immutability tests |
| Safe environment templates                       | Per-process `.env.example` files                                               | Workspace acceptance test                                     |
| Frontend production build                        | Next.js application shell                                                      | `@incidentlens/web` build                                     |
| API production build                             | NestJS API bootstrap                                                           | `@incidentlens/api` build                                     |
| Worker production build                          | NestJS worker bootstrap                                                        | `@incidentlens/worker` build                                  |
| Phase boundary is respected                      | No database, Redis, queue, health route, integration, or Docker implementation | Workspace test and repository review                          |

## Definition of done

- `pnpm check` succeeds from the repository root.
- All package manifests use pnpm workspace/catalog references where appropriate.
- The only dependency lockfile is `pnpm-lock.yaml` at the repository root.
- Every executable package has a safe `.env.example` and validates its environment on bootstrap.
- The Phase 1A contract suite remains green.
- The web, API, worker, and shared configuration package produce successful builds.
- No Phase 1C or later feature is implemented.
