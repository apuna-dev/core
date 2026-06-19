import { getCloudflareContext } from "@opennextjs/cloudflare";

// Plant-care log API.
//   GET  /api/plants            → public, read-only list of plants + watering state
//   POST /api/plants            → write (water / add / update). Requires Cloudflare
//                                 Access — we trust the `Cf-Access-Authenticated-User-Email`
//                                 header that Access injects on protected routes.
//
// Storage is Cloudflare D1 (binding `PLANTS_DB`). Until the founder provisions it
// (see docs/plant-care-setup.md) the endpoint degrades gracefully: GET returns an
// empty, `configured:false` list so the page still renders; POST returns 503.

type D1Result = { results?: unknown[] };
type D1Stmt = { bind: (...a: unknown[]) => D1Stmt; run: () => Promise<unknown>; all: () => Promise<D1Result> };
type D1 = { prepare: (sql: string) => D1Stmt; exec: (sql: string) => Promise<unknown> };
type PlantsEnv = { PLANTS_DB?: D1 };

type PlantRow = {
  id: string;
  name: string;
  species: string | null;
  interval_days: number;
  last_watered: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
};

const MAX_NAME = 80;
const MAX_NOTES = 280;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function db(): D1 | null {
  try {
    const { env } = getCloudflareContext() as unknown as { env: PlantsEnv };
    return env.PLANTS_DB ?? null;
  } catch {
    return null;
  }
}

// Cloudflare Access injects this header on a protected route after SSO. Its
// presence (set by Access, not the client) is our write-auth signal.
function accessUser(request: Request): string | null {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  return email && email.includes("@") ? email : null;
}

export async function GET(): Promise<Response> {
  const d = db();
  if (!d) return Response.json({ ok: true, configured: false, plants: [] });
  try {
    const { results } = await d
      .prepare(
        "SELECT id, name, species, interval_days, last_watered, notes, updated_by, updated_at FROM plants ORDER BY name",
      )
      .all();
    return Response.json({ ok: true, configured: true, plants: (results ?? []) as PlantRow[] });
  } catch {
    return Response.json({ ok: true, configured: false, plants: [] });
  }
}

export async function POST(request: Request): Promise<Response> {
  const d = db();
  if (!d) return Response.json({ error: "not_configured" }, { status: 503 });

  const user = accessUser(request);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  const action = str(body.action);
  const now = new Date().toISOString();

  try {
    if (action === "water") {
      const id = str(body.id);
      if (!id) return Response.json({ error: "validation" }, { status: 400 });
      await d
        .prepare("UPDATE plants SET last_watered = ?, updated_by = ?, updated_at = ? WHERE id = ?")
        .bind(now, user, now, id)
        .run();
      return Response.json({ ok: true });
    }

    if (action === "add") {
      const name = str(body.name).slice(0, MAX_NAME);
      if (!name) return Response.json({ error: "validation" }, { status: 400 });
      const species = str(body.species).slice(0, MAX_NAME) || null;
      const intervalDays = Math.min(Math.max(Number(body.intervalDays) || 7, 1), 120);
      const id = crypto.randomUUID();
      await d
        .prepare(
          "INSERT INTO plants (id, name, species, interval_days, last_watered, notes, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(id, name, species, intervalDays, null, null, user, now)
        .run();
      return Response.json({ ok: true, id });
    }

    if (action === "update") {
      const id = str(body.id);
      if (!id) return Response.json({ error: "validation" }, { status: 400 });
      const intervalDays = Math.min(Math.max(Number(body.intervalDays) || 7, 1), 120);
      const notes = str(body.notes).slice(0, MAX_NOTES) || null;
      await d
        .prepare("UPDATE plants SET interval_days = ?, notes = ?, updated_by = ?, updated_at = ? WHERE id = ?")
        .bind(intervalDays, notes, user, now, id)
        .run();
      return Response.json({ ok: true });
    }

    return Response.json({ error: "validation" }, { status: 400 });
  } catch {
    return Response.json({ error: "server" }, { status: 500 });
  }
}
