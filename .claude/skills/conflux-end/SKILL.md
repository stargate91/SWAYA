---
name: conflux-end
description: Close a Conflux work session by recording the handover. Use when the user says "end", "/conflux-end", "wrap up", or "done for now". Verifies (typecheck/test), appends ONE row to PHASING-HANDOVER.md, and remembers the session in Grimoire. Does NOT rewrite the permanent docs — that is /conflux-cleanup.
---

# conflux-end

1. **Verify.** Run the project's typecheck/test (from AGENT-HQ infra). If it fails, fix it or record it
   as a `blocked` / `needs-review` flag on the handover row.
2. **Append one row** to `/PHASING-HANDOVER.md` (Open handover): `when · what changed · next step · flags`.
   Keep it terse; for long notes, Sigil-pack them first:
   `node "E:/projects/Lens-Levi/wex/sigil/sigil.mjs" pack <notes.md> full`
3. **Remember** the session for cross-session recall:
   `node "E:/projects/Lens-Levi/wex/grimoire/grimoire.mjs" remember "<one-paragraph summary>" --session <id> --kind handover --tags <area>`
4. **If `/HOT-START.md` exists, regenerate it** (Q16) so the next cold start resumes in one paste —
   token-free, deterministic, can't drift: `node "E:/projects/Lens-Levi/wex/loop/loop.mjs" hotstart .` (rewrites `/HOT-START.md`
   from the marker + the suite + the BUILDLOG queue). If you advanced the build order, tick the BUILDLOG
   `## Next` box first so the regenerated "next action" points at the right thing.
   **On a host project with no HOT-START.md, skip this step** — the handover row IS the resume there
   (the generator's narrative is Conflux-repo-specific today; a host template is on the tracker).
5. **Do not** touch AGENT-HQ / BUILD-TRACKER — consolidation is `/conflux-cleanup`'s job. This skill only
   records the handover + refreshes the Hot Start, so it's safe to run often and cheap.
6. Report the one-line handover you wrote.
