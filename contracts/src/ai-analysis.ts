import {
  type CanonicalEnvelope,
  type ValidationIssue,
  type ValidationResult,
  isIsoUtcInstant,
  isNonEmptyString,
  isRecord,
  isUuid,
  issue,
  result,
  validateEnvelope,
} from "./common.ts";

export const AI_ANALYSIS_STATUSES = ["queued", "running", "completed", "failed", "stale"] as const;
export type AiAnalysisStatus = (typeof AI_ANALYSIS_STATUSES)[number];

export interface AiHypothesis {
  readonly id: string;
  readonly statement: string;
  readonly confidence: number;
  readonly evidenceIds: readonly string[];
  readonly uncertainty: string;
}

export interface InvestigationStep {
  readonly order: number;
  readonly instruction: string;
  readonly rationale: string;
  readonly evidenceIds: readonly string[];
}

export interface AiAnalysisResult {
  readonly summary: string;
  readonly impactAssessment: string;
  readonly hypotheses: readonly AiHypothesis[];
  readonly investigationSteps: readonly InvestigationStep[];
  readonly internalUpdateDraft: string;
  readonly customerUpdateDraft: string;
  readonly requiresHumanApproval: true;
}

export interface CanonicalAiAnalysis extends CanonicalEnvelope {
  readonly incidentId: string;
  readonly status: AiAnalysisStatus;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly requestedByUserId: string;
  readonly requestedAt: string;
  readonly completedAt?: string;
  readonly inputEvidenceIds: readonly string[];
  readonly result?: AiAnalysisResult;
  readonly failure?: { readonly code: string; readonly message: string; readonly retryable: boolean };
  readonly staleReason?: string;
}

function validateEvidenceReferences(ids: unknown, allowed: Set<string>, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(ids) || ids.length < 1 || !ids.every(isUuid)) {
    issues.push(issue(path, "invalid_evidence_references", "Expected at least one evidence UUID."));
    return;
  }
  ids.forEach((id, index) => {
    if (!allowed.has(id)) {
      issues.push(issue(`${path}[${index}]`, "unknown_evidence", "Evidence was not supplied to this analysis."));
    }
  });
}

function validateAnalysisResult(value: unknown, allowed: Set<string>, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue("result", "invalid_result", "Expected a structured analysis result."));
    return;
  }
  for (const field of ["summary", "impactAssessment", "internalUpdateDraft", "customerUpdateDraft"] as const) {
    if (!isNonEmptyString(value[field], 8000)) {
      issues.push(issue(`result.${field}`, "invalid_text", "Expected bounded non-empty text."));
    }
  }
  if (value.requiresHumanApproval !== true) {
    issues.push(issue("result.requiresHumanApproval", "approval_required", "AI output must require human approval."));
  }
  if (!Array.isArray(value.hypotheses) || value.hypotheses.length < 1 || value.hypotheses.length > 10) {
    issues.push(issue("result.hypotheses", "invalid_hypotheses", "Expected 1-10 hypotheses."));
  } else {
    value.hypotheses.forEach((hypothesis, index) => {
      const path = `result.hypotheses[${index}]`;
      if (!isRecord(hypothesis)) {
        issues.push(issue(path, "invalid_type", "Expected a hypothesis object."));
        return;
      }
      if (!isNonEmptyString(hypothesis.id, 64) || !isNonEmptyString(hypothesis.statement, 4000) || !isNonEmptyString(hypothesis.uncertainty, 2000)) {
        issues.push(issue(path, "invalid_hypothesis", "Expected id, statement, and uncertainty."));
      }
      if (typeof hypothesis.confidence !== "number" || hypothesis.confidence < 0 || hypothesis.confidence > 1) {
        issues.push(issue(`${path}.confidence`, "invalid_confidence", "Expected a number from 0 through 1."));
      }
      validateEvidenceReferences(hypothesis.evidenceIds, allowed, `${path}.evidenceIds`, issues);
    });
  }
  if (!Array.isArray(value.investigationSteps) || value.investigationSteps.length < 1 || value.investigationSteps.length > 20) {
    issues.push(issue("result.investigationSteps", "invalid_steps", "Expected 1-20 investigation steps."));
  } else {
    value.investigationSteps.forEach((step, index) => {
      const path = `result.investigationSteps[${index}]`;
      if (!isRecord(step) || step.order !== index + 1 || !isNonEmptyString(step.instruction, 2000) || !isNonEmptyString(step.rationale, 2000)) {
        issues.push(issue(path, "invalid_step", "Expected sequential order, instruction, and rationale."));
        return;
      }
      validateEvidenceReferences(step.evidenceIds, allowed, `${path}.evidenceIds`, issues);
    });
  }
}

export function validateAiAnalysis(value: unknown): ValidationResult<CanonicalAiAnalysis> {
  const issues = validateEnvelope(value);
  if (!isRecord(value)) return result(value, issues);

  if (!isUuid(value.incidentId)) issues.push(issue("incidentId", "invalid_uuid", "Expected a UUID."));
  if (!AI_ANALYSIS_STATUSES.includes(value.status as AiAnalysisStatus)) {
    issues.push(issue("status", "invalid_status", "Expected a canonical analysis status."));
  }
  for (const field of ["provider", "model", "promptVersion"] as const) {
    if (!isNonEmptyString(value[field], 128)) issues.push(issue(field, "invalid_text", "Expected 1-128 characters."));
  }
  if (!isUuid(value.requestedByUserId)) issues.push(issue("requestedByUserId", "invalid_uuid", "Expected a UUID."));
  if (!isIsoUtcInstant(value.requestedAt)) issues.push(issue("requestedAt", "invalid_timestamp", "Expected an ISO 8601 UTC instant."));
  if (value.completedAt !== undefined && !isIsoUtcInstant(value.completedAt)) {
    issues.push(issue("completedAt", "invalid_timestamp", "Expected an ISO 8601 UTC instant."));
  }

  if (!Array.isArray(value.inputEvidenceIds) || value.inputEvidenceIds.length < 1 || !value.inputEvidenceIds.every(isUuid)) {
    issues.push(issue("inputEvidenceIds", "invalid_evidence", "Expected at least one evidence UUID."));
  }
  const allowed = new Set(Array.isArray(value.inputEvidenceIds) ? value.inputEvidenceIds.filter(isUuid) : []);

  if (value.status === "completed") {
    if (!value.completedAt) issues.push(issue("completedAt", "required_timestamp", "Completed analysis requires completedAt."));
    validateAnalysisResult(value.result, allowed, issues);
    if (value.failure !== undefined) issues.push(issue("failure", "unexpected_failure", "Completed analysis cannot contain failure."));
  } else if (value.status === "failed") {
    if (!value.completedAt) issues.push(issue("completedAt", "required_timestamp", "Failed analysis requires completedAt."));
    if (!isRecord(value.failure) || !isNonEmptyString(value.failure.code, 128) || !isNonEmptyString(value.failure.message, 2000) || typeof value.failure.retryable !== "boolean") {
      issues.push(issue("failure", "required_failure", "Failed analysis requires structured failure details."));
    }
    if (value.result !== undefined) issues.push(issue("result", "unexpected_result", "Failed analysis cannot contain a result."));
  } else if (value.status === "stale") {
    validateAnalysisResult(value.result, allowed, issues);
    if (!isNonEmptyString(value.staleReason, 1000)) issues.push(issue("staleReason", "required_reason", "Stale analysis requires a reason."));
  } else if (value.result !== undefined || value.failure !== undefined || value.completedAt !== undefined) {
    issues.push(issue("status", "invalid_status_payload", "Queued or running analysis cannot contain terminal fields."));
  }

  return result(value, issues);
}
