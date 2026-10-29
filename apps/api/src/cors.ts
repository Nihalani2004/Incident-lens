export function createApiCorsOptions(origin: string) {
  return {
    allowedHeaders: ['Content-Type', 'X-Correlation-ID', 'X-Request-ID'],
    credentials: true,
    exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],
    origin,
  } as const;
}
