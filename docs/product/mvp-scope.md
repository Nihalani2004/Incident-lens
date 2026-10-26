# IncidentLens MVP scope

## Product boundary

The MVP is a release-regression investigation product for small software teams. It accepts
application-error events and deployment metadata, deterministically groups related errors into
incidents, compares behavior before and after a deployment, and prepares a bounded evidence set for
human-reviewed AI analysis.

The MVP must support the following end-to-end outcome:

1. Accept and normalize Sentry-compatible error events.
2. Deduplicate repeated delivery of the same source event.
3. Fingerprint related errors and group them into an incident.
4. Associate GitHub deployment and code-change metadata with the affected service and environment.
5. Detect a new or materially increased error pattern after a deployment.
6. Produce evidence-backed AI hypotheses and investigation steps on explicit user request.
7. Allow a responder to acknowledge, investigate, mitigate, resolve, and later search an incident.

This phase defines the contracts needed for that outcome. It does not implement those runtime
capabilities.

## Core terminology

| Term                 | Canonical meaning                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Organization         | The tenant security boundary. Data from one organization must never be used by another.               |
| Service              | A deployable application or component monitored by IncidentLens.                                      |
| Environment          | The deployment boundary within a service, such as production or staging.                              |
| Source event         | One delivery from an external system, identified by provider and provider-owned event ID.             |
| Alert                | The normalized, immutable IncidentLens representation of an error source event.                       |
| Error fingerprint    | A stable digest of selected normalized error properties used for deterministic grouping.              |
| Deployment           | A recorded attempt to release one revision of a service into one environment.                         |
| Incident             | The durable response record that groups related alert occurrences for one service and environment.    |
| Recurrence           | A new incident linked to a prior resolved incident with the same fingerprint and scope.               |
| Evidence             | An immutable, attributable fact or bounded source excerpt that may support an investigation.          |
| Regression candidate | An error pattern satisfying the deterministic post-deployment criteria; it is not proof of causation. |
| AI analysis          | A versioned, human-reviewable interpretation of explicitly listed evidence.                           |
| Runbook              | Human-authored operational guidance that may be retrieved as evidence.                                |

## Contract invariants

- Internal entity IDs are UUIDs. External provider identifiers remain opaque strings.
- All timestamps are ISO 8601 UTC instants ending in `Z`.
- All contracts carry the schema version `1.0`.
- Organization, service, and environment scope must match before records can be correlated.
- Alerts and evidence are immutable facts; corrections create new records or explicit superseding
  metadata rather than silently rewriting history.
- AI hypotheses are never stored as confirmed root cause.
- A source event is idempotent on `(organization, provider, externalEventId)`.
- Arbitrary provider payloads are not part of the canonical contracts.

## Non-goals

- Replacing log aggregation, error monitoring, tracing, or paging platforms.
- Automatically rolling back deployments, modifying feature flags, or changing production systems.
- Building sprint tracking, issue tracking, or general project management.
- Supporting every observability or source-control provider in the MVP.
- Training or fine-tuning a custom machine-learning model.
- Kubernetes, Kafka, or a microservice decomposition for the initial product.
- Unbounded storage of raw logs, stack traces, provider payloads, or personal data.
- Claiming that temporal correlation proves a deployment caused an incident.
- Publishing AI-generated internal or customer communication without human approval.

## Deferred enhancements

Feature-flag correlation, dependency graphs, status pages, automatic external follow-up ticket
creation, additional monitoring providers, and multi-model routing remain outside the MVP.
