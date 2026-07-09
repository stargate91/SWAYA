# PHASING-HANDOVER — session handover

> The cold-start bridge. **`conflux-end`** appends a row here; **`conflux-start`** reads it to resume
> for almost no tokens; **`conflux-cleanup`** folds finished rows into the permanent docs (AGENT-HQ,
> BUILD-TRACKER) and empties this file. Keep rows terse — long notes can be Sigil-packed via the
> `conflux-end` skill (it knows where the engine lives; this file never carries machine paths).

## Open handover (newest first)
| When | What changed | Next step | Flags |
|---|---|---|---|
| YYYY-MM-DD HH:MM | ⟨what you did this session⟩ | ⟨the single next action⟩ | ⟨blocked / needs-review / Loc:N / —⟩ |

<!-- ─────────────────────────────────────────────────────────────────────────────
     conflux-cleanup empties everything ABOVE this line once each row is folded
     into AGENT-HQ (decisions) / BUILD-TRACKER (statuses) and archived to Grimoire.
     ───────────────────────────────────────────────────────────────────────────── -->
