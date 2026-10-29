import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { INestApplicationContext, LoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

import type { RuntimeOptions } from './types.ts';

const requestContextKey = Symbol('incidentlens.request-context');
const identifierPattern = /^[A-Za-z0-9._:-]{1,128}$/;

interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
}

type ContextualRequest = IncomingMessage & {
  [requestContextKey]?: RequestContext;
};

function validIdentifier(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string' || !identifierPattern.test(value)) {
    return undefined;
  }

  return value;
}

export function assignRequestContext(request: IncomingMessage, response: ServerResponse): string {
  const contextualRequest = request as ContextualRequest;
  const requestId = validIdentifier(request.headers['x-request-id']) ?? randomUUID();
  const correlationId = validIdentifier(request.headers['x-correlation-id']) ?? requestId;

  contextualRequest[requestContextKey] = { requestId, correlationId };
  response.setHeader('x-request-id', requestId);
  response.setHeader('x-correlation-id', correlationId);

  return requestId;
}

export function requestContext(request: IncomingMessage): RequestContext {
  const context = (request as ContextualRequest)[requestContextKey];
  return context ?? { requestId: 'unassigned', correlationId: 'unassigned' };
}

export function createLoggerParameters(options: RuntimeOptions): Params {
  return {
    pinoHttp: {
      level: options.logLevel,
      base: {
        service: options.serviceName,
      },
      genReqId: assignRequestContext,
      customProps: (request) => {
        const context = requestContext(request);
        return {
          requestId: context.requestId,
          correlationId: context.correlationId,
        };
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'request.headers.authorization',
          'request.headers.cookie',
        ],
        censor: '[REDACTED]',
      },
    },
  };
}

export function useStructuredLogger(application: INestApplicationContext): LoggerService {
  const logger = application.get(Logger);
  application.useLogger(logger);
  return logger;
}

export function reportBootstrapFailure(serviceName: string, error: unknown): void {
  const record = {
    level: 'error',
    service: serviceName,
    event: 'bootstrap_failed',
    message: error instanceof Error ? error.message : 'Unknown bootstrap failure.',
  };

  process.stderr.write(`${JSON.stringify(record)}\n`);
}
