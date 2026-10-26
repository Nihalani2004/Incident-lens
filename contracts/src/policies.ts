import type { CanonicalDeployment } from './deployment.ts';
import type { ErrorFingerprint } from './error-fingerprint.ts';
import type { CanonicalIncident, IncidentState, Severity } from './incident.ts';

export const INCIDENT_TRANSITIONS: Readonly<Record<IncidentState, readonly IncidentState[]>> = {
  open: ['acknowledged'],
  acknowledged: ['investigating', 'mitigated'],
  investigating: ['mitigated', 'resolved'],
  mitigated: ['investigating', 'resolved'],
  resolved: ['investigating'],
};

export function canTransitionIncident(from: IncidentState, to: IncidentState): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

export const SEVERITY_POLICY: Readonly<
  Record<Severity, { readonly rank: number; readonly meaning: string }>
> = {
  sev1: {
    rank: 1,
    meaning: 'Broad outage, severe data/security risk, or core workflow unavailable.',
  },
  sev2: { rank: 2, meaning: 'Major degradation or substantial user impact to a core workflow.' },
  sev3: { rank: 3, meaning: 'Limited degradation or smaller affected segment with a workaround.' },
  sev4: { rank: 4, meaning: 'Minor operational defect with little immediate user impact.' },
};

export interface RegressionPolicy {
  readonly baselineWindowMinutes: number;
  readonly observationWindowMinutes: number;
  readonly newErrorMinimumOccurrences: number;
  readonly increasedErrorMinimumOccurrences: number;
  readonly increasedErrorMinimumAbsoluteDelta: number;
  readonly increasedErrorMinimumRateRatio: number;
  readonly recurrenceLookbackDays: number;
}

export const DEFAULT_REGRESSION_POLICY: RegressionPolicy = {
  baselineWindowMinutes: 30,
  observationWindowMinutes: 60,
  newErrorMinimumOccurrences: 3,
  increasedErrorMinimumOccurrences: 5,
  increasedErrorMinimumAbsoluteDelta: 3,
  increasedErrorMinimumRateRatio: 3,
  recurrenceLookbackDays: 90,
};

export interface RegressionEvaluationInput {
  readonly deployment: CanonicalDeployment;
  readonly incident: CanonicalIncident;
  readonly baselineOccurrenceCount: number;
  readonly observationOccurrenceCount: number;
  readonly releaseMatches: boolean;
  readonly changedFileStackOverlap: boolean;
  readonly similarHistoricalRegression: boolean;
}

export type RegressionReason =
  | 'deployment_not_successful'
  | 'scope_mismatch'
  | 'outside_observation_window'
  | 'insufficient_error_increase'
  | 'new_error_after_deployment'
  | 'increased_error_rate'
  | 'release_match'
  | 'changed_file_stack_overlap'
  | 'similar_historical_regression';

export interface RegressionEvaluation {
  readonly outcome: 'candidate' | 'not_candidate';
  readonly reasons: readonly RegressionReason[];
  readonly confidenceSignals: number;
}

export function evaluateRegressionCandidate(
  input: RegressionEvaluationInput,
  policy: RegressionPolicy = DEFAULT_REGRESSION_POLICY,
): RegressionEvaluation {
  const reasons: RegressionReason[] = [];
  if (input.deployment.status !== 'succeeded') reasons.push('deployment_not_successful');

  const scopeMatches =
    input.deployment.organizationId === input.incident.organizationId &&
    input.deployment.serviceId === input.incident.serviceId &&
    input.deployment.environment === input.incident.environment;
  if (!scopeMatches) reasons.push('scope_mismatch');

  const deploymentTime = Date.parse(input.deployment.completedAt);
  const incidentTime = Date.parse(input.incident.firstDetectedAt);
  const observationEnd = deploymentTime + policy.observationWindowMinutes * 60_000;
  const inWindow = incidentTime >= deploymentTime && incidentTime <= observationEnd;
  if (!inWindow) reasons.push('outside_observation_window');

  const isNewError =
    input.baselineOccurrenceCount === 0 &&
    input.observationOccurrenceCount >= policy.newErrorMinimumOccurrences;
  const ratio =
    input.baselineOccurrenceCount === 0
      ? Number.POSITIVE_INFINITY
      : input.observationOccurrenceCount / input.baselineOccurrenceCount;
  const isIncreasedError =
    input.baselineOccurrenceCount > 0 &&
    input.observationOccurrenceCount >= policy.increasedErrorMinimumOccurrences &&
    input.observationOccurrenceCount - input.baselineOccurrenceCount >=
      policy.increasedErrorMinimumAbsoluteDelta &&
    ratio >= policy.increasedErrorMinimumRateRatio;

  if (isNewError) reasons.push('new_error_after_deployment');
  if (isIncreasedError) reasons.push('increased_error_rate');
  if (!isNewError && !isIncreasedError) reasons.push('insufficient_error_increase');

  let confidenceSignals = 0;
  if (input.releaseMatches) {
    reasons.push('release_match');
    confidenceSignals += 1;
  }
  if (input.changedFileStackOverlap) {
    reasons.push('changed_file_stack_overlap');
    confidenceSignals += 1;
  }
  if (input.similarHistoricalRegression) {
    reasons.push('similar_historical_regression');
    confidenceSignals += 1;
  }

  const requiredCriteriaPass =
    input.deployment.status === 'succeeded' &&
    scopeMatches &&
    inWindow &&
    (isNewError || isIncreasedError);
  return {
    outcome: requiredCriteriaPass ? 'candidate' : 'not_candidate',
    reasons,
    confidenceSignals,
  };
}

export function isRecurringIncident(
  current: Pick<
    CanonicalIncident,
    'organizationId' | 'serviceId' | 'environment' | 'firstDetectedAt'
  >,
  currentFingerprint: Pick<ErrorFingerprint, 'algorithm' | 'value'>,
  previous: Pick<
    CanonicalIncident,
    'organizationId' | 'serviceId' | 'environment' | 'state' | 'resolution'
  >,
  previousFingerprint: Pick<ErrorFingerprint, 'algorithm' | 'value'>,
  policy: RegressionPolicy = DEFAULT_REGRESSION_POLICY,
): boolean {
  if (previous.state !== 'resolved' || !previous.resolution) return false;
  const scopeMatches =
    current.organizationId === previous.organizationId &&
    current.serviceId === previous.serviceId &&
    current.environment === previous.environment;
  const fingerprintMatches =
    currentFingerprint.algorithm === previousFingerprint.algorithm &&
    currentFingerprint.value === previousFingerprint.value;
  const elapsed = Date.parse(current.firstDetectedAt) - Date.parse(previous.resolution.resolvedAt);
  const inclusiveLookback = policy.recurrenceLookbackDays * 24 * 60 * 60_000;
  return scopeMatches && fingerprintMatches && elapsed >= 0 && elapsed <= inclusiveLookback;
}
