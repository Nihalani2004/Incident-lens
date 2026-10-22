import {
  type CanonicalEnvelope,
  type ValidationResult,
  hasValidTimeOrder,
  isNonEmptyString,
  isRecord,
  issue,
  result,
  validateEnvelope,
} from "./common.ts";

export interface FingerprintComponents {
  readonly exceptionType: string;
  readonly normalizedMessage: string;
  readonly inApplicationFrames: readonly string[];
}

export interface ErrorFingerprint extends CanonicalEnvelope {
  readonly algorithm: "sha256:v1";
  readonly value: string;
  readonly components: FingerprintComponents;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly occurrenceCount: number;
}

export function validateErrorFingerprint(value: unknown): ValidationResult<ErrorFingerprint> {
  const issues = validateEnvelope(value);
  if (!isRecord(value)) return result(value, issues);

  if (value.algorithm !== "sha256:v1") {
    issues.push(issue("algorithm", "unsupported_algorithm", "Expected sha256:v1."));
  }
  if (typeof value.value !== "string" || !/^[0-9a-f]{64}$/i.test(value.value)) {
    issues.push(issue("value", "invalid_digest", "Expected a 64-character SHA-256 digest."));
  }
  if (!isRecord(value.components)) {
    issues.push(issue("components", "invalid_type", "Expected fingerprint components."));
  } else {
    if (!isNonEmptyString(value.components.exceptionType, 256)) {
      issues.push(issue("components.exceptionType", "invalid_exception_type", "Expected 1-256 characters."));
    }
    if (!isNonEmptyString(value.components.normalizedMessage, 1024)) {
      issues.push(issue("components.normalizedMessage", "invalid_message", "Expected 1-1024 characters."));
    }
    if (
      !Array.isArray(value.components.inApplicationFrames) ||
      value.components.inApplicationFrames.length > 50 ||
      !value.components.inApplicationFrames.every((entry) => isNonEmptyString(entry, 1024))
    ) {
      issues.push(issue("components.inApplicationFrames", "invalid_frames", "Expected at most 50 frame signatures."));
    }
  }
  if (!hasValidTimeOrder(value.firstSeenAt, value.lastSeenAt)) {
    issues.push(issue("lastSeenAt", "invalid_time_order", "lastSeenAt must be on or after firstSeenAt."));
  }
  if (!Number.isInteger(value.occurrenceCount) || Number(value.occurrenceCount) < 1) {
    issues.push(issue("occurrenceCount", "invalid_count", "Expected a positive integer."));
  }
  return result(value, issues);
}
