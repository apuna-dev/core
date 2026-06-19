# apuna/core

**A free OpenAPI bus + an open agent crew for [Claude Code](https://claude.com/claude-code).** One
self-hostable Cloudflare Worker that serves key-less APIs behind a single OpenAPI 3.1 spec — and the
small AI crew that builds and operates it, droppable into your own project. A **human always decides**.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Built for Claude Code](https://img.shields.io/badge/built%20for-Claude%20Code-d97757)](https://claude.com/claude-code)
[![AI disclosed, never disguised](https://img.shields.io/badge/AI-disclosed%2C%20never%20disguised-444)](docs/CONSTITUTION.md)

> *As little as possible, as much as needed.* The AI augments the team; a **human always decides**.

This repo is **two things at once**:

1. **The OpenAPI bus** — a runnable, self-hostable Worker exposing free, key-less endpoints (weather,
   stats, transparency, plant care, commodity & hardware intelligence) through one self-describing
   OpenAPI 3.1 surface. Live at [`apuna.dev/core`](https://apuna.dev/core).
2. **The agent crew** — the generic core-5 (Leader · Artist · Designer · Scientist · Engineer) that
   designs, builds, reviews, and operates it. Lift it into your own Claude Code project.

---

## The OpenAPI bus

A unified OpenAPI 3.1 surface over free, key-less endpoints. One envelope for everything:
`{ ok, service, data | error, meta }`. The gateway calls each route handler **in-process** (no
self-subrequest), so the spec can't drift from the real endpoints.

| Service | Method | Tier | Upstream |
|---|---|---|---|
| `weather` | GET `?lat&lon` | data · 60/min | Open-Meteo |
| `stats` | GET | data · 60/min | internal |
| `bots-blocked` | GET | data · 60/min | internal |
| `transparency` | GET | data · 60/min | internal |
| `plants` | GET | data · 60/min | internal (read-only) |
| `commodity` | POST `{url}` | compute · 10/min | internal (Requesty) |
| `hardware` | POST `{component,docUrl?}` | compute · 10/min | internal (Requesty) |

- **Catalog:** `/core` · **Spec:** `/core/openapi.json` (generated from the registry) · **Endpoints:** `/core/v1/<service>`
- Public read, open CORS, per-IP rate limiting (`X-RateLimit-*` headers). `data` endpoints 60/min, cost-bearing `compute` endpoints 10/min.
- Full reference + how to add a service: [`docs/core-bus.md`](docs/core-bus.md).

### Run it

```bash
npm install
npm run dev        # local dev
npm run deploy     # opennextjs-cloudflare build && wrangler deploy
```

The `commodity` and `hardware` services need a free [Requesty](https://requesty.ai) key (and optionally
an [EIA](https://www.eia.gov/opendata/) key) — copy `.dev.vars.example` to `.dev.vars` and fill them.
Everything else runs key-less. The rate limiter uses an optional `CORE_RL` KV namespace (see
`wrangler.jsonc`); without it, it falls back to an in-isolate counter.

---

## The agent crew

The crew lives in [`.claude/agents/`](.claude/agents/) (one codex per role) and is invoked through the
slash-command skills in [`.claude/skills/`](.claude/skills/). The **core 5**:

- **Leader** — product calls, breaking work down, dispatching the crew
- **Artist** — copy, brand voice, microcopy
- **Designer** — UI, layout, accessibility ("less, but better")
- **Scientist** — evaluation, scoring rubrics, measurement
- **Engineer** — build, infrastructure, deploy (+ **Coder**, its parallel build force)

The rules they're held to live in [`CLAUDE.md`](CLAUDE.md); the method in
[`docs/AGENT-METHODOLOGY.md`](docs/AGENT-METHODOLOGY.md); the principles in
[`docs/CONSTITUTION.md`](docs/CONSTITUTION.md).

### Lift the crew into your project

No build step, no dependency — the crew is just Markdown codices and slash-command skills.

1. **Copy** [`.claude/agents/`](.claude/agents/) and [`.claude/skills/`](.claude/skills/) into your project.
2. **Add** a `CLAUDE.md` with the rules ([this repo's is a starter](CLAUDE.md)).
3. **Summon** a role: `/torvalds` (Engineer), `/jobs` (Leader), `/rams` (Designer), `/ogilvy` (Artist), `/feynman` (Scientist).

### Cast your own crew

The crew is defined by its **roles, not by who plays them.** This repo ships one example cast —
historical figures (Steve Jobs, David Ogilvy, Dieter Rams, Richard Feynman, Linus Torvalds), **openly
disclosed as AI, never presented as the real people**. That cast is just a default; recast any role
with your own figure.

#### Re-cast a role

Paste this to your LLM:

```
I'm recasting the "<ROLE>" in an AI agent crew. Its remit:
<paste the role's remit paragraph from .claude/agents/<role>.md>

Suggest 3 real or fictional figures whose *documented way of working* fits
this remit — chosen by method, not fame. For your top pick, rewrite the codex
in the same structure (identity · background · how they work · what they refuse
to do · boundaries), in their voice.

Hard rule: the agent is openly an AI modeled on that figure — never presented
as the real person, never claiming to be them.
```

Then save it over `.claude/agents/<role>.md` and rename the matching skill in `.claude/skills/`.

---

## License

Apache-2.0 — see [`LICENSE`](LICENSE). No proprietary cage: you can read, audit, and keep every line.
