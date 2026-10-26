import 'reflect-metadata';

import { validateApiEnvironment } from '@incidentlens/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const environment = validateApiEnvironment(process.env);
  const application = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  application.enableCors({
    credentials: true,
    origin: environment.WEB_ORIGIN,
  });
  application.enableShutdownHooks();

  await application.listen(environment.API_PORT);
  bootstrapLogger.log(`API foundation listening on port ${environment.API_PORT}.`);
}

void bootstrap().catch((error: unknown) => {
  bootstrapLogger.error('API bootstrap failed.', error instanceof Error ? error.stack : undefined);
  process.exitCode = 1;
});
