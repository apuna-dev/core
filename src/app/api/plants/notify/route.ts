import { getCloudflareContext } from "@opennextjs/cloudflare";

// "Time to water" reminder → Google Chat.
//
// Designed to be hit by a scheduled trigger (Cloudflare Cron or any external
// scheduler) once or twice a day. Auth is a shared secret in the query/header so
// only the scheduler can fire it — it is NOT a public endpoint.
//
// Posts one message to a Google Chat space via an INCOMING WEBHOOK URL
// (`GOOGLE_CHAT_WEBHOOK_URL` secret). Degrades gracefully (503) until both the
// D1 binding and the webhook secret are provisioned — see docs/plant-care-setup.md.
//
// Weather-aware: it pulls current conditions from Open-Meteo (no API key) for the
// configured office location and shortens the interval in hot/dry weather.

type D1Result = { results?: unknown[] };
type D1Stmt = { bind: (...a: unknown[]) => D1Stmt; all: () => Promise<D1Result> };
type D1 = { prepare: (sql: string) => D1Stmt };
type NotifyEnv = {
  PLANTS_DB?: D1;
  GOOGLE_CHAT_WEBHOOK_URL?: string;
  PLANT_NOTIFY_SECRET?: string;
  // Office location for the weather lookup; falls back to a default coordinate.
  PLANT_LAT?: string;
  PLANT_LON?: string;
};

type PlantRow = {
  id: string;
  name: string;
  interval_days: number;
  last_watered: string | null;
};

const DAY_MS = 86_400_000;

// Hot + dry → water sooner; cool + wet → later. Returns a multiplier on the interval.
async function weatherFactor(lat: number, lon: number): Promise<number> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return 1;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number };
    };
    const t = data.current?.temperature_2m ?? 18;
    const rh = data.current?.relative_humidity_2m ?? 50;
    let f = 1;
    if (t >= 28) f -= 0.25;
    else if (t >= 23) f -= 0.12;
    else if (t <= 8) f += 0.2;
    if (rh <= 30) f -= 0.1;
    else if (rh >= 80) f += 0.1;
    return Math.min(Math.max(f, 0.6), 1.4);
  } catch {
    return 1;
  }
}

function isDue(p: PlantRow, factor: number, now: number): boolean {
  if (!p.last_watered) return true; // never logged → flag it
  const due = new Date(p.last_watered).getTime() + p.interval_days * factor * DAY_MS;
  return now >= due;
}

async function handle(request: Request): Promise<Response> {
  let env: NotifyEnv;
  try {
    ({ env } = getCloudflareContext() as unknown as { env: NotifyEnv });
  } catch {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  // Shared-secret gate (scheduler only).
  const secret = env.PLANT_NOTIFY_SECRET;
  const given =
    new URL(request.url).searchParams.get("key") ?? request.headers.get("X-Notify-Key");
  if (secret && given !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!env.PLANTS_DB || !env.GOOGLE_CHAT_WEBHOOK_URL) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const lat = Number(env.PLANT_LAT ?? "52.52");
  const lon = Number(env.PLANT_LON ?? "13.405");
  const factor = await weatherFactor(lat, lon);
  const now = Date.now();

  let due: PlantRow[];
  try {
    const { results } = await env.PLANTS_DB.prepare(
      "SELECT id, name, interval_days, last_watered FROM plants",
    ).all();
    due = ((results ?? []) as PlantRow[]).filter((p) => isDue(p, factor, now));
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }

  if (due.length === 0) return Response.json({ ok: true, due: 0 });

  const names = due.map((p) => `• ${p.name}`).join("\n");
  const text =
    `🪴 *Time to water* (weather-adjusted)\n${names}\n\n` +
    `Log it: https://apuna.dev/en/plants`;

  try {
    await fetch(env.GOOGLE_CHAT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return Response.json({ error: "webhook_failed" }, { status: 502 });
  }

  return Response.json({ ok: true, due: due.length });
}

export const GET = handle;
export const POST = handle;
