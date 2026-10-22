import {
  type CanonicalEnvelope,
  type JsonValue,
  type SourceReference,
  type ValidationResult,
  isJsonValue,
  isNonEmptyString,
  isRecord,
  isUuid,
  issue,
  result,
  validateEnvelope,
} from "./common.ts";

export const EVIDENCE_TYPES = [
  "alert",
  "error_sample",
  "deployment",
  "code_change",
  "metric_comparison",
  "runbook_excerpt",
  "historical_incident",
  "timeline_event",
  "user_impact",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_TRUST = ["system_derived", "human_authored", "external_untrusted"] as const;
export type EvidenceTrust = (typeof EVIDENCE_TRUST)[number];

export interface CanonicalEvidence extends CanonicalEnvelope {
  readonly incidentId: string;
  readonly type: EvidenceType;
  readonly trust: EvidenceTrust;
  readonly summary: string;
  readonly facts: Readonly<Record<string, JsonValue>>;
  readonly source: SourceReference;
  readonly sourceEntityId: string;
}

export function validateEvidence(value: unknown): ValidationResult<CanonicalEvidence> {
  const issues = validateEnvelope(value);
  if (!isRecord(value)) return result(value, issues);

  if (!isUuid(value.incidentId)) issues.push(issue("incidentId", "invalid_uuid", "Expected a UUID."));
  if (!EVIDENCE_TYPES.includes(value.type as EvidenceType)) {
    issues.push(issue("type", "invalid_evidence_type", "Expected a canonical evidence type."));
  }
  if (!EVIDENCE_TRUST.includes(value.trust as EvidenceTrust)) {
    issues.push(issue("trust", "invalid_trust", "Expected a canonical trust classification."));
  }
  if (!isNonEmptyString(value.summary, 2000)) {
    issues.push(issue("summary", "invalid_summary", "Expected 1-2000 characters."));
  }
  if (!isRecord(value.facts) || !isJsonValue(value.facts)) {
    issues.push(issue("facts", "invalid_json", "Expected a finite JSON object."));
  }
  if (!isRecord(value.source) || !isNonEmptyString(value.source.provider, 64) || !isNonEmptyString(value.source.externalId, 256)) {
    issues.push(issue("source", "invalid_source", "Expected provider and externalId."));
  }
  if (!isNonEmptyString(value.sourceEntityId, 256)) {
    issues.push(issue("sourceEntityId", "invalid_source_entity", "Expected 1-256 characters."));
  }
  return result(value, issues);
}
