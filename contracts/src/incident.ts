import {
  type CanonicalEnvelope,
  type ValidationResult,
  hasValidTimeOrder,
  isIsoUtcInstant,
  isNonEmptyString,
  isRecord,
  isUuid,
  issue,
  result,
  validateEnvelope,
} from "./common.ts";

export const INCIDENT_STATES = ["open", "acknowledged", "investigating", "mitigated", "resolved"] as const;
export type IncidentState = (typeof INCIDENT_STATES)[number];

export const SEVERITY_LEVELS = ["sev1", "sev2", "sev3", "sev4"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export interface IncidentResolution {
  readonly category: "fixed" | "rolled_back" | "configuration_changed" | "external_recovery" | "false_positive" | "other";
  readonly summary: string;
  readonly confirmedRootCause?: string;
  readonly resolvedByUserId: string;
  readonly resolvedAt: string;
}

export interface CanonicalIncident extends CanonicalEnvelope {
  readonly title: string;
  readonly state: IncidentState;
  readonly severity: Severity;
  readonly alertIds: readonly string[];
  readonly fingerprintIds: readonly string[];
  readonly firstDetectedAt: string;
  readonly lastDetectedAt: string;
  readonly acknowledgedAt?: string;
  readonly mitigatedAt?: string;
  readonly ownerUserId?: string;
  readonly recurrenceOfIncidentId?: string;
  readonly impactSummary?: string;
  readonly resolution?: IncidentResolution;
}

export function validateIncident(value: unknown): ValidationResult<CanonicalIncident> {
  const issues = validateEnvelope(value);
  if (!isRecord(value)) return result(value, issues);

  if (!isNonEmptyString(value.title, 256)) {
    issues.push(issue("title", "invalid_title", "Expected 1-256 characters."));
  }
  if (!INCIDENT_STATES.includes(value.state as IncidentState)) {
    issues.push(issue("state", "invalid_state", "Expected a canonical incident state."));
  }
  if (!SEVERITY_LEVELS.includes(value.severity as Severity)) {
    issues.push(issue("severity", "invalid_severity", "Expected sev1, sev2, sev3, or sev4."));
  }
  for (const field of ["alertIds", "fingerprintIds"] as const) {
    if (!Array.isArray(value[field]) || value[field].length < 1 || !value[field].every(isUuid)) {
      issues.push(issue(field, "invalid_references", "Expected at least one UUID reference."));
    }
  }
  if (!hasValidTimeOrder(value.firstDetectedAt, value.lastDetectedAt)) {
    issues.push(issue("lastDetectedAt", "invalid_time_order", "lastDetectedAt must be on or after firstDetectedAt."));
  }
  for (const field of ["acknowledgedAt", "mitigatedAt"] as const) {
    if (value[field] !== undefined && !isIsoUtcInstant(value[field])) {
      issues.push(issue(field, "invalid_timestamp", "Expected an ISO 8601 UTC instant."));
    }
  }
  for (const field of ["ownerUserId", "recurrenceOfIncidentId"] as const) {
    if (value[field] !== undefined && !isUuid(value[field])) {
      issues.push(issue(field, "invalid_uuid", "Expected a UUID."));
    }
  }
  if (value.impactSummary !== undefined && !isNonEmptyString(value.impactSummary, 2000)) {
    issues.push(issue("impactSummary", "invalid_impact", "Expected 1-2000 characters."));
  }
  if (value.state === "resolved") {
    if (!isRecord(value.resolution)) {
      issues.push(issue("resolution", "required_resolution", "Resolved incidents require a resolution."));
    } else {
      const categories = ["fixed", "rolled_back", "configuration_changed", "external_recovery", "false_positive", "other"];
      if (!categories.includes(String(value.resolution.category))) {
        issues.push(issue("resolution.category", "invalid_category", "Expected a canonical resolution category."));
      }
      if (!isNonEmptyString(value.resolution.summary, 4000)) {
        issues.push(issue("resolution.summary", "invalid_summary", "Expected 1-4000 characters."));
      }
      if (!isUuid(value.resolution.resolvedByUserId)) {
        issues.push(issue("resolution.resolvedByUserId", "invalid_uuid", "Expected a UUID."));
      }
      if (!isIsoUtcInstant(value.resolution.resolvedAt)) {
        issues.push(issue("resolution.resolvedAt", "invalid_timestamp", "Expected an ISO 8601 UTC instant."));
      }
    }
  } else if (value.resolution !== undefined) {
    issues.push(issue("resolution", "premature_resolution", "Only resolved incidents may contain a resolution."));
  }
  return result(value, issues);
}
