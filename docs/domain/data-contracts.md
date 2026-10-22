# Canonical data contracts

The executable source of truth is the TypeScript package under `contracts/src`. This document
describes the meaning and ownership of its fields. Runtime systems must validate untrusted input
before treating it as any canonical contract.

## Shared envelope

Every canonical record contains:

- `schemaVersion`: currently exactly `1.0`.
- `id`: an IncidentLens-owned UUID.
- `organizationId`: tenant UUID.
- `serviceId`: service UUID.
- `environment`: normalized non-empty environment name.
- `occurredAt`: when the represented fact occurred.
- `recordedAt`: when IncidentLens recorded the canonical fact.

`occurredAt` may precede `recordedAt` because integrations can deliver late. Future schema changes
must introduce a new version rather than altering the meaning of version `1.0` fields.

## Alert

An alert is an immutable, normalized error event. Its source provider and external event ID form
the provider-side identity. The contract contains a bounded message, optional exception type,
sanitized stack frames, release metadata, affected-user count, and string tags. It excludes the
unbounded raw provider payload.

The deduplication key is derived from organization, provider, and external event ID. Receiving the
same key repeatedly must not create additional canonical alerts.

## Error fingerprint

An error fingerprint records the versioned inputs and SHA-256 digest used to group alerts.
Version `sha256:v1` uses normalized exception type, normalized message template, and ordered
in-application stack-frame signatures. Occurrence counters are aggregate facts and may never be
negative. `firstSeenAt` must be at or before `lastSeenAt`.

Changing the normalization or hashing algorithm requires a new algorithm version. Existing
fingerprint values must not be silently recalculated.

## Deployment

A deployment represents one provider-observed release attempt for one service and environment.
It identifies the provider event, repository, revision, status, start/completion timestamps,
optional version, related pull requests, and bounded changed-file metadata.

Only a `succeeded` deployment can qualify as a regression candidate. A deployment is correlated
only with incidents from the same organization, service, and environment.

## Incident

An incident is the response and lifecycle record for one service and environment. It contains its
current state and severity, alert and fingerprint references, first/last detection times, optional
ownership, optional recurrence link, impact statement, and final resolution.

Confirmed root cause belongs only in a human-approved resolution. AI hypotheses remain in their
own analysis record even after an incident is resolved.

## Evidence

Evidence is an immutable, attributable investigation input. It contains a bounded summary,
structured JSON facts, the referenced source entity, trust classification, and provenance. Trust
classification distinguishes system-derived facts, human-authored material, and untrusted
external content. All evidence passed to AI retains its evidence ID.

## AI analysis

An AI analysis is an asynchronous, versioned request and result. It records the provider, model,
prompt version, exact input evidence IDs, lifecycle status, timestamps, and failure or result.

A completed result contains a summary, impact assessment, hypotheses, investigation steps, and
draft communications. Every hypothesis requires at least one evidence ID, and every cited ID must
be present in the analysis input set. Confidence is a number from `0` through `1`, not a guarantee.
Draft communication always requires human approval.

## Compatibility rule

Consumers must reject an unsupported `schemaVersion`. Producers must not add a required field or
change field meaning without publishing a new contract version and migration plan.
