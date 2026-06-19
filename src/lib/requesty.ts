// Requesty LLM router — OpenAI-compatible gateway (https://router.requesty.ai/v1).
// We use the models Requesty provides free of charge; the key is a Worker secret
// (REQUESTY_API_KEY), read from the Cloudflare env and passed in by the route handler.
// All calls are plain fetch (no SDK) so nothing extra has to bundle on the Worker.

const REQUESTY_BASE = "https://router.requesty.ai/v1";

export type RequestyEnv = { REQUESTY_API_KEY?: string };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// The free models, routed by job. Reasoning carries the extraction; nano distils long
// page text to fit context; content-safety screens untrusted pasted input; the rest are
// documented fallbacks / held for later (omni = multimodal, laguna = code/dashboard-as-code).
export const MODELS = {
  safety: "nvidia/nemotron-3.5-content-safety",
  distill: "nvidia/nemotron-3-nano-30b-a3b",
  reason: "nvidia/nemotron-3-super-120b-a12b",
  reasonHeavy: "nvidia/nemotron-3-ultra-550b-a55b",
  general: "google/gemma-4-31b-it",
} as const;

export const FREE_MODELS = [
  "google/gemma-4-31b-it",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3.5-content-safety",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3-nano-30b-a3b",
  "nvidia/nemotron-3-super-120b-a12b",
  "poolside/laguna-xs.2",
  "poolside/laguna-m.1",
] as const;

export class RequestyError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RequestyError";
  }
}

type ChatOpts = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Per-call wall-clock budget; the free models vary a lot in latency. */
  timeoutMs?: number;
  /** Retried once with this model when the primary is unavailable (403/404 — a provider not
   *  allowed in Requesty's "Approved Models" policy) OR fails transiently (timeout / network /
   *  5xx). The reasoning model can exceed its budget on a large page; degrading to a lighter
   *  model returns an answer instead of a hard error. */
  fallback?: string;
  /** Bounded timeout for the fallback attempt, so a slow primary + fallback can't stack two
   *  long waits. Default 45s. */
  fallbackTimeoutMs?: number;
};

export function hasRequesty(env: RequestyEnv): boolean {
  return Boolean(env.REQUESTY_API_KEY);
}

// A single completion against one model. Throws RequestyError on a non-2xx response.
async function chatOnce(
  env: RequestyEnv,
  model: string,
  opts: ChatOpts,
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
  };
  // OpenAI-compatible JSON mode; harmless on models that ignore it (we also parse defensively).
  if (opts.json) body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(`${REQUESTY_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.REQUESTY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
    });
  } catch (err) {
    throw new RequestyError("network", String(err));
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new RequestyError(`http_${res.status}`, detail.slice(0, 500));
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// One chat completion, with an optional one-shot fallback to another model when the primary is
// unavailable (403/404) or fails transiently (timeout / network / 5xx). The fallback runs on a
// bounded timeout. Throws RequestyError on a missing key or a terminal failure.
export async function requestyChat(
  env: RequestyEnv,
  opts: ChatOpts,
): Promise<string> {
  if (!env.REQUESTY_API_KEY) {
    throw new RequestyError("no_api_key", "REQUESTY_API_KEY is not set");
  }
  try {
    return await chatOnce(env, opts.model, opts);
  } catch (err) {
    // Degrade to the lighter model on either unavailability (403/404) or a transient failure
    // (timeout / network / 5xx). The reasoning model occasionally overruns its budget on a large
    // page; a bounded fallback returns an answer instead of surfacing a 502.
    const recoverable =
      err instanceof RequestyError &&
      (err.code === "http_403" ||
        err.code === "http_404" ||
        err.code === "network" ||
        err.code.startsWith("http_5"));
    if (recoverable && opts.fallback && opts.fallback !== opts.model) {
      return await chatOnce(env, opts.fallback, {
        ...opts,
        timeoutMs: opts.fallbackTimeoutMs ?? 45_000,
      });
    }
    throw err;
  }
}

// Chat that must return JSON. Parses the first balanced {...} (models often wrap JSON in
// prose or fences); returns null if nothing parseable came back.
export async function requestyJSON<T = unknown>(
  env: RequestyEnv,
  opts: ChatOpts,
): Promise<T | null> {
  const text = await requestyChat(env, { ...opts, json: true });
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
