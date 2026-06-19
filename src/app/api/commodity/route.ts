import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fetchSiteText, normalizeUrl } from "@/lib/fetch-site";
import { DISCLAIMER, extractProfile, screenContent } from "@/lib/commodity";
import {
  MARKET_ASOF,
  MARKET_NOTE,
  MARKET_SOURCE,
  MARKET_SOURCE_URL,
  priceCommodities,
} from "@/lib/market-data";
import { RequestyError, hasRequesty, type RequestyEnv } from "@/lib/requesty";
import type { EiaEnv } from "@/lib/eia";

// Commodity Intelligence demo endpoint. POST { url } → fetch the company's public site →
// safety-screen the untrusted text → extract the top-5 purchasing commodities → attach delayed
// market quotes. Decision-support only; a human owns every decision.
//
// An analysis is stable for a while and the LLM pass is slow + cost-bearing, so results are cached
// by URL in the Cloudflare Cache API (24h). Repeat requests are instant, skip the models entirely,
// and — usefully — sidestep transient model-call timeouts. Caching is a no-op in local `next dev`.

type CommodityEnv = RequestyEnv & EiaEnv;
type Ctx = { waitUntil: (p: Promise<unknown>) => void };

const MAX_URL = 300;
const CACHE_TTL = 60 * 60 * 24; // seconds

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Minimal typed accessor for the Workers Cache API (avoids depending on ambient globals).
type EdgeCache = {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
};
function edgeCache(): EdgeCache | null {
  const c = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return c?.default ?? null;
}
function cacheKeyFor(normalizedUrl: string): Request {
  return new Request(
    `https://commodity-cache.apuna.dev/v1?u=${encodeURIComponent(normalizedUrl)}`,
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  const url = str(body.url);
  if (!url || url.length > MAX_URL) {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  const { env, ctx } = getCloudflareContext() as unknown as {
    env: CommodityEnv;
    ctx: Ctx;
  };
  if (!hasRequesty(env)) {
    // Graceful: the tool is not configured (no Requesty key) rather than a 500.
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  // Serve a cached analysis for this URL if we have one.
  const cache = edgeCache();
  const normalized = normalizeUrl(url);
  const cacheKey = normalized ? cacheKeyFor(normalized) : null;
  if (cache && cacheKey) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  // 1. Fetch the company's public website (SSRF-safe, size/timeout capped).
  const site = await fetchSiteText(url);
  if (!site.ok) {
    return Response.json({ error: "fetch", reason: site.error }, { status: 422 });
  }

  // 2. Screen the untrusted page text (best-effort safety gate).
  const screen = await screenContent(env, site.text);
  if (!screen.safe) {
    return Response.json(
      { error: "unsafe_content", reason: screen.reason ?? "flagged" },
      { status: 422 },
    );
  }

  // 3 + 4. Extract the structured purchasing profile, then attach market data. The reasoning
  // pass degrades to a lighter model inside requestyChat if it overruns its budget, so there is
  // no route-level retry (a retry only re-ran the same slow call and doubled the wait).
  try {
    const profile = await extractProfile(env, site.finalUrl, site.text);
    if (!profile) {
      return Response.json({ error: "extraction_failed" }, { status: 502 });
    }

    const priced = await priceCommodities(env, profile.commodities);

    const res = Response.json(
      {
        ok: true,
        profile: {
          company: profile.company || site.title,
          summary: profile.summary,
          commodities: priced,
          generatedAt: profile.generatedAt,
          sourceUrl: site.finalUrl,
        },
        market: {
          source: MARKET_SOURCE,
          sourceUrl: MARKET_SOURCE_URL,
          asOf: MARKET_ASOF,
          note: MARKET_NOTE,
        },
        disclaimer: DISCLAIMER,
      },
      { headers: { "Cache-Control": `public, max-age=${CACHE_TTL}` } },
    );
    if (cache && cacheKey) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (err) {
    if (err instanceof RequestyError) {
      const status = err.code === "no_api_key" ? 503 : 502;
      console.error("[commodity] requesty error", err.code, err.message);
      return Response.json({ error: "upstream", code: err.code }, { status });
    }
    console.error("[commodity] unexpected", String(err));
    return Response.json({ error: "server" }, { status: 500 });
  }
}
