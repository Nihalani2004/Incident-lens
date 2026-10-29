'use client';

import { useEffect, useState } from 'react';

import {
  createApiReadinessUrl,
  getRuntimeStatusMessage,
  type ConnectionState,
} from './runtime-status.model';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export function RuntimeStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');

  useEffect(() => {
    const controller = new AbortController();
    const correlationId = crypto.randomUUID();

    async function verifyApiConnection(): Promise<void> {
      try {
        const response = await fetch(createApiReadinessUrl(apiBaseUrl), {
          cache: 'no-store',
          headers: {
            'x-correlation-id': correlationId,
          },
          signal: controller.signal,
        });
        setConnectionState(response.ok ? 'connected' : 'unavailable');
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setConnectionState('unavailable');
        }
      }
    }

    void verifyApiConnection();
    return () => controller.abort();
  }, []);

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
      aria-live="polite"
      aria-label="Local runtime status"
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
        Runtime status
      </p>
      <p className="mt-2 text-sm text-zinc-200">{getRuntimeStatusMessage(connectionState)}</p>
    </section>
  );
}
