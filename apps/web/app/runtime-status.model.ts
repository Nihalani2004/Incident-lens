export type ConnectionState = 'checking' | 'connected' | 'unavailable';

const messages: Readonly<Record<ConnectionState, string>> = Object.freeze({
  checking: 'Checking API and local dependencies…',
  connected: 'API, PostgreSQL, pgvector, and Redis are connected.',
  unavailable: 'The local runtime is unavailable. Check the service health endpoints.',
});

export function getRuntimeStatusMessage(connectionState: ConnectionState): string {
  return messages[connectionState];
}

export function createApiReadinessUrl(apiBaseUrl: string): string {
  return new URL('/health/ready', apiBaseUrl).toString();
}
