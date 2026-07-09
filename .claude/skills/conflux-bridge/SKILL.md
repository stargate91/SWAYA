---
name: conflux-bridge
description: The feedback bridge — render the running app, ship "what to test" out to an external tester (a testing service / a human), and bring the results back into the loop so the heartbeat lights `proven-in-browser`. Use when the user says "bridge", "/conflux-bridge", "ship it to testers", "send for testing", "hand off for QA", or "pull the test results back in". The render gate is the mechanism; connection is the purpose.
---

# conflux-bridge

The Marker says *"I'm alive."* The Bridge answers *"am I **proven**?"* — by rendering the app, shipping
the open test targets out to a real tester, and folding their verdicts back in. **Connection is the
purpose; the render gate is the mechanism.** The engine (`exort/bridge/bridge.mjs`) spends no model —
this skill is the part that drives the browser and talks to the human. Reuses the **Marker's** proof
channel; never invents a second source of truth.

## The cycle

1. **GATE** — `node "E:/projects/Lens-Levi/exort/bridge/bridge.mjs" gate <root>`. Reads the marker heartbeat → proven vs pending.
   If there's **no marker**, run the Marker first (`node "E:/projects/Lens-Levi/exort/marker/marker.mjs" <root>`). If the gate is
   **not ready** (no run command, or everything already proven), report that and stop — nothing to ship.
2. **RENDER** — bring the app up and confirm it actually renders before wasting a tester's time. Run
   **`conflux-verify`** against the pending targets: preview tools + the app's DOM hooks; a console error
   or a failed request is a **fail** — diagnose and fix before shipping. (This is the render gate, made
   real.) For anything you can prove yourself in the browser here, that's the cheapest tester — record it.
3. **PACKAGE** — `node "E:/projects/Lens-Levi/exort/bridge/bridge.mjs" <root>` writes the pointer-only handoff
   (`.conflux/bridge/handoff.json`): project · run command · the capabilities still wanting proof · open
   wishes. **Shape only — no source.**
4. **SHIP** — opt-in. With `.conflux/bridge.config.json` set (`broadcast` + a testing-service
   `endpoint`), `--send` POSTs it. Otherwise hand the human the outbox path for a manual send to the
   tester. Offline degrades silently — the handoff is already saved.
5. **INGEST** — when the tester returns verdicts (`[{ capability, verdict:"pass"|"fail", note? }]`), run
   `node "E:/projects/Lens-Levi/exort/bridge/bridge.mjs" ingest <root> <results.json>`. Passes fold through the Marker's
   `recordProof` → `.conflux/proofs.json`; fails surface as `failing` build-signals.
6. **REFRESH** — re-run the Marker so the heartbeat lights up: a proven capability flips to
   **`proven-in-browser`**. Feed any `failing` items back to **`conflux-go`** as the next build queue.

## The loop it closes

```
verify / a tester  ─▶  ingest  ─▶  proofs.json  ─▶  marker refresh  ─▶  heartbeat: proven-in-browser ✦
```

## Guardrails

- **Privacy floor:** the handoff carries capability *shape* + the run command only — never source.
- **Ship is opt-in, off by default**, never throws, silent-degrades offline — same posture as the
  Marker's Sun Strike.
- **The render gate is a gate, not a vibe.** Don't package a build you haven't seen render. A red verify
  blocks the ship.

## Pairs with

- **`conflux-verify`** — the in-house render/verify gate (step 2); the cheapest tester is you.
- **the Marker** — the proof channel ingest writes to, and the heartbeat the gate reads.
- **`conflux-go`** — consumes the `failing` returns as the next build items.

> Synthetic/human testers live at **an external testing service** — a separate project. The Bridge only connects
> to them; it is the wire, not the tester.
