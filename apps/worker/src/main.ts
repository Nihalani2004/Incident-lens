import 'reflect-metadata';

import { validateWorkerEnvironment } from '@incidentlens/config';
import { reportBootstrapFailure, useStructuredLogger } from '@incidentlens/runtime';
import { NestFactory } from '@nestjs/core';

import { createWorkerModule } from './worker.module.js';

async function bootstrap(): Promise<void> {
  const environment = validateWorkerEnvironment(process.env);
  const application = await NestFactory.create(createWorkerModule(environment), {
    bufferLogs: true,
  });
  const logger = useStructuredLogger(application);
  application.getHttpAdapter().getInstance().disable('x-powered-by');

  application.enableShutdownHooks();
  await application.listen(environment.WORKER_PORT);
  logger.log({
    event: 'service_started',
    port: environment.WORKER_PORT,
  });
}

void bootstrap().catch((error: unknown) => {
  reportBootstrapFailure('incidentlens-worker', error);
  process.exitCode = 1;
});
