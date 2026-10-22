# IncidentLens

IncidentLens is currently in **Phase 1A: Product and Data Contracts**.

This repository presently contains only the shared domain contracts, policy definitions,
synthetic reference scenarios, and their validation tests. Application scaffolding and runtime
features belong to Phase 1B and later phases and are intentionally not included yet.

## Phase 1A documentation

- [MVP scope and terminology](docs/product/mvp-scope.md)
- [Canonical data contracts](docs/domain/data-contracts.md)
- [Incident and regression policies](docs/domain/incident-policies.md)
- [Acceptance-criteria traceability](docs/phase-1a-traceability.md)

## Contract verification

From `contracts/`:

```sh
npm install
npm run check
```

The contract package has no runtime dependencies. TypeScript is used only for strict static
checking during development.
