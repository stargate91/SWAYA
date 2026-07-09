# BUG / FEATURE TRACKER — 45-day rollup

> Small bugs and feature requests on a **rolling 45-day window**. The window keeps the list honest:
> anything still open after 45 days isn't "small" — it gets **rolled up** (escalated to BUILD-TRACKER
> or VISIONARY) or closed. `conflux-cleanup` performs the roll; `conflux-status` surfaces what's open.
>
> Type: 🐞 bug · ✨ feature   ·   Status: open · wip · fixed · wontfix

## Active (≤ 45 days)
| Date | Type | Item | Status | Notes |
|---|---|---|---|---|
| YYYY-MM-DD | 🐞 | ⟨short title⟩ | open | ⟨repro / context⟩ |
| YYYY-MM-DD | ✨ | ⟨short title⟩ | open | ⟨why⟩ |

## Rolled up / archived (> 45 days or resolved)
> `conflux-cleanup` moves rows here: resolved ones as a record; stale-open ones with where they were
> escalated to (BUILD-TRACKER phase / VISIONARY verdict).
- YYYY-MM-DD — ⟨item⟩ — ⟨fixed | escalated to BUILD-TRACKER P2 | dropped (why)⟩
