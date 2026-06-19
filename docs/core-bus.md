# `apuna.dev/core` — the free API bus

A unified, self-describing OpenAPI 3.1 surface over Apuna's free, key-less endpoints, plus a thin
Open-Meteo weather proxy. One envelope for everything: `{ ok, service, data | error, meta }`.

- **Docs / catalog:** `https://apuna.dev/core`
- **Spec:** `https://apuna.dev/core/openapi.json` (generated from the registry — can't drift)
- **Endpoints:** `https://apuna.dev/core/v1/<service>`

## Services (v0.1.0)

| Service | Method | Tier | Upstream |
|---|---|---|---|
| `weather` | GET `?lat&lon` | data · 60/min | Open-Meteo |
| `stats` | GET | data · 60/min | internal |
| `bots-blocked` | GET | data · 60/min | internal |
| `transparency` | GET | data · 60/min | internal |
| `plants` | GET | data · 60/min | internal (read-only) |
| `commodity` | POST `{url}` | compute · 10/min | internal (Requesty) |
| `hardware` | POST `{component,docUrl?}` | compute · 10/min | internal (Requesty) |

The gateway calls the existing route handlers **in-process** (no self-subrequest), so the bus stays
in lock-step with the real endpoints — same logic, same Cloudflare context, no extra network hop.

## Access & rate limiting

Public read, open CORS. A best-effort fixed-window (60s) per-IP limiter gates each service —
**10 req/min** on cost-bearing (`compute`) endpoints, **60 req/min** on `data` endpoints. Responses
carry `X-RateLimit-{Limit,Remaining,Reset}`.

The limiter uses a `CORE_RL` KV namespace when bound, else falls back to an in-isolate counter (works
in dev / on a warm isolate, but not across isolates). To make it durable:

```
npx wrangler kv namespace create CORE_RL
```

then add the binding to `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "CORE_RL", "id": "<paste-id>" }
]
```

For hard guarantees at scale, swap to Cloudflare's native [Rate Limiting binding] and read the
verdict in `rateLimit()` — the registry tiers already encode the limits.

[Rate Limiting binding]: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Adding a service

Append one entry to `CORE_SERVICES` in `src/lib/core-bus.ts` (id, method, summary, description,
`cost`, params/requestExample, upstream). Then:

- **Internal endpoint:** add `id → handler` to the `INTERNAL` map in
  `src/app/core/v1/[...path]/route.ts` (import its `GET`/`POST`).
- **External free API:** handle it like `weather` (fetch + wrap in the envelope).

The OpenAPI doc and the `/core` catalog page pick it up automatically.
