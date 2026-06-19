import snapshot from "@/lib/commodity-prices.json";

// Grafana-readable commodity price series (flat rows), for the Infinity datasource to query
// from a Grafana instance. Public, redistribution-clean (World Bank, CC BY 4.0) — fast, no LLM,
// no key. The per-company analysis stays at POST /api/commodity; this is the markets feed.
//
// Infinity setup: type=JSON, source=URL, URL=https://apuna.dev/api/commodity/prices,
// rows/root = `prices`, columns: month (time, format YYYY-MM), price (number), label/commodity/unit (string).

type Snapshot = {
  source: string;
  sourceUrl: string;
  license: string;
  asOf: string;
  commodities: Record<
    string,
    { label: string; unit: string; latest: number; history: number[]; months: string[] }
  >;
};

const SNAP = snapshot as Snapshot;

export async function GET(): Promise<Response> {
  const prices: {
    commodity: string;
    label: string;
    unit: string;
    month: string; // "YYYY-MM" (for display)
    date: string; // ISO timestamp (for Grafana's time axis)
    price: number;
  }[] = [];

  for (const [key, c] of Object.entries(SNAP.commodities)) {
    c.months.forEach((month, i) => {
      const price = c.history[i];
      if (typeof price === "number" && Number.isFinite(price)) {
        prices.push({
          commodity: key,
          label: c.label,
          unit: c.unit,
          month,
          date: `${month}-01T00:00:00.000Z`,
          price,
        });
      }
    });
  }

  return Response.json(
    {
      source: SNAP.source,
      sourceUrl: SNAP.sourceUrl,
      license: SNAP.license,
      asOf: SNAP.asOf,
      prices,
    },
    {
      headers: {
        // Public price data — open CORS so a browser-side embed can read it too.
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
