# Incident and regression policies

## Lifecycle states

| State           | Meaning                                                           |
| --------------- | ----------------------------------------------------------------- |
| `open`          | Created automatically and not yet acknowledged by a responder.    |
| `acknowledged`  | A responder has accepted responsibility for initial triage.       |
| `investigating` | Active diagnosis is underway.                                     |
| `mitigated`     | User impact is controlled, but the incident is not fully closed.  |
| `resolved`      | Response is complete and a human-approved resolution is recorded. |

## Valid transitions

| From            | Allowed destinations                          |
| --------------- | --------------------------------------------- |
| `open`          | `acknowledged`                                |
| `acknowledged`  | `investigating`, `mitigated`                  |
| `investigating` | `mitigated`, `resolved`                       |
| `mitigated`     | `investigating`, `resolved`                   |
| `resolved`      | `investigating` (explicit manual reopen only) |

Self-transitions and all transitions not listed above are invalid. Transition validation is
centralized in `contracts/src/policies.ts`.

Automatic recurrence does not reopen a resolved incident. It creates a new incident linked through
`recurrenceOfIncidentId`, preserving independent response-time metrics and history. A human may
explicitly reopen a resolved incident when the earlier response itself was closed prematurely.

## Severity levels

| Level  | Meaning  | Expected effect                                                                  |
| ------ | -------- | -------------------------------------------------------------------------------- |
| `sev1` | Critical | Broad outage, severe data/security risk, or core workflow unavailable.           |
| `sev2` | High     | Major degradation or a substantial user segment cannot complete a core workflow. |
| `sev3` | Medium   | Limited degradation, workaround available, or a smaller segment is affected.     |
| `sev4` | Low      | Minor operational defect with little immediate user impact.                      |

Severity is independent of AI confidence and regression-correlation confidence.

## Post-deployment regression criteria

Default policy values:

- Baseline window: 30 minutes immediately before deployment completion.
- Observation window: 60 minutes beginning at deployment completion.
- New-error threshold: at least 3 occurrences in the observation window and 0 in baseline.
- Increased-error threshold: at least 5 observation occurrences, at least 3 more than baseline, and
  an observation rate at least 3 times the baseline rate.
- Recurrence lookback: 90 days.

A deployment is a **regression candidate** only when all scope criteria pass:

1. It completed successfully.
2. Organization, service, and environment match the incident.
3. The incident started within the inclusive observation window.
4. At least one new-error or increased-error threshold passes.

Optional alignment signals—matching release identifier, changed-file/stack-frame overlap, and a
similar historical regression—strengthen ranking but do not replace the required criteria.

The observation boundary is inclusive. An incident beginning exactly 60 minutes after deployment
qualifies under the default policy; one beginning even one millisecond later does not.

The policy produces `candidate` or `not_candidate` plus machine-readable reasons. It never produces
`caused_by_deployment`.

## Recurrence criteria

A new incident is a recurrence when a resolved incident:

- belongs to the same organization, service, and environment;
- contains the same fingerprint value and algorithm version; and
- was resolved no more than 90 days before the new incident began.

The 90-day boundary is inclusive. Recurrence is historical linkage, not proof that the root cause is
the same.
