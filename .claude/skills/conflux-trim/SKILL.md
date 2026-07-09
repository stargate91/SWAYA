---
name: conflux-trim
description: Trim (Alacrity · WWE) — the leanness pass. TWO triggers. (1) DOC PREPROCESS — when the user hands in a document. Cheap text formats (CSV, JSON, HTML, big text/markdown) convert immediately with `node "E:/projects/Lens-Levi/wex/trim/trim.mjs" convert <file>`; heavy formats (PDF, Word, PowerPoint, Excel, images) are ASK-FIRST, EVERY time — never convert them without the user's per-file yes, because markitdown is text-only (images flattened/dropped) and feeding the file straight to a vision-capable model is often better. (2) LEANNESS LADDER — before generating non-trivial code, run `node "E:/projects/Lens-Levi/wex/trim/trim.mjs" brief "<intent>"` to reuse what exists and cut YAGNI. Use when the user says "trim", "/conflux-trim", "preprocess this", "convert this doc", or attaches/points at a document.
---

# conflux-trim

**Trim cuts tokens on both ends — what you read and what you write.** It's a script, so both passes are
token-free to run. Engine + full contract: [`wex/trim/README.md`](../../trim/README.md).

## Pass A — preprocess a document (input side · ASK-FIRST for heavy formats)

**Trigger: the user gives you a document.** Two lanes, one hard rule:

- **Cheap text formats** (`txt·md·csv·tsv·json·jsonl·html`) — convert immediately, before pulling the raw
  file into context. Zero-dep, token-free, nothing is lost (text in, text out):
  ```
  node "E:/projects/Lens-Levi/wex/trim/trim.mjs" convert <file> --json
  ```
  You get `{ fmt, via, markdown, savings:{ before, after, saved, ratio } }`. Work from `markdown`.

- **Heavy formats** (`pdf·docx·pptx·xlsx`, images, audio) — **STOP and ask the user, EVERY time. Never
  convert silently.** markitdown emits text only: images are flattened or dropped, figures and layout
  collapse — a silent convert can quietly ruin exactly what the document was for. And with vision-capable
  models, handing the file itself to the model is often the better read (image context beats a lossy
  transcript). Ask with these options, every document, no remembered defaults:
  1. **Feed the file directly to the model** — recommended when figures, images, or layout matter.
  2. **Convert via markitdown** — leaner tokens, text-only transcript (images lost). On yes:
     ```
     node "E:/projects/Lens-Levi/wex/trim/trim.mjs" convert <file> --yes --json
     ```
  3. **Skip the file.**
  The engine enforces the gate: without `--yes` a heavy convert exits `3` (`ConsentRequired`) — that exit
  is your cue to ask, not to retry.

- **Sidecar absent** (exit `2`): surface the hint and offer to run the installer — don't try to read the
  raw binary yourself:
  ```
  node "E:/projects/Lens-Levi/wex/trim/trim.mjs" ensure-sidecar --install
  ```
  (Manual form: `pipx install 'markitdown[pdf,docx,pptx,xlsx]'` — the extras matter; bare `markitdown`
  can't read any binary format.)

- **Report the win** when you do convert: quote the savings line (e.g. *"Trimmed the PDF: ~8.4k → 2.1k
  tokens, 75% leaner"*). Savings are *exact* for text and *estimated* (bytes/4) for binary — say which.
  Optionally `--seal` to also Sigil-pack the Markdown for stored/handover context.

## Pass B — the leanness ladder (output side)

**Trigger: about to generate non-trivial code.** Fire the ladder first so you reuse before you write:

```
node "E:/projects/Lens-Levi/wex/trim/trim.mjs" brief "<what you're about to build>"
```

It returns the 5 rungs (**reuse → stdlib → YAGNI → inline → minimum**), **reuse candidates** already in the
repo, and **YAGNI smells** in the intent (`configurable`, `generic`, `factory`, `future-proof`, …). Climb it:
prefer an existing surface, drop speculative options, write the minimum that works — **lazy, not negligent.**

After drafting, sanity-check leanness:
```
node "E:/projects/Lens-Levi/wex/trim/trim.mjs" score <file>
```
Flags duplicate lines, dead in-file functions, and names that may duplicate the existing surface. Target:
**~22% fewer tokens** than a first draft. These are heuristic signals, not a proof — use judgment.

## Where it plugs into the loop

- `conflux-go` step **BUILD**: run **Pass B** (`brief`) before writing the change.
- Any time a document enters the conversation: run **Pass A** (`convert`) first.
- Trim never decides *what* to build (that's the Visionary/Claws) — it only makes the read and the write leaner.
