import { createQualityGateWorker } from '@incidentlens/queue';

export interface ManagedQueueWorker {
  close(): Promise<void>;
  on(event: 'error', listener: (error: Error) => void): unknown;
  waitUntilReady(): Promise<unknown>;
}

export type QualityGateWorkerFactory = (redisUrl: string) => ManagedQueueWorker;

export function startQualityGateWorker(
  redisUrl: string,
  factory: QualityGateWorkerFactory = createQualityGateWorker,
): ManagedQueueWorker {
  return factory(redisUrl);
}
