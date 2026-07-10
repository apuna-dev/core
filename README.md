# apuna/core

An open AI crew pattern. Fork it. Cast your own personas. Run.

The pattern is the give-away. The personas are yours to choose.

```
╔══════════════════════════════════════════════════════════════════╗
║                        CHAIRWOMAN                                ║
║              governance · continuity · long view                 ║
║         reigns but does not rule — presides over all             ║
╚══════════════╤═══════════════════════════════════════════════════╝
               │ convenes / arbitrates
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                           CEO                                    │
│              portfolio priorities · what matters                 │
│                    ranks backlog, does not dispatch              │
└───────────────────────────────┬──────────────────────────────────┘
                                │ ranked backlog
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                          LEADER                                  │
│        sole dispatcher · decomposes · sequences · decides        │
│    ┌───────────┬──────────────┬──────────────┬───────────────┐   │
│    │  ARTIST   │  DESIGNER    │  SCIENTIST   │   ENGINEER    │   │
│    │   copy    │  components  │  evaluation  │  code · bash  │   │
│    └───────────┴──────────────┴──────────────┴──────┬────────┘   │
│                                                     │            │
│                                               ┌─────┴──────┐    │
│                                               │  CODERS    │    │
│                                               │  (padawan) │    │
│                                               └────────────┘    │
└──────────────────────────────────────────────────────────────────┘

ADVISORS  (consulted on demand · read-only · return findings)
  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐
  │     CFO       │  │ GDPR ADVISOR  │  │ GOVERNANCE          │
  │  capital ·    │  │  data-prot ·  │  │ AMBASSADOR          │
  │  runway ·     │  │  DPIA ·       │  │  external voice ·   │
  │  pricing      │  │  subprocessor │  │  sovereignty claims │
  └───────────────┘  └───────────────┘  └─────────────────────┘

PROCESS KERNEL  (always active · enforces · does not dispatch)
  ┌───────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
  │ PROCESS+PERMISSION│  │  SCRUM MASTER   │  │  DELIVERY MONITOR   │
  │ KERNEL            │  │  ceremonies ·   │  │  HOLDs · health     │
  │ role-boundary ·   │  │  cadence ·      │  │  signal · risk      │
  │ flag tiers        │  │  impediments    │  │  (can block sprints)│
  └────────┬──────────┘  └────────┬────────┘  └──────────┬──────────┘
           │ flags                │ routes                │ HOLDs
           └──────────────────────┴───────────────────────┘
                                  │
                        if CRITICAL or 2× HOLD
                                  ▼
                          ┌───────────────┐
                          │    FOUNDER    │
                          │  (the gate)   │
                          │ merges · ships│
                          │ always decides│
                          └───────────────┘

CHECKS & BALANCES
  CEO ranks        ──► Leader cannot skip priorities
  Leader dispatches ──► Orchestrator cannot dispatch specialists directly
  Engineer holds Bash ──► No other agent touches code or shell
  Kernel flags     ──► Advisory · Op-Violation (10min queue) · Auth-Expansion (founder only)
  SR HOLD          ──► Leader can override once; 2× consecutive = mandatory founder HITL
  Chain attack     ──► SR HOLD + Kernel CRITICAL both disposed = mandatory founder HITL
  Chairwoman       ──► Convenes but does not rule; precedent beats opinion

CONFLICT RESOLUTION
  Two agents disagree      ──► Leader decides
  Leader vs any agent      ──► Founder decides
  Deploy / send / delete   ──► Founder decides (always)
  Governance change        ──► Adversarial gate (pre-PR) + founder merge
```

---

## What this is

Ten agent codices for Claude Code — one per role in a self-organising AI crew. Drop them into any project. Cast your own personas or use the shipped examples. The crew has clear roles, a strict dispatch discipline, and one rule above all others: **a human always decides.**

The ten roles cover every concern a software team faces: governance (Chairwoman), priorities (CEO), sequencing (Leader), words (Artist), form (Designer), measurement (Scientist), infrastructure (Engineer), and three advisors (CFO, GDPR, Governance Ambassador). A process-kernel layer (Kernel, Scrum Master, Delivery Monitor) keeps them coordinated.

---

## The 10 agents

### Governance

| Role | Codex | DISC | What they own | When to invoke |
|------|-------|------|---------------|----------------|
| **Chairwoman** | `chairwoman.md` | High S/C | Institutional memory; retrospectives; standards stewardship | Governance dispute; retro; "will this still be us a year from now?" |

### Core team

| Role | Codex | DISC | What they own | When to invoke |
|------|-------|------|---------------|----------------|
| **CEO** | `ceo.md` | Low D / High I/C | Portfolio priorities — which problems, in what order | Backlog full; workstreams compete; an assumption needs challenging |
| **Leader** | `leader.md` | High D | Dispatch (sole); backlog; sequencing | Decompose a priority into tasks; work spans multiple specialists |
| **Artist** | `artist.md` | High I | All copy and persona voice | Any agent persona, copy, narrative, or microcopy |
| **Designer** | `designer.md` | High S | Visual and component layer; design system | Any visual element, layout, or accessibility concern |
| **Scientist** | `scientist.md` | High C | Evaluation rubrics; LLM prompts; model tier assignment | Scoring rubrics, feedback quality, challenging a shipped claim |
| **Engineer** | `engineer.md` | High C/D | Backend, infra, build, deploy; all Bash | Any server-side code, infra change, or shell command |

### Advisors

| Role | Codex | DISC | What they own | When to invoke |
|------|-------|------|---------------|----------------|
| **CFO** | `cfo.md` | High D/C | Capital allocation; runway; pricing economics | "Can we afford this?"; pricing model review; cost structure |
| **GDPR Advisor** | `gdpr-advisor.md` | High C/D | Data protection audit; DPIA; subprocessor review | Any new data flow, subprocessor, or feature touching personal data |
| **Governance Ambassador** | `governance-ambassador.md` | High C/D | External governance articulation; sovereignty claims | Explaining the operating model publicly; stress-testing governance claims |

### Process kernel *(infrastructure — always active)*

| Role | Codex | What they own |
|------|-------|---------------|
| **Process+Permission Kernel** | `weber.md` | Role-boundary enforcement; flag tiers; cadence |
| **Scrum Master** | `ad.md` | Sprint ceremonies; impediment routing |
| **Delivery Health Monitor** | `sr.md` | Sprint HOLDs; delivery health signal |

---

## The hierarchy

```
Chairwoman              ← governance / institutional memory
│
├─ CEO                  ← portfolio priorities
│
├─ Leader               ← sole dispatcher
│    ├─ Artist
│    ├─ Designer
│    ├─ Scientist
│    └─ Engineer
│
├─ CFO                  ← capital (advisory)
├─ GDPR Advisor         ← data protection (advisory)
└─ Governance Ambassador ← public governance (advisory)

Process kernel (always active, not in the dispatch chain):
  Process+Permission Kernel · Scrum Master · Delivery Health Monitor
```

The Chairwoman presides but does not dispatch. The CEO sets priorities. The Leader is the sole dispatcher — the only agent that invokes a specialist. The Engineer is the only agent that touches code and Bash. Advisors are consulted on demand; they read, audit, and return findings — they do not build.

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

The ten roles are the load-bearing structure. Padawans (Haiku-tier sub-agents dispatched by core agents for mechanical sub-tasks) extend the crew without adding hierarchy. See [docs/EXTENDING.md](docs/EXTENDING.md) for how to add roles without breaking the dispatch chain.

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
