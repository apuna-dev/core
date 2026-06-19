import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBotsBlocked, type BotCounterEnv } from "@/lib/bot-counter";

// Read-only tally of automated submissions blocked at the form layer (honeypot +
// Turnstile). Powers the transparency widget in the Contact section. Cached briefly
// at the edge — the number is a vanity metric, not something that needs to be live.
export async function GET(): Promise<Response> {
  const { env } = getCloudflareContext() as unknown as { env: BotCounterEnv };
  const count = await getBotsBlocked(env);
  return Response.json(
    { count },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
