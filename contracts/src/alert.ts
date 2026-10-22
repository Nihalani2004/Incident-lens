import {
  type CanonicalEnvelope,
  type SourceReference,
  type ValidationIssue,
  type ValidationResult,
  isNonEmptyString,
  isRecord,
  isStringRecord,
  issue,
  result,
  validateEnvelope,
} from "./common.ts";

export interface StackFrame {
  readonly function?: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly inApplication: boolean;
}

export interface CanonicalAlert extends CanonicalEnvelope {
  readonly kind: "application_error";
  readonly source: SourceReference;
  readonly message: string;
  readonly exceptionType?: string;
  readonly stackFrames: readonly StackFrame[];
  readonly release?: string;
  readonly affectedUserCount?: number;
  readonly tags: Readonly<Record<string, string>>;
}

export function alertDeduplicationKey(alert: Pick<CanonicalAlert, "organizationId" | "source">): string {
  return `${alert.organizationId}:${alert.source.provider}:${alert.source.externalId}`;
}

function validateSource(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue("source", "invalid_type", "Expected a source object."));
    return;
  }
  if (!isNonEmptyString(value.provider, 64)) {
    issues.push(issue("source.provider", "invalid_provider", "Expected 1-64 characters."));
  }
  if (!isNonEmptyString(value.externalId, 256)) {
    issues.push(issue("source.externalId", "invalid_external_id", "Expected 1-256 characters."));
  }
  if (value.externalUrl !== undefined) {
    if (!isNonEmptyString(value.externalUrl, 2048)) {
      issues.push(issue("source.externalUrl", "invalid_url", "Expected a bounded HTTPS URL."));
    } else {
      try {
        if (new URL(value.externalUrl).protocol !== "https:") throw new Error("not https");
      } catch {
        issues.push(issue("source.externalUrl", "invalid_url", "Expected a valid HTTPS URL."));
      }
    }
  }
}

function validateFrames(value: unknown, issues: ValidationIssue[]): void {
  if (!Array.isArray(value) || value.length > 100) {
    issues.push(issue("stackFrames", "invalid_frames", "Expected at most 100 stack frames."));
    return;
  }
  value.forEach((frame, index) => {
    const path = `stackFrames[${index}]`;
    if (!isRecord(frame)) {
      issues.push(issue(path, "invalid_type", "Expected a stack-frame object."));
      return;
    }
    if (!isNonEmptyString(frame.file, 1024)) {
      issues.push(issue(`${path}.file`, "invalid_file", "Expected a bounded file name."));
    }
    if (typeof frame.inApplication !== "boolean") {
      issues.push(issue(`${path}.inApplication`, "invalid_boolean", "Expected a boolean."));
    }
    for (const field of ["line", "column"] as const) {
      if (frame[field] !== undefined && (!Number.isInteger(frame[field]) || Number(frame[field]) < 1)) {
        issues.push(issue(`${path}.${field}`, "invalid_position", "Expected a positive integer."));
      }
    }
  });
}

export function validateAlert(value: unknown): ValidationResult<CanonicalAlert> {
  const issues = validateEnvelope(value);
  if (!isRecord(value)) return result(value, issues);

  if (value.kind !== "application_error") {
    issues.push(issue("kind", "invalid_kind", "Expected application_error."));
  }
  validateSource(value.source, issues);
  if (!isNonEmptyString(value.message, 4096)) {
    issues.push(issue("message", "invalid_message", "Expected 1-4096 characters."));
  }
  if (value.exceptionType !== undefined && !isNonEmptyString(value.exceptionType, 256)) {
    issues.push(issue("exceptionType", "invalid_exception_type", "Expected 1-256 characters."));
  }
  validateFrames(value.stackFrames, issues);
  if (value.release !== undefined && !isNonEmptyString(value.release, 256)) {
    issues.push(issue("release", "invalid_release", "Expected 1-256 characters."));
  }
  if (
    value.affectedUserCount !== undefined &&
    (!Number.isInteger(value.affectedUserCount) || Number(value.affectedUserCount) < 0)
  ) {
    issues.push(issue("affectedUserCount", "invalid_count", "Expected a non-negative integer."));
  }
  if (!isStringRecord(value.tags) || Object.keys(value.tags).length > 50) {
    issues.push(issue("tags", "invalid_tags", "Expected at most 50 string tags."));
  }
  return result(value, issues);
}
