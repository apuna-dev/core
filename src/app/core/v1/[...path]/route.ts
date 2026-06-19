import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CORE_SERVICES, fail, findService, ok, rateLimit } from "@/lib/core-bus";

// apuna.dev/core/v1/<service> — the gateway.
//
// Dispatches to our existing route handlers IN-PROCESS (no self-subrequest, so no
// worker self-reference dance) and normalises everything into one envelope:
//   { ok, service, data | error, meta }
// Per-IP rate limited (harder on cost-bearing endpoints). Open CORS so browsers and
// future dashboards can read it. See src/lib/core-bus.ts for the registry.

// Internal handlers, called directly. Importing them keeps the bus in lock-step with
// the real endpoints — same logic, same Cloudflare context, no extra network hop.
import { GET as statsGET } from "@/app/api/stats/route";
import { GET as botsGET } from "@/app/api/bots-blocked/route";
import { GET as transparencyGET } from "@/app/api/transparency/route";
import { GET as plantsGET } from "@/app/api/plants/route";
import { POST as commodityPOST } from "@/app/api/commodity/route";
import { POST as hardwarePOST } from "@/app/api/hardware/route";

type KV = {
  get: (k: string) => Promise<string | null>;
  put: (k: string, v: string, opts?: { expirationTtl?: number }) => Promise<void>;
};
type BusEnv = { CORE_RL?: KV };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// id → handler that takes the (already-targeted) Request and returns the upstream Response.
const INTERNAL: Record<string, (req: Request) => Promise<Response>> = {
  stats: () => statsGET(),
  "bots-blocked": () => botsGET(),
  transparency: () => transparencyGET(),
  plants: () => plantsGET(),
  commodity: (req) => commodityPOST(req),
  hardware: (req) => hardwarePOST(req),
};

function withHeaders(res: Response, headers: Record<string, string>): Response {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

async function fetchWeather(req: Request, service: string): Promise<Response> {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return fail(service, "validation", "Provide valid lat (-90..90) and lon (-180..180) query params.", 400);
  }
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return fail(service, "upstream", "Open-Meteo is unavailable.", 502, { upstream: "open-meteo.com" });
    const data = await res.json();
    return ok(service, data, { upstream: "open-meteo.com" });
  } catch {
    return fail(service, "upstream", "Weather lookup failed.", 502, { upstream: "open-meteo.com" });
  }
}

// Wrap an internal handler's JSON response in the bus envelope.
async function wrapInternal(service: string, upstream: Response): Promise<Response> {
  let body: unknown = null;
  try {
    body = await upstream.json();
  } catch {
    /* upstream returned no / invalid JSON */
  }
  if (upstream.ok) return ok(service, body, { upstream: `apuna.dev internal` });
  const code = (body as { error?: string } | null)?.error ?? "upstream";
  return fail(service, code, `Upstream returned ${upstream.status}.`, upstream.status, { upstream: "apuna.dev internal" });
}

async function handle(request: Request, params: Promise<{ path?: string[] }>): Promise<Response> {
  const { path } = await params;
  const id = path?.[0] ?? "";
  const service = findService(id);
  if (!service) {
    return withHeaders(
      fail(id || "(none)", "not_found", `Unknown service. See apuna.dev/core for the catalog.`, 404, {
        services: CORE_SERVICES.map((s) => s.id),
      }),
      CORS,
    );
  }

  if (request.method !== service.method) {
    return withHeaders(fail(id, "method_not_allowed", `Use ${service.method} for this service.`, 405), CORS);
  }

  // Rate limit by client IP.
  let kv: KV | undefined;
  try {
    ({ CORE_RL: kv } = (getCloudflareContext() as unknown as { env: BusEnv }).env);
  } catch {
    kv = undefined;
  }
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimit(kv, service, ip);
  const rlHeaders = {
    ...CORS,
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.reset),
  };
  if (!rl.allowed) {
    return withHeaders(fail(id, "rate_limited", "Too many requests — slow down.", 429), rlHeaders);
  }

  let out: Response;
  if (id === "weather") {
    out = await fetchWeather(request, id);
  } else {
    const upstream = await INTERNAL[id](request);
    out = await wrapInternal(id, upstream);
  }
  return withHeaders(out, rlHeaders);
}

export async function GET(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return handle(request, ctx.params);
}
export async function POST(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  return handle(request, ctx.params);
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
