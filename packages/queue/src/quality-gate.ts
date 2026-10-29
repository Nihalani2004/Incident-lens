import { Queue, QueueEvents, Worker, type Job } from 'bullmq';

import { createQueueConnectionOptions } from './connection.ts';

export const qualityGateQueueName = 'incidentlens-quality-gate-v1';
export const incidentLensQueuePrefix = 'incidentlens';
export type QualityGateJobName = 'quality-gate-probe';

export interface QualityGateJobData {
  readonly probeId: string;
  readonly requestedAt: string;
}

export interface QualityGateJobResult {
  readonly probeId: string;
  readonly processedAt: string;
  readonly status: 'processed';
}

export function processQualityGateJob(
  data: QualityGateJobData,
  now: Date = new Date(),
): QualityGateJobResult {
  if (data.probeId.trim().length === 0) throw new Error('A quality-gate probe ID is required.');
  if (!Number.isFinite(Date.parse(data.requestedAt))) {
    throw new Error('The quality-gate requestedAt value must be an ISO timestamp.');
  }

  return {
    probeId: data.probeId,
    processedAt: now.toISOString(),
    status: 'processed',
  };
}

export function createQualityGateWorker(
  redisUrl: string,
): Worker<QualityGateJobData, QualityGateJobResult, QualityGateJobName> {
  return new Worker<QualityGateJobData, QualityGateJobResult, QualityGateJobName>(
    qualityGateQueueName,
    (job: Job<QualityGateJobData, QualityGateJobResult, QualityGateJobName>) =>
      Promise.resolve(processQualityGateJob(job.data)),
    {
      concurrency: 1,
      connection: createQueueConnectionOptions(redisUrl, 'worker'),
      prefix: incidentLensQueuePrefix,
    },
  );
}

export async function runQualityGateProbe(
  redisUrl: string,
  data: QualityGateJobData,
): Promise<QualityGateJobResult> {
  const connection = createQueueConnectionOptions(redisUrl, 'producer');
  const queue = new Queue<QualityGateJobData, QualityGateJobResult, QualityGateJobName>(
    qualityGateQueueName,
    {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
      prefix: incidentLensQueuePrefix,
    },
  );
  const events = new QueueEvents(qualityGateQueueName, {
    connection: createQueueConnectionOptions(redisUrl, 'worker'),
    prefix: incidentLensQueuePrefix,
  });

  try {
    await events.waitUntilReady();
    const job = await queue.add('quality-gate-probe', data, { jobId: data.probeId });
    return await job.waitUntilFinished(events, 10_000);
  } finally {
    await Promise.all([events.close(), queue.close()]);
  }
}
