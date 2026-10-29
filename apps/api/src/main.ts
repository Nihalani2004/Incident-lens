import 'reflect-metadata';

import { validateApiEnvironment } from '@incidentlens/config';
import { reportBootstrapFailure, useStructuredLogger } from '@incidentlens/runtime';
import { NestFactory } from '@nestjs/core';

import { createAppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const environment = validateApiEnvironment(process.env);
  const application = await NestFactory.create(createAppModule(environment), {
    bufferLogs: true,
  });
  const logger = useStructuredLogger(application);
  application.getHttpAdapter().getInstance().disable('x-powered-by');

  application.enableCors({
    allowedHeaders: ['Content-Type', 'X-Correlation-ID', 'X-Request-ID'],
    credentials: true,
    exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],
    origin: environment.WEB_ORIGIN,
  });
  application.enableShutdownHooks();

  await application.listen(environment.API_PORT);
  logger.log({
    event: 'service_started',
    port: environment.API_PORT,
  });
}

void bootstrap().catch((error: unknown) => {
  reportBootstrapFailure('incidentlens-api', error);
  process.exitCode = 1;
});
