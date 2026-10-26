export const CONTRACT_VERSION = '1.0' as const;

export type ContractVersion = typeof CONTRACT_VERSION;
export type UUID = string;
export type IsoUtcInstant = string;
export type EnvironmentName = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface CanonicalEnvelope {
  readonly schemaVersion: ContractVersion;
  readonly id: UUID;
  readonly organizationId: UUID;
  readonly serviceId: UUID;
  readonly environment: EnvironmentName;
  readonly occurredAt: IsoUtcInstant;
  readonly recordedAt: IsoUtcInstant;
}

export interface SourceReference {
  readonly provider: string;
  readonly externalId: string;
  readonly externalUrl?: string;
}

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly issues: readonly ValidationIssue[] };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is UUID {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isIsoUtcInstant(value: unknown): value is IsoUtcInstant {
  return (
    typeof value === 'string' &&
    UTC_INSTANT_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function isNonEmptyString(value: unknown, maxLength = 512): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

export function validateEnvelope(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) {
    return [issue('$', 'invalid_type', 'Expected an object.')];
  }

  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== CONTRACT_VERSION) {
    issues.push(issue('schemaVersion', 'unsupported_version', `Expected ${CONTRACT_VERSION}.`));
  }
  for (const field of ['id', 'organizationId', 'serviceId'] as const) {
    if (!isUuid(value[field])) {
      issues.push(issue(field, 'invalid_uuid', 'Expected a UUID.'));
    }
  }
  if (!isNonEmptyString(value.environment, 64)) {
    issues.push(issue('environment', 'invalid_environment', 'Expected 1-64 characters.'));
  }
  for (const field of ['occurredAt', 'recordedAt'] as const) {
    if (!isIsoUtcInstant(value[field])) {
      issues.push(
        issue(field, 'invalid_timestamp', 'Expected an ISO 8601 UTC instant ending in Z.'),
      );
    }
  }
  return issues;
}

export function result<T>(value: unknown, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length === 0 ? { success: true, value: value as T } : { success: false, issues };
}

export function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

export function hasValidTimeOrder(start: unknown, end: unknown): boolean {
  return isIsoUtcInstant(start) && isIsoUtcInstant(end) && Date.parse(start) <= Date.parse(end);
}
