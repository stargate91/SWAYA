---
name: conflux-verify
description: The browser-driven verify gate — prove a change actually works before it's handed off. Use when the user says "verify", "/conflux-verify", "prove it works", "test the change", or automatically as step 4 of conflux-go. Drives the running app with the preview tools, reads the DOM/console, and FAILS the handover on any error. Make verify a gate, not a vibe.
---

# conflux-verify

Never claim "it works" without observing it. Verification is a **gate**: a red verify blocks the
handover. Use the harness **preview tools** (never ask the human to click around).

1. **Ensure a server is running** — `preview_start` (or reuse the one `conflux-go` started).
2. **Reload** if needed (`preview_eval: window.location.reload()`); skip if HMR already applied the change.
3. **Check for errors** — `preview_console_logs`, `preview_logs`, `preview_network`. Any console error or
   failed request is a **fail**.
4. **Exercise the changed flow** — drive it through the app's canonical DOM hook (e.g. `data-node` /
   `data-testid`): `preview_click` / `preview_fill`, then `preview_snapshot` to read back the DOM and
   content. Confirm the change is actually present and correct — not just that the page loaded.
5. **On any error or wrong DOM** → diagnose in the source, fix, and **re-verify from step 3**. Do not
   proceed while red.
6. **On green** → capture proof: `preview_screenshot` for visual changes, `preview_network` for an API
   change, or `preview_logs` for a server change. Return the proof path.
7. **Record the proof into the Marker** so the genetic beacon's heartbeat lights up. For each capability
   you just proved (a Cartograph atom — a helper/screen/symbol), write it as `proven-in-browser`:
   `node "E:/projects/Lens-Levi/exort/marker/marker.mjs" proof . <capability> proven-in-browser`
   (capability = the atom/node id or label, e.g. `helper:winRate`). This is what turns a heartbeat from
   `typecheck-only`/`stub` into `proven-in-browser` at the next marker refresh — verification feeds the beacon.

## Make the gate real

- A **console error**, a **failed network call**, or a **DOM that doesn't reflect the change** = FAIL.
  Report it honestly with the output; do not soften a failure into a pass.
- Prefer **deterministic fixtures** if the project has them (e.g. a seed builder for a fixed day) so the
  verified state is reproducible.
- This is the prerequisite for `conflux-go`'s autonomy. If the project has no DOM hooks or no smoke
  tests, flag that — a thin layer on the app's hooks is what lets the loop self-check without a human.

> Token honesty: browser-driven verification spends tokens on snapshots/console reads. That's the right
> trade (cheaper than a human round-trip + bug bounce-backs) — but it's a real cost; verify the changed
> flow, not the whole app.
