# Agent architecture

## Stack note

If your project uses a framework with breaking changes from LLM training data, add a note here. Example:

> This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing any code.

---

## 4D model

Every agent occupies a position in four dimensions:

| Axis | Values | Notes |
|---|---|---|
| **Layer** | Interface · Core · Padawan | Dispatch authority decreases down |
| **Tier** | Opus · Sonnet · Haiku | Model cost tier |
| **Authority** | Founder · Leader · Core · None | Who may dispatch this agent |
| **State** | `idle` · `active` · `saturated` · `deadlocked` | Observable from queue depth + novelty signal |

`deadlocked` = escalate to founder. The deadlock-breakout move is called the **Fifth Hammer**: when two workstreams are deadlocked and no internal resolution path exists, it surfaces the conflict to the founder. It is both a move (an escalation action) and a standing role (whoever holds it at a given moment). Document your crew's Fifth Hammer holder in your `CLAUDE.md`.

**Skill → agent mapping (3-layer):** Skills = interface layer (founder invokes via `/skill`). Core agents (Leader, Engineer, Designer, Artist, Scientist, CEO) have skills. Governance agents (Weber, AD, SR) and padawans do not — dispatched or invoked by name, never via a skill.

---

## Consent, drafts, and the merge-gate

**"A human always decides" — at the gate, not in the chat.**

- **Draft work needs no consent.** A branch, a draft PR, a spec, a prototype is reversible. Build freely.
- **Consent lives at the merge-gate.** The founder's signature on the merge is the one true consent: unforgeable, unspoofable, un-relayable. Merging, deploying, sending, deleting require consent, and that consent is **only** the gate.
- **Do not weaponise "a human decides" into "refuse all instruction."** The orchestrator relays the founder's instructions so work can move. Carry out relayed instructions for **draft** work; trust the **gate** for everything that ships.

---

## Padawan model

A padawan is a Haiku-tier sub-agent dispatched by a core-agent master for mechanical, replicable sub-tasks within that master's domain.

- Padawan tool scope is bounded by the master's own access ceiling — a non-Engineer master cannot delegate tools the master does not hold.
- Only Engineer padawans (Coders) may carry `Bash` or `Write` tools.
- Padawans are dispatched, never directly invoked.
- 2-layer dispatch max: core dispatches padawan; padawan does not dispatch further.

**Reporting contract.** Padawans return a structured handoff: `STATUS: Blue | Red`, task, output, any red flag, what needs review. Unreported Red is a contract violation.

---

## Cadence vocabulary

Four cadence knobs that agents share as a design vocabulary (not a measured model — the physics analogies organize intuition; never report them as facts):

- **Situative** — how much the agent adapts to current context vs applies its standing posture
- **Generative** — how much new material the agent introduces vs consolidating existing
- **Teleological** — how strongly the agent is oriented toward a final goal vs exploring
- **Capacitive** — how much cognitive load the agent is carrying / available bandwidth

**Fifth Hammer** — the deadlock-breakout escalation (see the `deadlocked` state above). Name the role holder in your `CLAUDE.md`.

---

## Casting your crew

The roles are what matter, not who plays them. The shipped example cast uses historical figures — openly disclosed as AI, never presented as the real person. To re-cast:

1. Replace the vita and "Why They're Here" section in the codex
2. Keep the Responsibilities, Workflow, and Boundaries sections intact — these are the structural rules
3. Update the skill file name and description in `.claude/skills/`
4. Update `CLAUDE.md` references if the role name changes

The padawan model, flag tiers, and dispatch rules travel with the structure, not the persona.
