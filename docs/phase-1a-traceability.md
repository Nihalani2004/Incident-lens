# Phase 1A acceptance-criteria traceability

| Acceptance criterion | Deliverable | Automated verification |
|---|---|---|
| MVP scope, terminology, and non-goals are explicit | `docs/product/mvp-scope.md` | Documentation review |
| Canonical contracts exist for every required domain record | `contracts/src/*.ts`, `docs/domain/data-contracts.md` | Contract validation tests and strict type check |
| Lifecycle and severity policies are unambiguous | `contracts/src/policies.ts`, `docs/domain/incident-policies.md` | Transition and severity tests |
| Regression criteria are deterministic and bounded | `contracts/src/policies.ts`, `docs/domain/incident-policies.md` | New, increased, unrelated, and boundary tests |
| Required synthetic scenarios are reusable | `contracts/fixtures/synthetic-scenarios.ts` | Scenario validation tests |
| Duplicate source delivery has a stable identity | `alertDeduplicationKey` | Duplicate-event test |
| Recurrence is distinguished from reopen | Incident contract and recurrence policy | Recurrence and lifecycle tests |
| AI outputs remain evidence-backed | AI analysis validator | Unknown-evidence and confidence-boundary tests |
| Invalid data is rejected with actionable errors | Runtime validators | Negative contract tests |
| No later-phase runtime functionality is introduced | Phase-scoped repository contents | Repository review |

## Phase 1A definition of done

- All contract tests pass.
- Strict TypeScript checking passes for executable contracts and fixtures.
- Positive, negative, boundary, and invalid-transition tests are present.
- Required synthetic scenarios validate successfully.
- Documentation agrees with executable policies.
- No frontend, backend, worker, database, container, cloud, or integration runtime is scaffolded.

## Clarifications locked in during Phase 1A

- Automatic recurrence creates a new linked incident; only an explicit human action may reopen a
  resolved incident. This preserves separate response-time measurements.
- Internal IDs use UUIDs while provider IDs stay opaque, preventing provider-specific assumptions
  from leaking into shared records.
- The AI provider and model are recorded data, not hardcoded contract constants. This preserves the
  approved provider abstraction and avoids coupling contracts to a temporary free-tier model name.
- Regression classification deliberately returns `candidate`, never a causal conclusion. Release,
  changed-file, and historical matches are ranking signals rather than substitutes for scope, time,
  and error-rate requirements.
- No approved requirement was removed. Runtime integrations and application scaffolding remain
  deferred to their roadmap phases.
