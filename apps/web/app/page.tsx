import { RuntimeStatus } from './runtime-status';

const runtimeCapabilities = [
  'PostgreSQL with pgvector',
  'Redis runtime dependency',
  'API and worker health probes',
  'Structured correlation logging',
] as const;

export default function FoundationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
          Local runtime
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">IncidentLens</h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-400">
          The Phase 1C runtime verifies every application boundary before product workflows are
          introduced.
        </p>
      </div>

      <RuntimeStatus />

      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Configured runtime capabilities">
        {runtimeCapabilities.map((capability) => (
          <li
            key={capability}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-200"
          >
            {capability}
          </li>
        ))}
      </ul>
    </main>
  );
}
