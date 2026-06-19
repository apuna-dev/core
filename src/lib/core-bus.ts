// apuna.dev/core — the OpenAPI "bus" registry.
//
// One self-describing surface over our free, key-less endpoints plus a thin
// Open-Meteo weather proxy. This module is DATA ONLY (no route handlers, no React)
// so it can be imported by the gateway, the OpenAPI generator, and the docs page
// alike. The gateway (src/app/core/v1/[...path]/route.ts) maps each id to a handler.

export type CoreParam = {
  name: string;
  required: boolean;
  description: string;
  example?: string;
};

export type CoreService = {
  id: string;
  method: "GET" | "POST";
  summary: string;
  description: string;
  /** true for Requesty-backed endpoints that burn free model quota — rate-gated harder. */
  cost: boolean;
  /** Query params (GET) or documented for both. */
  params?: CoreParam[];
  /** Example JSON body for POST services. */
  requestExample?: Record<string, unknown>;
  /** Where the data ultimately comes from (shown in docs + envelope meta). */
  upstream: string;
};

export const CORE_VERSION = "0.1.0";

export const CORE_SERVICES: CoreService[] = [
  {
    id: "weather",
    method: "GET",
    summary: "Current weather for a location",
    description:
      "Thin proxy to Open-Meteo (no API key). Returns current temperature, humidity and precipitation for the given coordinates.",
    cost: false,
    upstream: "open-meteo.com",
    params: [
      { name: "lat", required: true, description: "Latitude (-90..90)", example: "52.52" },
      { name: "lon", required: true, description: "Longitude (-180..180)", example: "13.405" },
    ],
  },
  {
    id: "stats",
    method: "GET",
    summary: "Site transparency counters",
    description: "Read-only KV counters: bots blocked and legitimate form submissions.",
    cost: false,
    upstream: "apuna.dev/api/stats",
  },
  {
    id: "bots-blocked",
    method: "GET",
    summary: "Count of automated submissions blocked",
    description: "Read-only tally of bot submissions stopped at the form layer (honeypot + Turnstile).",
    cost: false,
    upstream: "apuna.dev/api/bots-blocked",
  },
  {
    id: "transparency",
    method: "GET",
    summary: "Data-source registry",
    description: "The typed manifest of every data source the site uses, grouped by pillar. First-party metadata, no secrets.",
    cost: false,
    upstream: "apuna.dev/api/transparency",
  },
  {
    id: "plants",
    method: "GET",
    summary: "Office-plant watering log (read-only)",
    description: "Public read of the office-plant watering log. Writes are team-only via Cloudflare Access and are not exposed on the bus.",
    cost: false,
    upstream: "apuna.dev/api/plants",
  },
  {
    id: "commodity",
    method: "POST",
    summary: "Commodity intelligence from a company URL",
    description:
      "Fetches a company's public site, safety-screens the text, extracts the top purchasing commodities, and attaches delayed market quotes. Decision-support only. Cost-bearing (free model via Requesty).",
    cost: true,
    upstream: "apuna.dev/api/commodity",
    requestExample: { url: "https://example-manufacturer.com" },
  },
  {
    id: "hardware",
    method: "POST",
    summary: "Hardware bring-up how-to, grounded in docs",
    description:
      "Resolves a component, fetches documentation, and grounds every wiring/config/code claim in what was found. Cost-bearing (free model via Requesty).",
    cost: true,
    upstream: "apuna.dev/api/hardware",
    requestExample: { component: "MFRC522 RFID reader", docUrl: "" },
  },
];

export function findService(id: string): CoreService | undefined {
  return CORE_SERVICES.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Uniform response envelope
// ---------------------------------------------------------------------------

export function ok(service: string, data: unknown, meta: Record<string, unknown> = {}): Response {
  return Response.json({ ok: true, service, data, meta: { via: "apuna.dev/core", ...meta } });
}

export function fail(
  service: string,
  code: string,
  message: string,
  status: number,
  meta: Record<string, unknown> = {},
): Response {
  return Response.json(
    { ok: false, service, error: { code, message }, meta: { via: "apuna.dev/core", ...meta } },
    { status },
  );
}

// ---------------------------------------------------------------------------
// Per-IP rate limit (best-effort)
// ---------------------------------------------------------------------------
//
// Fixed 60s window. Uses a CORE_RL KV namespace when bound (set up per docs/core-bus.md);
// otherwise falls back to an in-isolate counter so the mechanism still works in dev and
// on a single warm isolate. For hard guarantees, upgrade to Cloudflare's native Rate
// Limiting binding (see runbook).

type KV = {
  get: (k: string) => Promise<string | null>;
  put: (k: string, v: string, opts?: { expirationTtl?: number }) => Promise<void>;
};

const WINDOW_S = 60;
const memBuckets = new Map<string, { count: number; reset: number }>();

export type RateVerdict = { allowed: boolean; limit: number; remaining: number; reset: number };

export async function rateLimit(
  kv: KV | undefined,
  service: CoreService,
  ip: string,
): Promise<RateVerdict> {
  const limit = service.cost ? 10 : 60; // requests per minute
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % WINDOW_S);
  const reset = windowStart + WINDOW_S;
  const key = `rl:${service.id}:${ip}:${windowStart}`;

  let count: number;
  if (kv) {
    const raw = await kv.get(key);
    count = raw ? Number(raw) + 1 : 1;
    await kv.put(key, String(count), { expirationTtl: WINDOW_S + 5 });
  } else {
    const b = memBuckets.get(key);
    count = b && b.reset === reset ? b.count + 1 : 1;
    memBuckets.set(key, { count, reset });
    if (memBuckets.size > 5000) memBuckets.clear(); // crude cap
  }

  return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), reset };
}
