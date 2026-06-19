import {
  PILLARS,
  TRANSPARENCY_SOURCES,
  type Pillar,
} from "@/lib/transparency-sources";

// Transparency dashboard — the data-source registry endpoint (T1).
//
// Returns the typed manifest of every data source the site has: which pillar it
// belongs to (Operational / Market / Knowledge — stand-ins for IoT / ERP / Docs),
// its origin (linkable), cadence, and declared `kind`. This is the static
// contract; the LIVE runtime status (live / unavailable) is derived per-source
// at fetch time by the dashboard (T3), never asserted here. No secrets, no
// external calls — pure first-party metadata, safe to serve publicly.
//
// Open CORS so a browser-side embed (or a future Grafana/Infinity panel) can read it.

export async function GET(): Promise<Response> {
  const pillars = (Object.keys(PILLARS) as Pillar[]).map((id) => ({
    id,
    ...PILLARS[id],
  }));

  return Response.json(
    {
      pillars,
      sources: TRANSPARENCY_SOURCES,
      count: TRANSPARENCY_SOURCES.length,
      note:
        "Apuna's own data sources, honestly sourced. The three pillars are " +
        "stand-ins for a client's IoT telemetry, ERP, and Documentation. " +
        "Live status is verified at request time, not asserted here.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
