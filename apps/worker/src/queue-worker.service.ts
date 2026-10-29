import type { WorkerEnvironment } from '@incidentlens/config';
import {
  Logger,
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { startQualityGateWorker, type ManagedQueueWorker } from './quality-gate.worker.js';
import { WORKER_ENVIRONMENT } from './tokens.js';

@Injectable()
export class QueueWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkerService.name);
  private worker: ManagedQueueWorker | undefined;

  constructor(@Inject(WORKER_ENVIRONMENT) private readonly environment: WorkerEnvironment) {}

  async onApplicationBootstrap(): Promise<void> {
    const worker = startQualityGateWorker(this.environment.REDIS_URL);
    worker.on('error', () => this.logger.error('The quality-gate queue worker reported an error.'));
    this.worker = worker;
    await worker.waitUntilReady();
    this.logger.log('Quality-gate queue worker started.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
