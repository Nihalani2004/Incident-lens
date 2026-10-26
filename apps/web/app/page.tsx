const workspaceBoundaries = [
  'Next.js web application',
  'NestJS API process',
  'Independent NestJS worker process',
  'Shared contracts and environment validation',
] as const;

export default function FoundationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
          Workspace foundation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">IncidentLens</h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-400">
          The Phase 1B application boundaries are ready. Product workflows begin in later roadmap
          phases.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Configured workspace boundaries">
        {workspaceBoundaries.map((boundary) => (
          <li
            key={boundary}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-200"
          >
            {boundary}
          </li>
        ))}
      </ul>
    </main>
  );
}
