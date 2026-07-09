---
name: conflux-cleanup
description: Full consolidation of the Conflux trackers — the deliberate session-close ritual. Use when the user says "cleanup", "/conflux-cleanup", or "do a full cleanup". Folds finished PHASING-HANDOVER rows into the permanent docs (AGENT-HQ, BUILD-TRACKER), rolls the 45-day bug/feature window, archives to Grimoire, then empties the handover. Run it less often than /conflux-end.
---

# conflux-cleanup

1. **Gate.** If any handover row is flagged `blocked` / `needs-review`, surface it and ask before folding.
   Do not silently bury unfinished work.
2. **Fold each finished handover row** from `/PHASING-HANDOVER.md`:
   - A decision → append to `AGENT-HQ.md` › *Load-bearing decisions*.
   - Advanced/finished a build item → update its **status** in `BUILD-TRACKER.md`.
3. **Roll the 45-day window** in `BUG-FEATURE-TRACKER.md`: any item older than 45 days still `open` →
   escalate (to BUILD-TRACKER phase or VISIONARY) or close; move resolved/escalated rows to *Rolled up / archived*.
4. **Refresh the contract docs (drift check).** For every decision you just folded into AGENT-HQ,
   reconcile the agent-facing contract docs — `AGENTS.md`, `CLAUDE.md`, any `AGENT*.md` — with the reality
   that decision records: **update** instructions a decision changed (reversed default, renamed path);
   **delete stale instructions** for anything retired (archived files, dropped features, removed tools);
   leave the contract docs matching the reality just recorded. *(Run `conflux-doctor` first if you want
   the drift list handed to you.)* If nothing drifted, say so. This is the single place where *what's
   true* (decisions) and *what the next agent is told to do* (contract docs) get reconciled — so they
   can't silently diverge between cleanups.
5. **Archive** the folded handover to memory:
   `node "E:/projects/Lens-Levi/wex/grimoire/grimoire.mjs" remember "<folded summary>" --kind archive --tags cleanup`
6. **Refresh the genetic beacon + the Hot Start** (the regenerable mirrors — they can't drift because
   they're recomputed, not hand-edited):
   - `node "E:/projects/Lens-Levi/exort/marker/marker.mjs" .` — re-strike `.conflux/marker.json` (decomposition + heartbeat now
     reflect this session's proofs).
   - `node "E:/projects/Lens-Levi/wex/loop/loop.mjs" hotstart .` — regenerate `HOT-START.md` **only if it already exists**
     (host projects without one skip this — the generator's narrative is Conflux-repo-specific today).
   - *(optional drift check)* `node "E:/projects/Lens-Levi/quas/anchor/anchor.mjs" .` — Anchor freezes the cold-start sources;
     any drift it lists is auto-resolved (newest wins) but worth a glance.
7. **Empty** the *Open handover* section of `PHASING-HANDOVER.md` (keep the header + the cleanup marker comment).
8. Report: what was folded where, what rolled up, **which contract docs were refreshed**, the refreshed
   marker/Hot Start, and the new clean state.
