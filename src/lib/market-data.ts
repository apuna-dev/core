// Delayed market data for the mapped commodities.
//
// Source: World Bank "Pink Sheet" (Commodity Markets) — the only free, Worker-safe,
// redistribution-clean (CC BY 4.0) commodity feed. It's a monthly .xlsx, so we parse it
// OFFLINE (scripts/build-commodity-prices.mjs) into a committed JSON snapshot and read that
// here — the Worker never fetches or parses anything, and no API key is required.
//
// Yahoo/stooq were rejected: they 429 / bot-challenge datacenter (Worker) IPs and carry no
// redistribution licence. Daily energy would need a free EIA key (not wired — monthly only).
//
// Cadence is monthly; we disclose the as-of date. Commodities with no Pink Sheet column
// (hot-rolled steel, PET resin) degrade to "reference only" per the spec — grey the panel
// rather than show a bad number.

import type { CommodityExposure } from "@/lib/commodity";
import { type EiaEnv, eiaSupports, fetchEiaDaily } from "@/lib/eia";
import snapshot from "@/lib/commodity-prices.json";

type Snapshot = {
  source: string;
  sourceUrl: string;
  license: string;
  cadence: string;
  asOf: string;
  commodities: Record<
    string,
    { label: string; unit: string; latest: number; history: number[]; months: string[] }
  >;
};

const SNAP = snapshot as Snapshot;

// A compact, human-readable price indicator per commodity (level, move, trend, position in
// range, volatility) — fed into the extraction prompt so review-prompts are GROUNDED in the
// real series rather than the model's generic priors. Monthly (World Bank); the live EIA daily
// quote may be fresher on display, but the trend it grounds against is the same.
function indicatorSummary(latest: number, history: number[], unit: string): string {
  const parts = [`${latest} ${unit}`];
  if (history.length >= 2) {
    const first = history[0];
    const chg = first > 0 ? ((latest - first) / first) * 100 : 0;
    parts.push(`${chg >= 0 ? "+" : ""}${chg.toFixed(1)}% over ${history.length}mo`);
    const high = Math.max(...history);
    const low = Math.min(...history);
    if (high > 0 && (latest - high) / high > -0.03) parts.push("near period high");
    else if (low > 0 && (latest - low) / low < 0.03) parts.push("near period low");
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const sd = Math.sqrt(
      history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length,
    );
    const cv = mean > 0 ? (sd / mean) * 100 : 0;
    parts.push(`${cv < 4 ? "low" : cv < 10 ? "moderate" : "high"} volatility`);
    if (history.length >= 4) {
      const p3 = history[history.length - 4];
      const r = p3 > 0 ? ((latest - p3) / p3) * 100 : 0;
      if (Math.abs(r) > 2) {
        parts.push(`${r > 0 ? "rising" : "easing"} (${r > 0 ? "+" : ""}${r.toFixed(1)}% last 3mo)`);
      }
    }
  }
  return parts.join(", ");
}

// commodity_key → indicator string, for grounding the LLM's review-prompts.
export const PRICE_INDICATORS: Record<string, string> = Object.fromEntries(
  Object.entries(SNAP.commodities).map(([k, c]) => [
    k,
    indicatorSummary(c.latest, c.history, c.unit),
  ]),
);

export const MARKET_SOURCE = SNAP.source;
export const MARKET_SOURCE_URL = SNAP.sourceUrl;
export const MARKET_ASOF = SNAP.asOf;
export const MARKET_NOTE =
  `Monthly prices from the ${SNAP.source} (${SNAP.license}), as of ${SNAP.asOf}; ` +
  `daily energy prices via the U.S. EIA (public domain) where configured. ` +
  `Delayed and illustrative — decision-support only, not investment advice.`;

// Reference notes for commodities the free monthly feed does not carry.
const REFERENCE_NOTE: Record<string, string> = {
  hot_rolled_steel:
    "No free price feed — watch mill price announcements and iron-ore as an input proxy.",
  pet_plastic:
    "No direct contract — usually tracked via Brent crude + naphtha crack as a proxy.",
  other: "No mapped commodity feed.",
};

export type MarketQuote = {
  status: "ok";
  source: string; // "World Bank" (monthly) or "U.S. EIA" (daily energy)
  cadence: "daily" | "monthly";
  price: number;
  unit: string;
  asOf: string; // "YYYY-MM" (World Bank) or "YYYY-MM-DD" (EIA)
  changePct: number | null; // over the history window
  spark: number[]; // closes, oldest → newest
};

export type MarketStatus =
  | MarketQuote
  | { status: "reference_only"; note: string };

export type PricedCommodity = CommodityExposure & { market: MarketStatus };

// Monthly quote from the committed World Bank snapshot — pure lookup, no network/key.
function worldBankQuote(commodityKey: string): MarketStatus {
  const entry = SNAP.commodities[commodityKey];
  if (!entry || entry.history.length === 0) {
    return {
      status: "reference_only",
      note:
        REFERENCE_NOTE[commodityKey] ??
        "No free monthly feed for this instrument.",
    };
  }
  const spark = entry.history;
  const first = spark[0];
  const changePct =
    typeof first === "number" && first > 0
      ? ((entry.latest - first) / first) * 100
      : null;
  return {
    status: "ok",
    source: "World Bank",
    cadence: "monthly",
    price: entry.latest,
    unit: entry.unit,
    asOf: SNAP.asOf,
    changePct,
    spark,
  };
}

// Attach a market quote to each commodity. Energy commodities use EIA's DAILY feed when an
// EIA key is configured; everything else (and any EIA failure) uses the monthly World Bank
// snapshot. EIA fetches run in parallel; the snapshot path needs no network.
export async function priceCommodities(
  env: EiaEnv,
  commodities: CommodityExposure[],
): Promise<PricedCommodity[]> {
  return Promise.all(
    commodities.map(async (c): Promise<PricedCommodity> => {
      if (env.EIA_API_KEY && eiaSupports(c.commodity_key)) {
        const eia = await fetchEiaDaily(env, c.commodity_key);
        if (eia) {
          return {
            ...c,
            market: {
              status: "ok",
              source: "U.S. EIA",
              cadence: "daily",
              price: eia.price,
              unit: eia.unit,
              asOf: eia.asOf,
              changePct: eia.changePct,
              spark: eia.history,
            },
          };
        }
      }
      return { ...c, market: worldBankQuote(c.commodity_key) };
    }),
  );
}
