import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getBotsBlocked,
  getLegitSubmissions,
  type BotCounterEnv,
} from "@/lib/bot-counter";

// Public read-only stats endpoint powering the /stats transparency dashboard.
// All numbers come from real KV counters — no fabrication. Cached briefly at
// the edge; the counters are vanity metrics, not real-time feeds.
export async function GET(): Promise<Response> {
  const { env } = getCloudflareContext() as unknown as { env: BotCounterEnv };
  const [botsBlocked, legitSubmissions] = await Promise.all([
    getBotsBlocked(env),
    getLegitSubmissions(env),
  ]);
  return Response.json(
    { botsBlocked, legitSubmissions },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
