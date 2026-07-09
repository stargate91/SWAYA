---
name: conflux-status
description: Show a Conflux pipeline snapshot grouped by readiness. Use when the user says "/conflux-status", "show the pipeline", "what's blocked", "full status", or "what's in the queue". Reads BUILD-TRACKER.md + BUG-FEATURE-TRACKER.md and prints a grouped snapshot. Read-only.
---

# conflux-status

1. Read `/BUILD-TRACKER.md` and `/BUG-FEATURE-TRACKER.md`.
2. Print, grouped:
   - 🔨 **In progress** (BUILD-TRACKER `wip`)
   - ⏸ **Blocked** (with the blocker)
   - ⬜ **Next up** — the current phase's todo items only (don't list every future phase)
   - 🐞 **Open bugs** — oldest first, with age in days (flag anything nearing the 45-day roll)
3. End with the **single highest-leverage next item** and one line on why it moves the compass.
4. **Read-only** — never edit the trackers.
