// A small, best-effort "bots stopped" counter. Incremented whenever a public form
// submission is rejected as automated (honeypot hit or failed Turnstile), and
// surfaced read-only at /api/bots-blocked for the transparency widget in the
// Contact section.
//
// Storage: a single KV key in the existing APPLICATIONS namespace. This is a vanity
// metric — KV has no atomic increment, so the read-modify-write below can lose a
// concurrent bump. That occasional undercount is acceptable; we never over-count.
//
// IMPORTANT: increment SYNCHRONOUSLY (await before responding), NOT via
// ctx.waitUntil. Under @opennextjs/cloudflare, KV writes deferred to waitUntil do
// not reliably commit (the apply route persists synchronously for the same reason).

export type BotCounterEnv = { APPLICATIONS?: KVNamespace };

const KEY = "metrics:bots-blocked";

export async function incrementBotsBlocked(env: BotCounterEnv): Promise<void> {
  if (!env.APPLICATIONS) return;
  try {
    const current = Number((await env.APPLICATIONS.get(KEY)) ?? "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    await env.APPLICATIONS.put(KEY, String(next));
  } catch (err) {
    console.error("[bot-counter] increment failed", String(err));
  }
}

export async function getBotsBlocked(env: BotCounterEnv): Promise<number> {
  if (!env.APPLICATIONS) return 0;
  try {
    const n = Number((await env.APPLICATIONS.get(KEY)) ?? "0");
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

// ---- legitimate-submission counter ----------------------------------------
//
// Incremented once per accepted contact/apply submission — ONLY in the genuine
// success path, AFTER honeypot + Turnstile pass. Never inside the honeypot
// feign-success branch (that would count bots as humans). Powers the bot/human
// share tile on /stats. Same KV namespace, different key. Same concurrency
// caveat as bots-blocked: occasional undercount on concurrent submits is fine;
// we never over-count.
//
// IMPORTANT: increment SYNCHRONOUSLY (await before responding), NOT via
// ctx.waitUntil. Under @opennextjs/cloudflare, KV writes deferred to waitUntil
// do not reliably commit.

const LEGIT_KEY = "metrics:legit-submissions";

export async function incrementLegitSubmissions(
  env: BotCounterEnv,
): Promise<void> {
  if (!env.APPLICATIONS) return;
  try {
    const current = Number((await env.APPLICATIONS.get(LEGIT_KEY)) ?? "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    await env.APPLICATIONS.put(LEGIT_KEY, String(next));
  } catch (err) {
    console.error("[legit-counter] increment failed", String(err));
  }
}

export async function getLegitSubmissions(env: BotCounterEnv): Promise<number> {
  if (!env.APPLICATIONS) return 0;
  try {
    const n = Number((await env.APPLICATIONS.get(LEGIT_KEY)) ?? "0");
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
