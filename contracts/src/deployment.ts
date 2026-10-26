import {
  type CanonicalEnvelope,
  type SourceReference,
  type ValidationResult,
  hasValidTimeOrder,
  isNonEmptyString,
  isRecord,
  issue,
  result,
  validateEnvelope,
} from './common.ts';

export const DEPLOYMENT_STATUSES = ['succeeded', 'failed', 'canceled'] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export interface ChangedFile {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
}

export interface CanonicalDeployment extends CanonicalEnvelope {
  readonly source: SourceReference;
  readonly status: DeploymentStatus;
  readonly repository: {
    readonly id: string;
    readonly fullName: string;
  };
  readonly revision: string;
  readonly version?: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly pullRequestIds: readonly string[];
  readonly changedFiles: readonly ChangedFile[];
}

export function validateDeployment(value: unknown): ValidationResult<CanonicalDeployment> {
  const issues = validateEnvelope(value);
  if (!isRecord(value)) return result(value, issues);

  if (
    !isRecord(value.source) ||
    !isNonEmptyString(value.source.provider, 64) ||
    !isNonEmptyString(value.source.externalId, 256)
  ) {
    issues.push(issue('source', 'invalid_source', 'Expected provider and externalId.'));
  }
  if (!DEPLOYMENT_STATUSES.includes(value.status as DeploymentStatus)) {
    issues.push(issue('status', 'invalid_status', 'Expected succeeded, failed, or canceled.'));
  }
  if (
    !isRecord(value.repository) ||
    !isNonEmptyString(value.repository.id, 256) ||
    !isNonEmptyString(value.repository.fullName, 256)
  ) {
    issues.push(issue('repository', 'invalid_repository', 'Expected repository id and full name.'));
  }
  if (typeof value.revision !== 'string' || !/^[0-9a-f]{40}$/i.test(value.revision)) {
    issues.push(
      issue('revision', 'invalid_revision', 'Expected a full 40-character Git commit SHA.'),
    );
  }
  if (value.version !== undefined && !isNonEmptyString(value.version, 256)) {
    issues.push(issue('version', 'invalid_version', 'Expected 1-256 characters.'));
  }
  if (!hasValidTimeOrder(value.startedAt, value.completedAt)) {
    issues.push(
      issue('completedAt', 'invalid_time_order', 'completedAt must be on or after startedAt.'),
    );
  }
  if (
    !Array.isArray(value.pullRequestIds) ||
    value.pullRequestIds.length > 100 ||
    !value.pullRequestIds.every((id) => isNonEmptyString(id, 128))
  ) {
    issues.push(
      issue('pullRequestIds', 'invalid_pull_requests', 'Expected at most 100 pull-request IDs.'),
    );
  }
  if (!Array.isArray(value.changedFiles) || value.changedFiles.length > 1000) {
    issues.push(
      issue('changedFiles', 'invalid_changed_files', 'Expected at most 1000 changed files.'),
    );
  } else {
    value.changedFiles.forEach((file, index) => {
      if (
        !isRecord(file) ||
        !isNonEmptyString(file.path, 1024) ||
        !Number.isInteger(file.additions) ||
        Number(file.additions) < 0 ||
        !Number.isInteger(file.deletions) ||
        Number(file.deletions) < 0
      ) {
        issues.push(
          issue(
            `changedFiles[${index}]`,
            'invalid_changed_file',
            'Expected a path and non-negative change counts.',
          ),
        );
      }
    });
  }
  return result(value, issues);
}
