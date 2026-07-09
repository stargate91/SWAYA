---
name: conflux-council
description: The decision seat — the QWE keystone. Three human roles made consultable, token-free. Use when the user says "the council", "/conflux-council", "what should I build next", "how far should I run", "how do I build this cheapest", "should I merge this PR", or when a `go` needs a scope call, a cost call, or a stop bound. Wraps the Visionary (scope · default-defer), MacGyver (cheapest-path build-decider · wields Scout), and the Orchestrator (range-bounded autonomy + community-PR governance). The engine (`council/council.mjs`) spends no model — this skill is the seat the human sits in.
---

# conflux-council

The keystone — the **only all-three-orb** seat, and the one that's unapologetically human. It doesn't
build, remember, or broadcast; it **decides**. Three roles, one readout, token-free
(`council/council.mjs` reads the Marker + a queue; it spends no model). Sit in whichever seat the moment
needs.

## The three seats

1. **Visionary — "should this even get built?"** *(the scope friction · default-defer)*
   `node "E:/projects/Lens-Levi/council/council.mjs" vision '{"movesCompass":"yes|tangential|no","necessaryNow":true,"reachable":true,"missing":"…"}'`
   → `adopt` (needed-now compass-mover, reachable) · `defer` (real but not now, or blocked — the missing
   piece is named) · `drop` (doesn't move the compass). **Log the verdict** to `VISIONARY.md` › Decision
   log, then route: adopt → `BUILD-TRACKER` at the phase; defer → `Px`; drop → record why. Pairs with the
   deeper **`conflux-visionary`** rubric skill. *Protecting the compass is the job; being agreeable is not.*

2. **MacGyver — "what's the cheapest way to build it?"** *(the cost waterfall · Q20)*
   `node "E:/projects/Lens-Levi/council/council.mjs" macgyver '{"computable":false,"needsFreshInfo":true,"novelCode":false,"what":"…"}'`
   → **free** (deterministic script, no model) → **research** (wield the **Ghostwalk / `conflux-scout`**
   before writing code) → **model** (author the leanest sufficient code, run it through **`conflux-trim`**).
   Take the cheapest tier that fits; escalate only when the tier below can't do it; **never burn huge**. A
   `fake`/stub is legal but flagged — cleanup checks it was overwritten (Q28).

3. **Orchestrator — "what do I run next, and when do I stop?"** *(range-bounded autonomy · Q21/Q34)*
   The combined readout, driven off the Marker's wishes as the build-signal queue:
   `node "E:/projects/Lens-Levi/council/council.mjs" <root> [--bound A3→G8]` → `{ run[], stopAt, reason }`. **Full autonomy**
   unbounded; a bound windows the run (skip below the start, inclusive stop at the end); a `blocked` or a
   yes/no `gate` **always halts** — hand those back to the human. Feed the `run[]` to **`conflux-go`**.
   For a community PR: `node "E:/projects/Lens-Levi/council/council.mjs" pr '{"testsGreen":true,"inScope":true}'` → a red suite is
   the one hard **reject**; scope/regression fall to **review**, never a reflex-merge.

## When it fires in the loop

- Before a `go` with no clear scope → **Visionary** (adopt/defer/drop) then **Orchestrator** (the run).
- Mid-`go`, "how do I build this without burning tokens?" → **MacGyver** (the tier).
- "Run A3 through G8 then stop" → **Orchestrator** with `--bound A3→G8`.
- A contributor's PR lands → **PR gate**.

## Guardrails

- **Token-free, read-only, stateless.** The engine reads the Marker + the queue and returns judgement —
  it writes nothing, holds no state, can't drift. The *human* (or the Loop) acts on the call.
- **The defaults are the human signature.** Visionary defers, MacGyver reaches cheapest-first, the
  Orchestrator stops the moment a bound or gate says so. Don't relitigate the leans — override per-call.
- **One source of truth.** The queue is the Marker's wishes (same manifest the Bridge reads); the
  Orchestrator never invents work — a cold forge honestly schedules nothing.

## Pairs with

- **`conflux-visionary`** — the deeper scope rubric the Visionary seat summarises.
- **`conflux-scout`** — the Ghostwalk MacGyver wields at the research tier.
- **`conflux-trim`** — the leanness pass on anything the model tier authors.
- **`conflux-go`** — consumes the Orchestrator's `run[]` as the build queue.
