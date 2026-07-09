---
name: conflux-go
description: The autonomous build-verify loop driver — the operator loop. Use when the user says "go", "/conflux-go", "keep going", "run the loop", or "build the next item(s)". Picks the top open item, builds it, PROVES it works in a running browser, hands off, and grabs the next — looping until the queue is dry or it hits a real yes/no decision. This is what collapses the operator's input to start · go · status · yes/no.
---

# conflux-go

Turn "go" into a self-running cycle. **Verify before you advance** — autonomy without a verify gate
just means shipping bugs faster. Run under Auto Mode: make the reasonable call and keep moving; the
operator redirects. Loop one item at a time through this contract:

1. **PICK** the next item: top `PHASING-HANDOVER.md` `next step`, else `BUILD-TRACKER.md` 🔨 `wip`, else
   the current phase's top ⬜ `todo`. **Never invent scope** — if the queue is empty, stop and report.
   (A new idea passes through `conflux-visionary` first; `go` builds, it does not decide *what* to build.)
2. **BUILD** the change. Route by cost (from AGENT-HQ): cheapest model that can do the job — copy/i18n
   to Haiku, mechanical builds to Sonnet, hard calls to Opus. Honour the project's conventions.
3. **TYPECHECK / TEST** — run the project's gate (from AGENT-HQ infra, e.g. `npm run typecheck`).
   Fail → fix in place (≈3 tries) → still failing → flag the handover row `blocked` and **ASK**.
4. **VERIFY** — run **`conflux-verify`**: prove the change in a running browser (preview tools + the
   app's DOM hooks). A console error or wrong DOM → diagnose → fix → re-verify. Do **not** advance on a
   red verify.
5. **PROVE** — capture a `preview_screenshot` (or the relevant log/network proof); note the path on the
   handover row.
6. **HAND OFF** — run **`conflux-end`**: append the one-line row, mark the item ✅.
7. **LOOP** — back to step 1. **Stop only when:** the queue is empty · a yes/no gate fires · an
   unclearable `blocked`.

## When to stop and ask (yes/no gates only)

Surface a question **only** for a real fork: a scope/compass call, a destructive or irreversible action,
a genuinely ambiguous design decision, or a `blocked` you can't clear. Everything else you decide and
keep moving. **Batch** non-blocking decisions — hold them and ask together at a natural breakpoint via
`AskUserQuestion` (multi-select), not one interruption per item. Respect the operator's attention: ask
rarely, ask well.

## Pairs with

- **`/loop`** (the harness skill) for interval or self-paced unattended runs.
- **`AskUserQuestion`** for the gates.
- **`conflux-verify`** (the gate) and **`conflux-end`** (the handover) on every iteration.

> The loop is only as good as its verify gate. If the project has no real verify path yet, build that
> first (`conflux-verify` + smoke tests) before leaning hard on `go`.
