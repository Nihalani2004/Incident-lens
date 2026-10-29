import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  activeIncident,
  checkoutDeployment,
  completedAiAnalysis,
  deploymentEvidence,
  errorEvidence,
  historicalResolvedIncident,
  newErrorAlerts,
  syntheticScenarios,
  taxFingerprint,
} from '../src/fixtures/synthetic-scenarios.ts';
import {
  DEFAULT_REGRESSION_POLICY,
  alertDeduplicationKey,
  canTransitionIncident,
  evaluateRegressionCandidate,
  isRecurringIncident,
  validateAiAnalysis,
  validateAlert,
  validateDeployment,
  validateErrorFingerprint,
  validateEvidence,
  validateIncident,
} from '../src/index.ts';

function mutableCopy<T>(value: T): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

describe('canonical contract validation', () => {
  test('accepts every canonical fixture', () => {
    newErrorAlerts.forEach((alert) => assert.equal(validateAlert(alert).success, true));
    assert.equal(validateErrorFingerprint(taxFingerprint).success, true);
    assert.equal(validateDeployment(checkoutDeployment).success, true);
    assert.equal(validateIncident(activeIncident).success, true);
    assert.equal(validateIncident(historicalResolvedIncident).success, true);
    assert.equal(validateEvidence(deploymentEvidence).success, true);
    assert.equal(validateEvidence(errorEvidence).success, true);
    assert.equal(validateAiAnalysis(completedAiAnalysis).success, true);
  });

  test('rejects unsupported schema versions and invalid UTC timestamps', () => {
    const alert = mutableCopy(newErrorAlerts[0]);
    alert.schemaVersion = '2.0';
    alert.occurredAt = '2026-10-19T15:35:00+05:30';
    const validation = validateAlert(alert);
    assert.equal(validation.success, false);
    if (!validation.success) {
      assert.deepEqual(validation.issues.map((entry) => entry.code).sort(), [
        'invalid_timestamp',
        'unsupported_version',
      ]);
    }
  });

  test('rejects negative counts and invalid fingerprint time order', () => {
    const fingerprint = mutableCopy(taxFingerprint);
    fingerprint.occurrenceCount = -1;
    fingerprint.firstSeenAt = '2026-10-19T11:00:00.000Z';
    fingerprint.lastSeenAt = '2026-10-19T10:00:00.000Z';
    const validation = validateErrorFingerprint(fingerprint);
    assert.equal(validation.success, false);
    if (!validation.success) {
      assert.ok(validation.issues.some((entry) => entry.code === 'invalid_count'));
      assert.ok(validation.issues.some((entry) => entry.code === 'invalid_time_order'));
    }
  });

  test('requires human-approved resolution data only on resolved incidents', () => {
    const unresolved = mutableCopy(activeIncident);
    unresolved.resolution = historicalResolvedIncident.resolution as unknown as Record<
      string,
      unknown
    >;
    assert.equal(validateIncident(unresolved).success, false);

    const resolved = mutableCopy(historicalResolvedIncident);
    delete resolved.resolution;
    assert.equal(validateIncident(resolved).success, false);
  });

  test('rejects AI confidence outside inclusive zero-to-one boundary', () => {
    for (const confidence of [-0.01, 1.01]) {
      const analysis = mutableCopy(completedAiAnalysis);
      const result = analysis.result as Record<string, unknown>;
      const hypotheses = result.hypotheses as Record<string, unknown>[];
      hypotheses[0]!.confidence = confidence;
      assert.equal(validateAiAnalysis(analysis).success, false);
    }

    for (const confidence of [0, 1]) {
      const analysis = mutableCopy(completedAiAnalysis);
      const result = analysis.result as Record<string, unknown>;
      const hypotheses = result.hypotheses as Record<string, unknown>[];
      hypotheses[0]!.confidence = confidence;
      assert.equal(validateAiAnalysis(analysis).success, true);
    }
  });

  test('rejects AI citations that were not supplied as input evidence', () => {
    const analysis = mutableCopy(completedAiAnalysis);
    const result = analysis.result as Record<string, unknown>;
    const hypotheses = result.hypotheses as Record<string, unknown>[];
    hypotheses[0]!.evidenceIds = ['b0000000-0000-4000-8000-000000000001'];
    const validation = validateAiAnalysis(analysis);
    assert.equal(validation.success, false);
    if (!validation.success) {
      assert.ok(validation.issues.some((entry) => entry.code === 'unknown_evidence'));
    }
  });
});

describe('incident lifecycle policy', () => {
  test('accepts every approved forward transition', () => {
    assert.equal(canTransitionIncident('open', 'acknowledged'), true);
    assert.equal(canTransitionIncident('acknowledged', 'investigating'), true);
    assert.equal(canTransitionIncident('acknowledged', 'mitigated'), true);
    assert.equal(canTransitionIncident('investigating', 'mitigated'), true);
    assert.equal(canTransitionIncident('investigating', 'resolved'), true);
    assert.equal(canTransitionIncident('mitigated', 'investigating'), true);
    assert.equal(canTransitionIncident('mitigated', 'resolved'), true);
    assert.equal(canTransitionIncident('resolved', 'investigating'), true);
  });

  test('rejects self-transitions and bypass transitions', () => {
    assert.equal(canTransitionIncident('open', 'open'), false);
    assert.equal(canTransitionIncident('open', 'resolved'), false);
    assert.equal(canTransitionIncident('resolved', 'open'), false);
    assert.equal(canTransitionIncident('investigating', 'acknowledged'), false);
  });
});

describe('source-event deduplication', () => {
  test('assigns all duplicate deliveries one stable key', () => {
    const scenario = syntheticScenarios.find((entry) => entry.id === 'duplicate-event')!;
    const keys = new Set(scenario.deliveredAlerts!.map(alertDeduplicationKey));
    assert.equal(keys.size, scenario.expected.uniqueCanonicalAlerts);
  });

  test('changes the key across tenants', () => {
    const alert = newErrorAlerts[0]!;
    const otherTenantKey = alertDeduplicationKey({
      organizationId: 'c0000000-0000-4000-8000-000000000001',
      source: alert.source,
    });
    assert.notEqual(alertDeduplicationKey(alert), otherTenantKey);
  });
});

describe('post-deployment regression policy', () => {
  test('classifies new and increased error reference scenarios', () => {
    for (const id of ['new-error', 'increased-error-rate'] as const) {
      const scenario = syntheticScenarios.find((entry) => entry.id === id)!;
      const evaluation = evaluateRegressionCandidate(scenario.regressionInput!);
      assert.equal(evaluation.outcome, 'candidate');
      assert.ok(evaluation.reasons.includes(String(scenario.expected.reason) as never));
    }
  });

  test('rejects a deployment from another service even with a large spike', () => {
    const scenario = syntheticScenarios.find((entry) => entry.id === 'unrelated-deployment')!;
    const evaluation = evaluateRegressionCandidate(scenario.regressionInput!);
    assert.equal(evaluation.outcome, 'not_candidate');
    assert.ok(evaluation.reasons.includes('scope_mismatch'));
  });

  test('enforces count and ratio thresholds', () => {
    const scenario = syntheticScenarios.find((entry) => entry.id === 'increased-error-rate')!;
    assert.equal(
      evaluateRegressionCandidate({
        ...scenario.regressionInput!,
        baselineOccurrenceCount: 2,
        observationOccurrenceCount: 5,
      }).outcome,
      'not_candidate',
      '5 observations are below the required 3x ratio for a baseline of 2',
    );
    assert.equal(
      evaluateRegressionCandidate({
        ...scenario.regressionInput!,
        baselineOccurrenceCount: 1,
        observationOccurrenceCount: 4,
      }).outcome,
      'not_candidate',
      '4 observations are below the absolute post-deployment minimum',
    );
  });

  test('includes the observation-window boundary and excludes one millisecond after it', () => {
    const atBoundary = {
      ...activeIncident,
      firstDetectedAt: '2026-10-19T11:00:00.000Z',
    };
    const afterBoundary = {
      ...activeIncident,
      firstDetectedAt: '2026-10-19T11:00:00.001Z',
    };
    const common = {
      deployment: checkoutDeployment,
      baselineOccurrenceCount: 0,
      observationOccurrenceCount: 3,
      releaseMatches: false,
      changedFileStackOverlap: false,
      similarHistoricalRegression: false,
    };
    assert.equal(
      evaluateRegressionCandidate({ ...common, incident: atBoundary }).outcome,
      'candidate',
    );
    assert.equal(
      evaluateRegressionCandidate({ ...common, incident: afterBoundary }).outcome,
      'not_candidate',
    );
  });

  test('does not classify failed deployments as candidates', () => {
    const deployment = { ...checkoutDeployment, status: 'failed' as const };
    const evaluation = evaluateRegressionCandidate({
      deployment,
      incident: activeIncident,
      baselineOccurrenceCount: 0,
      observationOccurrenceCount: 100,
      releaseMatches: true,
      changedFileStackOverlap: true,
      similarHistoricalRegression: true,
    });
    assert.equal(evaluation.outcome, 'not_candidate');
    assert.ok(evaluation.reasons.includes('deployment_not_successful'));
  });
});

describe('recurring incident policy', () => {
  test('identifies the recurring reference scenario without reopening the prior incident', () => {
    const scenario = syntheticScenarios.find((entry) => entry.id === 'recurring-incident')!;
    assert.equal(
      isRecurringIncident(
        activeIncident,
        taxFingerprint,
        scenario.previousIncident!,
        taxFingerprint,
      ),
      true,
    );
    assert.equal(scenario.expected.createsNewIncident, true);
  });

  test('includes the 90-day boundary and excludes one millisecond beyond it', () => {
    const resolvedAt = historicalResolvedIncident.resolution!.resolvedAt;
    const boundaryTime = new Date(
      Date.parse(resolvedAt) + DEFAULT_REGRESSION_POLICY.recurrenceLookbackDays * 24 * 60 * 60_000,
    ).toISOString();
    const afterBoundaryTime = new Date(Date.parse(boundaryTime) + 1).toISOString();
    assert.equal(
      isRecurringIncident(
        { ...activeIncident, firstDetectedAt: boundaryTime },
        taxFingerprint,
        historicalResolvedIncident,
        taxFingerprint,
      ),
      true,
    );
    assert.equal(
      isRecurringIncident(
        { ...activeIncident, firstDetectedAt: afterBoundaryTime },
        taxFingerprint,
        historicalResolvedIncident,
        taxFingerprint,
      ),
      false,
    );
  });

  test('rejects recurrence across a different environment or fingerprint', () => {
    assert.equal(
      isRecurringIncident(
        { ...activeIncident, environment: 'staging' },
        taxFingerprint,
        historicalResolvedIncident,
        taxFingerprint,
      ),
      false,
    );
    assert.equal(
      isRecurringIncident(
        activeIncident,
        { ...taxFingerprint, value: 'f'.repeat(64) },
        historicalResolvedIncident,
        taxFingerprint,
      ),
      false,
    );
  });
});

test('all five required synthetic scenarios are present', () => {
  assert.deepEqual(syntheticScenarios.map((entry) => entry.id).sort(), [
    'duplicate-event',
    'increased-error-rate',
    'new-error',
    'recurring-incident',
    'unrelated-deployment',
  ]);
});
