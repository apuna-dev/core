# apuna/core

An open 6-agent AI crew pattern. Fork it. Cast your own personas in the six roles. Run.

The pattern is the give-away. The personas are yours to choose.

---

## What this is

A set of six agent codices for Claude Code — one per role in a small, self-organising AI crew. Drop them into any project. The crew has clear roles, a strict dispatch discipline, and one rule above all others: **a human always decides.**

The six archetypes cover every concern a software team faces: what to build (CEO), in what sequence (Leader), with what words (Artist), in what form (Designer), measured how (Scientist), and running on what (Engineer). They are not a framework. They are a pattern — small enough to hold in your head, load-bearing enough to ship production software.

---

## The 6 agents

| Role | Archetype | DISC | What they own | When to invoke |
|------|-----------|------|---------------|----------------|
| **CEO** | Albert Einstein | Low D / High I/C | Portfolio priorities — which problems, in what order | Backlog feels full; two workstreams compete; an assumption has been running the roadmap unchallenged |
| **Leader** | Steve Jobs | High D | Dispatch — sole agent that invokes specialists; backlog; sequencing | A priority needs decomposing into executable tasks; work spans multiple specialists |
| **Artist** | David Ogilvy | High I | All copy and persona voice | Writing or refining any agent persona, website copy, narrative, or microcopy |
| **Designer** | Dieter Rams | High S | Visual and component layer; design system | Building or updating any visual element, layout, or accessibility concern |
| **Scientist** | Richard Feynman | High C | Evaluation rubrics; LLM prompts; model tier assignment | Improving feedback quality, designing scoring rubrics, or challenging a shipped claim |
| **Engineer** | Linus Torvalds | High C/D | Backend, infrastructure, build, deploy; all Bash | Any server-side code, infrastructure change, or shell command |

---

## The hierarchy

```
CEO
 └─ Leader           <- sole dispatcher
      ├─ Artist
      ├─ Designer
      ├─ Scientist
      └─ Engineer
```

The CEO sets the agenda. The Leader is the sole dispatcher — the only agent that invokes another specialist. The Engineer is the only agent that touches code and Bash. The CEO, Artist, Designer, and Scientist do not invoke each other.

---

## Core principles

These are load-bearing. Skip one and the crew stops working.

**1. A human always decides.**
Deploy, send, delete, public changes, credentials, irreversible actions — none of these happen without explicit human sign-off. No agent self-greenlight. The crew reduces the surface area of decisions that need the human's attention; it does not eliminate human authority.

**2. Only the Leader dispatches specialists.**
The CEO prioritises; the Leader decides which specialist owns which piece. No other agent in the crew invokes another specialist. This boundary is structural: it makes dispatch auditable and prevents runaway agent chains.

**3. Only the Engineer touches Bash and the codebase.**
The Artist, Designer, and Scientist produce specifications, copy, and rubrics. They hand them to the Engineer to implement. The Engineer runs every shell command. Nothing executes without passing through Engineering.

**4. Capture before executing.**
Every idea, bug, or feature request is written to the backlog before any agent begins work on it. This is not a workflow preference — it is the structural interface between the human and the crew.

**5. Atomic PRs.**
Every bug fix and every feature request ships as its own atomic PR — one focused, self-contained, independently reviewable and revertable change. No batching unrelated fixes into one commit.

---

## Getting started

**Prerequisites:** Claude Code installed. The crew is designed around Claude's agent codex format and the `/agent` slash-command pattern.

**Step 1 — Copy the agents into your project**

```bash
cp -r .claude/agents/ your-project/.claude/agents/
```

**Step 2 — Customise the scope block**

Each codex opens with an Operating Scope block:

```
> **Operating Scope**
>
> You are part of a 6-agent AI crew. Your role is described below. Adapt the stack, domain, and product focus to your specific deployment. **A human always decides.**
```

Replace the generic text with your project's specifics:

```
> **<YOUR-PROJECT> — Operating Scope**
>
> You are part of the **<YOUR-TEAM-NAME>** crew. Your assignment is this repository: **<one-line description>**.
>
> **Stack:** <your framework · language · styling · deploy target>
>
> **Keep** your craft, voice, DISC posture, and experience exactly as written below. **A human always decides.**
```

**Step 3 — Invoke agents via Claude Code**

Invoke agents using the slash-command names that match the codex `name:` field. By default these ship as: `/ceo`, `/leader`, `/artist`, `/designer`, `/scientist`, `/engineer`.

**Step 4 — Adapt the personas (optional)**

The archetypes ship with historical personas (Einstein, Jobs, Ogilvy, Rams, Feynman, Torvalds). You can re-cast any role with a different persona — see [docs/EXTENDING.md](docs/EXTENDING.md) for how.

---

## Extending the crew

The six archetypes are the load-bearing structure. Anything beyond them — padawans, domain specialists, advisors — is built on top. See [docs/EXTENDING.md](docs/EXTENDING.md) for how to add roles without breaking the hierarchy.

---

## The HITL principle

HITL — human in the loop — is not a feature. It is the architecture.

The crew is designed to handle everything it can decide with confidence, and to surface everything it can't as a structured decision packet: context, recommendation, stakes, approve or reject. The human's job is to answer the packet, not to supervise every step.

The signal of a healthy crew: the human gets fewer and fewer packets over time — not because the crew is hiding things, but because its confidence thresholds are well-calibrated and the cases it surfaces are genuinely worth the human's attention.

What always requires human sign-off, regardless of confidence:
- Deploying to production
- Sending communications on behalf of the team or product
- Deleting data, branches, or resources
- Public-facing changes to live content
- Any action involving credentials or secrets
- Decisions that change the product's values or positioning

See [docs/HITL-GUIDE.md](docs/HITL-GUIDE.md) for the full guide.

---

## License

Apache 2.0. Use it. Adapt it. Tell us what you built with it.
