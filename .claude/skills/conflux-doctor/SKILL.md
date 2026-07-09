---
name: conflux-doctor
description: The drift detector — assert the contract docs still match reality, so a cold-start agent is never handed stale instructions. Use when the user says "doctor", "/conflux-doctor", "check for drift", "are the docs stale", or before a release. Mostly-deterministic health check; it REPORTS drifts with one-line fixes — the fix is applied by conflux-cleanup or by hand.
---

# conflux-doctor

A cold-start agent reads the contract docs (`CLAUDE.md`, `AGENTS.md`, any `AGENT*.md`) most literally —
so stale content there is the most dangerous kind. This skill catches it. **Report, don't fix** (cleanup
or a human applies the fix). Be precise; cite file + line.

Check six kinds of drift:

1. **Contract ↔ reality.** For each file/path/tool an agent doc instructs the agent to *use*, confirm it
   still exists. If it was archived/deleted (a renamed module, a retired tool, a removed feature), flag
   every instruction that still points at it. *(This is exactly how docs end up teaching a torn-out
   subsystem.)*
2. **Doc ↔ doc.** Compare `AGENT-HQ.md` › *Load-bearing decisions* against `CLAUDE.md` / `AGENTS.md` /
   any `AGENT*.md`. Flag any instruction a newer decision has reversed (a flipped default, a renamed
   path, a dropped approach).
3. **Tracker hygiene.** `PHASING-HANDOVER` rows with no matching `BUILD-TRACKER` item; `BUILD-TRACKER`
   🔨 `wip` with no recent handover; `BUG-FEATURE-TRACKER` rows past the 45-day roll.
4. **Pointer integrity.** `MEMORY.md` pointers to missing memory files; `[[links]]` with no target;
   doc links to files that don't exist.
5. **Environment readiness.** Probe the optional **Trim heavy-rung sidecar** (markitdown) — run
   `node "E:/projects/Lens-Levi/wex/trim/trim.mjs" ensure-sidecar` (a *global* check, never installs). If absent, report it with
   the one-line fix `node "E:/projects/Lens-Levi/wex/trim/trim.mjs" ensure-sidecar --install` (or the `pipx`/`pip` hint it prints).
   This is the doc→Markdown preprocess for `pdf · docx · pptx · xlsx`; the core runs fine without it
   (cheap formats + silent-degrade), so this is a *readiness note*, not a blocking drift. **First-install
   note:** when Conflux is vendored into a host repo as a dependency, that host's setup/postinstall should
   run `ensure-sidecar --install` once — it self-skips if markitdown is already on the machine.

6. **Installed-skill freshness (host projects).** The `conflux-*` skills in this project's
   `.claude/skills/` are installed copies of the canonical set (`<conflux>/wex/skills/`, engine paths
   rewritten to absolute at install) — and they DRIFT: every host audited in the field was a
   generation behind. Two checks: (a) spot-compare one or two SKILL.md bodies against the canonical
   (ignore the rewritten `node "<abs>/…"` paths — those differ by design); (b) flag any installed
   `conflux-*` skill that no longer exists canonically — a retired-era relic that teaches a torn-out
   engine (the field specimen: a `conflux-retrofit` still instructing agents to run the dead
   `exort/engine`) is the most dangerous drift of all → delete it. The fix for (a) is always the same
   one-liner: re-run `node <conflux>/wex/loop/loop.mjs init <thisProject>` — skills refresh in place,
   filled trackers stay untouched.

**Output:** a short list of drifts, each with a one-line fix, grouped by the six kinds. If a kind is
clean, say so. End with the single highest-risk drift (a stale contract-doc instruction outranks a
tracker nit or a missing optional sidecar). The fixes feed `conflux-cleanup` step 4 (contract-doc
refresh) or a human.

> Keep it cheap and deterministic — it reads docs and checks references; it does not scan the whole repo
> or run the app.
