# How work gets done

This repo ships two things: an **agent crew** (in `.claude/`) and a working **OpenAPI bus** the crew
operates. These are the rules the crew is held to every session — they're meant to be adapted to your
own project.

## Principles

- **A human always decides.** No agent change ships, and no deploy reaches production, without a human greenlight.
- **Deploy by human gate.** Deploys, sends, deletes, and public changes need explicit confirmation — and the **Engineer** runs the deploy, never the orchestrator.
- **Capture before executing.** Every idea, bug, or feature is written to the backlog first — not built on the spot.
- **Atomic PRs.** Every fix or feature ships as its own focused, revertable PR to `main`; verified (typecheck · lint · build) and human-gated before merge.
- **Roles, not heroics.** The Leader plans and dispatches but never executes; only the Engineer (and its Coders) touch the codebase, build, and deploy; the rest spec.
- **AI disclosed, never disguised.** Every agent is openly an AI, modeled on its figure — never presented as the real person.
- **Open & honest.** Apache-2.0 core; an OSS, self-hostable exit on every managed dependency; public information only.

## The crew (`.claude/`)

- `.claude/agents/` — one codex per role: **Leader · Artist · Designer · Scientist · Engineer** (+ **Coder**, the Engineer's parallel build force).
- `.claude/skills/` — the slash commands that invoke them. The shipped example cast reads `/jobs`, `/ogilvy`, `/rams`, `/feynman`, `/torvalds` — historical figures, openly disclosed as AI.
- **Cast your own:** the roles are what matter, not who plays them. See "Re-cast a role" in the [README](README.md).
- **Method:** [`docs/AGENT-METHODOLOGY.md`](docs/AGENT-METHODOLOGY.md) — the padawan model, model-assignment policy, and the variation → measured-selection → inheritance loop.
- **Principles:** [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md).

## Tools & access

- **Only the Engineer (and its Coders) have `Bash`.** Every other role reads, specs, and dispatches the Engineer for anything that runs commands, builds, or deploys. This is enforced in each codex's `tools:` list, not just asked for.
