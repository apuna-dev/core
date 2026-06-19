import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// This site is pure SSG — every route is prerendered, with no ISR / `revalidate`
// / `use cache` anywhere. We serve prerendered pages straight from the READ-ONLY
// static-assets incremental cache: it is keyed by build id
// (`cdn-cgi/_next_cache/<buildId>/<key>.cache`) and self-populates at deploy time
// (opennextjs-cloudflare copies .open-next/cache → assets/cdn-cgi/_next_cache), so
// it is replaced on every release and is always current. A request becomes an
// in-colo asset read instead of a re-render.
//
// We deliberately DO NOT wrap it in `withRegionalCache`. That wrapper stores the
// rendered page in a per-colo Cloudflare Cache API entry with a long-lived TTL
// (~30 min) that is NOT purged on deploy. Sitting in front of the build-id-keyed
// store, it can keep serving the previous release's HTML after a new deploy — the
// "new deploy, old page" symptom, which a browser cache-clear or private tab does
// NOT bypass (it is server-side, local to each data centre). For a no-ISR /
// no-tag-revalidation site the regional layer adds latency value only — its own
// docs note it "does not directly improve performance much" — so correctness wins.
//
// Only if ISR / `revalidate` / `use cache` is ever introduced should this switch to
// the R2 incremental cache (NEXT_INC_CACHE_R2_BUCKET) + WORKER_SELF_REFERENCE
// binding, ideally with deploy-time cache purge enabled.
// See https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
