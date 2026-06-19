import type { Metadata } from "next";
import Link from "next/link";
import { CORE_SERVICES, CORE_VERSION, type CoreService } from "@/lib/core-bus";

export const metadata: Metadata = {
  title: "Apuna Core — free API bus",
  description:
    "A unified, self-describing OpenAPI surface over Apuna's free, key-less endpoints plus an Open-Meteo weather proxy. One envelope, public, rate-limited.",
};

function curl(s: CoreService): string {
  const base = `https://apuna.dev/core/v1/${s.id}`;
  if (s.method === "GET") {
    const q = s.params?.length
      ? "?" + s.params.map((p) => `${p.name}=${p.example ?? ""}`).join("&")
      : "";
    return `curl "${base}${q}"`;
  }
  const body = JSON.stringify(s.requestExample ?? {});
  return `curl -X POST ${base} \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
}

export default function CorePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-20">
      <header className="border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Apuna Core · v{CORE_VERSION}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          The free API bus
        </h1>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          One self-describing surface over Apuna&apos;s free, key-less endpoints — plus a thin
          Open-Meteo weather proxy. Every response uses the same envelope{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-sm">{`{ ok, service, data | error, meta }`}</code>.
          Public and per-IP rate limited.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/core/openapi.json"
            className="rounded-lg border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-surface"
          >
            OpenAPI 3.1 spec →
          </Link>
          <a
            href="https://editor.swagger.io/?url=https://apuna.dev/core/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            Open in Swagger Editor →
          </a>
        </div>
      </header>

      <ul className="mt-8 flex flex-col gap-5">
        {CORE_SERVICES.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface/40 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                  s.method === "GET"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                }`}
              >
                {s.method}
              </span>
              <code className="font-mono text-sm text-foreground">/core/v1/{s.id}</code>
              {s.cost && (
                <span className="rounded border border-amber-500/40 px-1.5 py-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                  compute · 10/min
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{s.summary}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-3 text-xs text-muted-foreground">
              <code>{curl(s)}</code>
            </pre>
          </li>
        ))}
      </ul>

      <footer className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        <Link href="/en" className="transition-colors hover:text-foreground">
          ← apuna.dev
        </Link>
      </footer>
    </main>
  );
}
