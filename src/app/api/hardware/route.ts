import { getCloudflareContext } from "@opennextjs/cloudflare";
import { normalizeUrl } from "@/lib/fetch-site";
import {
  HARDWARE_DISCLAIMER_EN,
  extractBringup,
  screenContent,
} from "@/lib/hardware";
import { RequestyError, hasRequesty, type RequestyEnv } from "@/lib/requesty";

// Hardware Bring-Up endpoint. POST { component, docUrl? } → fetch docs → safety-screen
// → extract grounded how-to with Class A validator → return structured result.
//
// Cached 24h by component name (normalised). A bring-up for "MFRC522" is stable for a day
// and the LLM pass is slow. Same cache pattern as /api/commodity.

type Ctx = { waitUntil: (p: Promise<unknown>) => void };

const MAX_COMPONENT = 200;
const MAX_URL = 500;
// Text extracted client-side from a dropped PDF (≤30 MB). We cap the text we
// accept so a huge datasheet can't blow the request or the model context; the
// distill pass downstream handles anything still long.
const MAX_DOC_TEXT = 120_000;
const CACHE_TTL = 60 * 60 * 24; // 24 h

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type EdgeCache = {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
};
function edgeCache(): EdgeCache | null {
  const c = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return c?.default ?? null;
}
function cacheKeyFor(component: string, docUrl: string): Request {
  return new Request(
    `https://hardware-cache.apuna.dev/v1?c=${encodeURIComponent(component)}&u=${encodeURIComponent(docUrl)}`,
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  const component = str(body.component);
  if (!component || component.length > MAX_COMPONENT) {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  // docUrl is optional — may be null/undefined/empty.
  const rawDocUrl = str(body.docUrl);
  const docUrl =
    rawDocUrl && rawDocUrl.length <= MAX_URL ? rawDocUrl : null;

  // Validate docUrl if supplied (SSRF-safe: normalizeUrl already rejects private ranges).
  if (docUrl && !normalizeUrl(docUrl)) {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  // docText is optional — text extracted client-side from a dropped PDF datasheet.
  const rawDocText = str(body.docText);
  const docText = rawDocText ? rawDocText.slice(0, MAX_DOC_TEXT) : null;

  const { env, ctx } = getCloudflareContext() as unknown as {
    env: RequestyEnv;
    ctx: Ctx;
  };
  if (!hasRequesty(env)) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  // Serve cached result if available. A dropped PDF is user-specific content, so
  // those runs bypass the shared edge cache entirely (both read and write).
  const cache = docText ? null : edgeCache();
  const normComponent = component.toLowerCase().replace(/\s+/g, "_").slice(0, 100);
  const cacheKey = cacheKeyFor(normComponent, docUrl ?? "");
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  // Safety-screen the untrusted component name (best-effort gate).
  const screen = await screenContent(env, component + (docUrl ? " " + docUrl : ""));
  if (!screen.safe) {
    return Response.json(
      { error: "unsafe_content", reason: screen.reason ?? "flagged" },
      { status: 422 },
    );
  }

  try {
      const outcome = await extractBringup(env, component, docUrl, docText);

    if (!outcome.ok && "clarification" in outcome) {
      // Clarification needed — not an error, but the UI must prompt the user.
      return Response.json({ ok: false, clarification: outcome.clarification }, { status: 200 });
    }

    if (!outcome.ok && "insufficient_docs" in outcome) {
      return Response.json(
        { error: "insufficient_docs", reason: (outcome as { reason?: string }).reason ?? "" },
        { status: 502 },
      );
    }

    if (!outcome.ok) {
      return Response.json({ error: "extraction_failed" }, { status: 502 });
    }

    const res = Response.json(
      {
        ok: true,
        result: outcome.result,
        disclaimer: HARDWARE_DISCLAIMER_EN,
      },
      { headers: { "Cache-Control": `public, max-age=${CACHE_TTL}` } },
    );
    if (cache) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (err) {
    if (err instanceof RequestyError) {
      const status = err.code === "no_api_key" ? 503 : 502;
      console.error("[hardware] requesty error", err.code, err.message);
      return Response.json({ error: "upstream", code: err.code }, { status });
    }
    console.error("[hardware] unexpected", String(err));
    return Response.json({ error: "server" }, { status: 500 });
  }
}
