import 'reflect-metadata';

import { validateWorkerEnvironment } from '@incidentlens/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module.js';

const bootstrapLogger = new Logger('WorkerBootstrap');

async function bootstrap(): Promise<void> {
  validateWorkerEnvironment(process.env);
  const application = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  application.enableShutdownHooks();
  bootstrapLogger.log('Worker foundation initialized; queue consumers are deferred to Phase 1C.');
}

void bootstrap().catch((error: unknown) => {
  bootstrapLogger.error(
    'Worker bootstrap failed.',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
