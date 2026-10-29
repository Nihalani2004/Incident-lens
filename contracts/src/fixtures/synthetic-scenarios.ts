import type { CanonicalAiAnalysis } from '../ai-analysis.ts';
import type { CanonicalAlert } from '../alert.ts';
import type { CanonicalDeployment } from '../deployment.ts';
import type { ErrorFingerprint } from '../error-fingerprint.ts';
import type { CanonicalEvidence } from '../evidence.ts';
import type { CanonicalIncident } from '../incident.ts';
import type { RegressionEvaluationInput } from '../policies.ts';

export const IDS = {
  organization: '11111111-1111-4111-8111-111111111111',
  service: '22222222-2222-4222-8222-222222222222',
  unrelatedService: '33333333-3333-4333-8333-333333333333',
  user: '44444444-4444-4444-8444-444444444444',
  alert1: '50000000-0000-4000-8000-000000000001',
  alert2: '50000000-0000-4000-8000-000000000002',
  alert3: '50000000-0000-4000-8000-000000000003',
  fingerprint: '60000000-0000-4000-8000-000000000001',
  incident: '70000000-0000-4000-8000-000000000001',
  previousIncident: '70000000-0000-4000-8000-000000000002',
  deployment: '80000000-0000-4000-8000-000000000001',
  unrelatedDeployment: '80000000-0000-4000-8000-000000000002',
  evidenceDeployment: '90000000-0000-4000-8000-000000000001',
  evidenceError: '90000000-0000-4000-8000-000000000002',
  analysis: 'a0000000-0000-4000-8000-000000000001',
} as const;

const baseAlert = {
  schemaVersion: '1.0',
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  kind: 'application_error',
  message: 'Tax provider response did not include required field: jurisdiction',
  exceptionType: 'InvalidProviderResponseError',
  stackFrames: [
    {
      function: 'calculateTax',
      file: 'src/checkout/tax-calculation.ts',
      line: 84,
      column: 11,
      inApplication: true,
    },
  ],
  release: 'checkout@2.8.0',
  affectedUserCount: 1,
  tags: { region: 'ap-south-1', transaction: 'checkout' },
} as const;

export const newErrorAlerts: readonly CanonicalAlert[] = [
  {
    ...baseAlert,
    id: IDS.alert1,
    occurredAt: '2026-10-19T10:05:00.000Z',
    recordedAt: '2026-10-19T10:05:02.000Z',
    source: {
      provider: 'sentry',
      externalId: 'evt-new-001',
      externalUrl: 'https://sentry.example.test/events/evt-new-001',
    },
  },
  {
    ...baseAlert,
    id: IDS.alert2,
    occurredAt: '2026-10-19T10:06:00.000Z',
    recordedAt: '2026-10-19T10:06:02.000Z',
    source: { provider: 'sentry', externalId: 'evt-new-002' },
  },
  {
    ...baseAlert,
    id: IDS.alert3,
    occurredAt: '2026-10-19T10:07:00.000Z',
    recordedAt: '2026-10-19T10:07:02.000Z',
    source: { provider: 'sentry', externalId: 'evt-new-003' },
  },
];

export const taxFingerprint: ErrorFingerprint = {
  schemaVersion: '1.0',
  id: IDS.fingerprint,
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  occurredAt: '2026-10-19T10:05:00.000Z',
  recordedAt: '2026-10-19T10:07:03.000Z',
  algorithm: 'sha256:v1',
  value: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  components: {
    exceptionType: 'InvalidProviderResponseError',
    normalizedMessage: 'tax provider response did not include required field: <field>',
    inApplicationFrames: ['calculateTax@src/checkout/tax-calculation.ts'],
  },
  firstSeenAt: '2026-10-19T10:05:00.000Z',
  lastSeenAt: '2026-10-19T10:07:00.000Z',
  occurrenceCount: 3,
};

export const checkoutDeployment: CanonicalDeployment = {
  schemaVersion: '1.0',
  id: IDS.deployment,
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  occurredAt: '2026-10-19T10:00:00.000Z',
  recordedAt: '2026-10-19T10:00:05.000Z',
  source: { provider: 'github', externalId: 'deployment-280' },
  status: 'succeeded',
  repository: { id: 'repo-123', fullName: 'example/checkout' },
  revision: '0123456789abcdef0123456789abcdef01234567',
  version: 'checkout@2.8.0',
  startedAt: '2026-10-19T09:58:00.000Z',
  completedAt: '2026-10-19T10:00:00.000Z',
  pullRequestIds: ['184'],
  changedFiles: [{ path: 'src/checkout/tax-calculation.ts', additions: 21, deletions: 4 }],
};

export const activeIncident: CanonicalIncident = {
  schemaVersion: '1.0',
  id: IDS.incident,
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  occurredAt: '2026-10-19T10:05:00.000Z',
  recordedAt: '2026-10-19T10:05:03.000Z',
  title: 'Checkout tax calculation failures',
  state: 'investigating',
  severity: 'sev2',
  alertIds: newErrorAlerts.map((alert) => alert.id),
  fingerprintIds: [IDS.fingerprint],
  firstDetectedAt: '2026-10-19T10:05:00.000Z',
  lastDetectedAt: '2026-10-19T10:07:00.000Z',
  acknowledgedAt: '2026-10-19T10:08:00.000Z',
  ownerUserId: IDS.user,
  impactSummary: 'Some customers cannot complete checkout when tax calculation is required.',
};

export const historicalResolvedIncident: CanonicalIncident = {
  ...activeIncident,
  id: IDS.previousIncident,
  occurredAt: '2026-10-01T08:00:00.000Z',
  recordedAt: '2026-10-01T08:00:05.000Z',
  state: 'resolved',
  firstDetectedAt: '2026-10-01T08:00:00.000Z',
  lastDetectedAt: '2026-10-01T08:20:00.000Z',
  acknowledgedAt: '2026-10-01T08:03:00.000Z',
  mitigatedAt: '2026-10-01T08:25:00.000Z',
  resolution: {
    category: 'configuration_changed',
    summary: 'Disabled the incompatible tax-provider response mapping.',
    confirmedRootCause: 'Provider schema changed without the expected jurisdiction field.',
    resolvedByUserId: IDS.user,
    resolvedAt: '2026-10-01T08:30:00.000Z',
  },
};

export const deploymentEvidence: CanonicalEvidence = {
  schemaVersion: '1.0',
  id: IDS.evidenceDeployment,
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  occurredAt: checkoutDeployment.completedAt,
  recordedAt: '2026-10-19T10:08:00.000Z',
  incidentId: IDS.incident,
  type: 'deployment',
  trust: 'system_derived',
  summary: 'Release checkout@2.8.0 completed five minutes before the incident began.',
  facts: { version: 'checkout@2.8.0', minutesBeforeIncident: 5, status: 'succeeded' },
  source: { provider: 'github', externalId: 'deployment-280' },
  sourceEntityId: IDS.deployment,
};

export const errorEvidence: CanonicalEvidence = {
  schemaVersion: '1.0',
  id: IDS.evidenceError,
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  occurredAt: '2026-10-19T10:05:00.000Z',
  recordedAt: '2026-10-19T10:08:00.000Z',
  incidentId: IDS.incident,
  type: 'error_sample',
  trust: 'external_untrusted',
  summary: 'New InvalidProviderResponseError appears in tax-calculation.ts.',
  facts: { baselineCount: 0, observationCount: 3, file: 'src/checkout/tax-calculation.ts' },
  source: { provider: 'sentry', externalId: 'evt-new-001' },
  sourceEntityId: IDS.alert1,
};

export const completedAiAnalysis: CanonicalAiAnalysis = {
  schemaVersion: '1.0',
  id: IDS.analysis,
  organizationId: IDS.organization,
  serviceId: IDS.service,
  environment: 'production',
  occurredAt: '2026-10-19T10:09:00.000Z',
  recordedAt: '2026-10-19T10:09:12.000Z',
  incidentId: IDS.incident,
  status: 'completed',
  provider: 'google',
  model: 'configured-gemini-flash-model',
  promptVersion: 'incident-analysis:v1',
  requestedByUserId: IDS.user,
  requestedAt: '2026-10-19T10:09:00.000Z',
  completedAt: '2026-10-19T10:09:12.000Z',
  inputEvidenceIds: [IDS.evidenceDeployment, IDS.evidenceError],
  result: {
    summary: 'Checkout tax calculation errors began shortly after release checkout@2.8.0.',
    impactAssessment: 'A subset of customers requiring tax calculation cannot complete checkout.',
    hypotheses: [
      {
        id: 'hypothesis-1',
        statement:
          'The release may expect a tax-provider field that is absent in current responses.',
        confidence: 0.82,
        evidenceIds: [IDS.evidenceDeployment, IDS.evidenceError],
        uncertainty:
          'Temporal and file overlap are strong, but the provider response has not been inspected directly.',
      },
    ],
    investigationSteps: [
      {
        order: 1,
        instruction: 'Inspect the provider response captured for a failed checkout.',
        rationale:
          'Confirm whether the required jurisdiction field is missing before changing production.',
        evidenceIds: [IDS.evidenceError],
      },
    ],
    internalUpdateDraft: 'Investigating checkout failures correlated with release checkout@2.8.0.',
    customerUpdateDraft: 'We are investigating checkout failures affecting some customers.',
    requiresHumanApproval: true,
  },
};

export interface SyntheticScenario {
  readonly id:
    | 'new-error'
    | 'increased-error-rate'
    | 'duplicate-event'
    | 'unrelated-deployment'
    | 'recurring-incident';
  readonly description: string;
  readonly expected: Readonly<Record<string, string | number | boolean>>;
  readonly regressionInput?: RegressionEvaluationInput;
  readonly deliveredAlerts?: readonly CanonicalAlert[];
  readonly previousIncident?: CanonicalIncident;
}

export const syntheticScenarios: readonly SyntheticScenario[] = [
  {
    id: 'new-error',
    description:
      'A previously unseen error occurs three times immediately after a successful matching deployment.',
    regressionInput: {
      deployment: checkoutDeployment,
      incident: activeIncident,
      baselineOccurrenceCount: 0,
      observationOccurrenceCount: 3,
      releaseMatches: true,
      changedFileStackOverlap: true,
      similarHistoricalRegression: false,
    },
    expected: { regressionCandidate: true, reason: 'new_error_after_deployment' },
  },
  {
    id: 'increased-error-rate',
    description: 'An existing error rises from two baseline occurrences to eight after deployment.',
    regressionInput: {
      deployment: checkoutDeployment,
      incident: activeIncident,
      baselineOccurrenceCount: 2,
      observationOccurrenceCount: 8,
      releaseMatches: true,
      changedFileStackOverlap: false,
      similarHistoricalRegression: false,
    },
    expected: { regressionCandidate: true, reason: 'increased_error_rate' },
  },
  {
    id: 'duplicate-event',
    description:
      'The same provider event is delivered three times and must retain one deduplication identity.',
    deliveredAlerts: [newErrorAlerts[0]!, newErrorAlerts[0]!, newErrorAlerts[0]!],
    expected: { uniqueCanonicalAlerts: 1 },
  },
  {
    id: 'unrelated-deployment',
    description:
      'A temporally close deployment belongs to another service and must not be a candidate.',
    regressionInput: {
      deployment: {
        ...checkoutDeployment,
        id: IDS.unrelatedDeployment,
        serviceId: IDS.unrelatedService,
      },
      incident: activeIncident,
      baselineOccurrenceCount: 0,
      observationOccurrenceCount: 20,
      releaseMatches: false,
      changedFileStackOverlap: false,
      similarHistoricalRegression: false,
    },
    expected: { regressionCandidate: false, reason: 'scope_mismatch' },
  },
  {
    id: 'recurring-incident',
    description:
      'A resolved incident with the same scoped fingerprint occurred within the 90-day lookback.',
    previousIncident: historicalResolvedIncident,
    expected: { recurringIncident: true, createsNewIncident: true },
  },
] as const;
