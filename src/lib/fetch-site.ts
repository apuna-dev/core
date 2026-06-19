// Fetch a company's public website and reduce it to plain text for the extraction pass.
// SSRF posture: the Worker runs with `global_fetch_strictly_public` (wrangler.jsonc), so
// fetch already refuses private/internal addresses. We add http(s)-only + size + timeout
// caps on top. The returned text is UNTRUSTED — callers fence it as data, never instructions.

const MAX_CHARS = 40_000;
const TIMEOUT_MS = 12_000;

export type SiteFetch =
  | { ok: true; title: string; text: string; finalUrl: string }
  | { ok: false; error: "invalid_url" | "fetch_failed" | "empty" | "not_html" };

export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Reject obvious non-public hosts defensively (belt-and-braces with the platform flag).
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      !host.includes(".")
    ) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(titleMatch?.[1] ?? "").trim().slice(0, 200);

  const text = html
    // drop non-content elements wholesale
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // block elements → newlines so the LLM sees structure
    .replace(/<\/(p|div|li|h[1-6]|section|article|header|footer|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return { title, text: collapse(decodeEntities(text)) };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

function collapse(s: string): string {
  return s
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim()
    .slice(0, MAX_CHARS);
}

export async function fetchSiteText(url: string): Promise<SiteFetch> {
  const normalized = normalizeUrl(url);
  if (!normalized) return { ok: false, error: "invalid_url" };

  let res: Response;
  try {
    res = await fetch(normalized, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // A real UA + HTML accept; many sites 403 a bare fetch.
        "User-Agent":
          "Mozilla/5.0 (compatible; ApunaCommodityIntel/1.0; +https://apuna.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return { ok: false, error: "fetch_failed" };
  }

  if (!res.ok) return { ok: false, error: "fetch_failed" };
  const ctype = res.headers.get("content-type") ?? "";
  if (!ctype.includes("html") && !ctype.includes("text")) {
    return { ok: false, error: "not_html" };
  }

  const html = (await res.text().catch(() => "")).slice(0, 600_000);
  const { title, text } = htmlToText(html);
  if (text.length < 60) return { ok: false, error: "empty" };

  return { ok: true, title, text, finalUrl: res.url || normalized };
}
