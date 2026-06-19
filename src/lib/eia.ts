// U.S. EIA Open Data — free, public-domain, key-authed (so Worker-safe, unlike Yahoo).
// Gives DAILY spot prices for the energy commodities; everything else stays on the monthly
// World Bank snapshot. Register a free key at https://www.eia.gov/opendata/ and set EIA_API_KEY.
// Without the key (or on any failure) callers fall back to World Bank — energy just shows monthly.

export type EiaEnv = { EIA_API_KEY?: string };

const EIA_BASE = "https://api.eia.gov/v2";

// Energy commodity_key → EIA v2 route + series id (daily spot).
const EIA_SERIES: Record<string, { route: string; series: string }> = {
  brent_crude: { route: "petroleum/pri/spt", series: "RBRTE" }, // Europe Brent spot, $/bbl
  wti_crude: { route: "petroleum/pri/spt", series: "RWTC" }, // Cushing WTI spot, $/bbl
  natural_gas: { route: "natural-gas/pri/fut", series: "RNGWHHD" }, // Henry Hub spot, $/mmbtu
};

export type EiaQuote = {
  price: number;
  unit: string;
  asOf: string; // ISO-ish date of the latest print
  history: number[]; // oldest → newest
  changePct: number | null;
};

export function eiaSupports(commodityKey: string): boolean {
  return commodityKey in EIA_SERIES;
}

export async function fetchEiaDaily(
  env: EiaEnv,
  commodityKey: string,
): Promise<EiaQuote | null> {
  const cfg = EIA_SERIES[commodityKey];
  if (!env.EIA_API_KEY || !cfg) return null;

  const params = new URLSearchParams({
    api_key: env.EIA_API_KEY,
    frequency: "daily",
    "data[0]": "value",
    "facets[series][]": cfg.series,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: "20",
  });

  try {
    const res = await fetch(`${EIA_BASE}/${cfg.route}/data/?${params.toString()}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      response?: {
        data?: { period: string; value: number | string; units?: string }[];
      };
    };
    const rows = json.response?.data ?? [];
    const points = rows
      .map((r) => ({
        period: String(r.period),
        value: typeof r.value === "number" ? r.value : parseFloat(String(r.value)),
        units: r.units ?? "",
      }))
      .filter((p) => Number.isFinite(p.value));
    if (points.length === 0) return null;

    points.reverse(); // EIA returns newest-first; we want oldest → newest
    const history = points.map((p) => p.value);
    const latest = points[points.length - 1];
    const first = history[0];
    const changePct =
      typeof first === "number" && first > 0
        ? ((latest.value - first) / first) * 100
        : null;

    return {
      price: latest.value,
      unit: latest.units,
      asOf: latest.period,
      history,
      changePct,
    };
  } catch {
    return null;
  }
}
