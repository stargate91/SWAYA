---
name: vizvalaszto
description: Convene a Court of Experts on the CURRENT project, then generate a self-contained HTML questionnaire of 50 decision-shaping questions whose saved answers point at the project's next step. Use when the user says "/vizvalaszto", "watershed", "vízválasztó", "court of experts", "help me decide the direction", "what should this project become", or wants a structured way to choose where a project goes next. The decisive fork-in-the-road tool.
---

# vizvalaszto · the watershed

> **Vízválasztó** (Hungarian) — a *watershed*: the ridge line where water decides which sea it runs to.
> One small choice at the top decides everything downstream. This skill is that ridge line for a project:
> it makes the founder's real choices visible, captures them, and turns them into a direction.

Drop this skill into any project's `.claude/skills/` and type `/vizvalaszto`. It runs the whole flow
below **for the project folder you are standing in** — no config, no setup. The output is one HTML file
the user fills in at their own pace, and a saved `.md` of answers that you then turn into the next step.

The discipline is **understand first, ask second, decide third**. Never skip the understanding.

---

## The flow (five movements)

### 1. Understand the project deeply (do this for real)
Read what the project actually is before asking anything. In order of value:
- `README.md`, any `HANDOVER.md` / `*-ROADMAP.md` / `CONFLUX.md` / `ARCHITECTURE.md` / `docs/`, the
  newest entries of any build log, open trackers / issues, and the top-level folder structure.
- The package manifest (`package.json` / `pyproject.toml` / etc.) for what it's made of.
- Enough source to know the shape, not every line. Aim for *the thesis*, the *current state*, and the
  *open forks* — the places where the project could honestly go more than one way.
> For a large or unfamiliar repo, fan this out: spawn parallel read-only `Explore` agents (one per
> subsystem) and synthesize. The point is a true mental model, cheaply.

### 2. Convene the Court of Experts (5–6 verticals)
Pick **5–6 expert lenses that fit THIS project** — each a distinct domain that will pull the questions in
a different direction so the set is comprehensive, not lopsided. A strong default court for a
builder-tool / product:
- **The Visionary** — product vision, scope, the north star, what it must refuse to become.
- **The Craftsman** — developer/user experience, onboarding, the first five minutes, "just works."
- **The Engineer** — architecture, the core technical moat, sustainability, guardrails.
- **The Herald** — distribution, community, open-source, go-to-market, what makes it spread.
- **The Steward** — business model, money, who pays, positioning, longevity.
- **The Loremaster** — brand, narrative, naming, design, the emotional story it tells.
Swap any lens for one the project needs more (Security, Research, Data, Compliance, Education, …).
**Power move:** run the court as a `Workflow` — one agent per vertical in parallel, each drafting
~9 questions, then a curator merges to 50 and a devil's-advocate sharpens them. (See Conflux's own
`vizvalaszto-court` workflow for the reference implementation.)

### 3. Write 50 decision-shaping questions
Balance across the verticals (≈8–9 each). Every question obeys the **fork rule** and the **note rule**:
- **Fork rule:** options **A** and **B** are two *genuinely different, defensible directions* with real
  tradeoffs — never good-vs-bad, never a strawman. **C** is always "in my own words" (a free-text input)
  so the user is never boxed in.
- **Note rule:** each question carries an **ELI15 note** — explain to a smart 15-year-old (a) *why this
  question matters* and (b) *how each answer concretely shapes the project*. The note is what makes the
  questionnaire teach, not just interrogate.
- Make every question **specific to this project** (its real mechanics, names, choices), never generic
  startup advice.

### 4. Generate the HTML (the contract below) and hand it over
Emit one self-contained `vizvalaszto.html`. Tell the user: *open it, answer at your own pace (it saves
itself), and hit **Save** when done.* They can close the tab and come back — progress is local.

### 5. Decide the next step (the watershed pays off)
When the user returns with the saved `.md` (pasted back, or pointed to on disk), read every answer and
the patterns across verticals, then propose the project's **next step / direction** — concretely, with
the tradeoffs the answers revealed, logged where the project keeps its plan (e.g. a roadmap or tracker).
This is the whole point: the questionnaire is the means, the *decision* is the deliverable.

---

## The HTML contract (so it always behaves the same)

**Single file, zero dependencies, opens from `file://`.** No build, no fetch, no CDN — all data and
script inline. It must work by double-click.

- **Page 1 — The Understanding.** Project name + your honest synthesis: *what it is*, *what it aims to
  become*, *how it could help the world*, and the **Court of Experts** introduced by name. A clear
  **Begin** action moves to the questions. This page is your current understanding, stated plainly.
- **The 50 questions**, grouped by vertical (a labelled section per expert), each card showing:
  `Qn` · vertical tag · the question · **radio A** (= option A text) · **radio B** (= option B text) ·
  **radio C** paired with a free-text input (typing in the box selects C) · a **note** ("Why this matters")
  that is visible or one tap away.
- **Saved locally, always.** Autosave every change to `localStorage` under a project-namespaced key
  (e.g. `vizvalaszto:<project-slug>`). On load, rehydrate. Show a live **progress** count (answered / 50)
  and a quiet line reassuring the user they can close and return.
- **Save → Markdown.** A **Save** action builds a Markdown document of all 50 (each question with the
  chosen answer resolved to its text — A, B, or the typed words) and:
  1. **primary path** — shows it in a copyable panel labelled *"copy this back to your AI to decide the
     next step"* (keeps the agent in the loop, no file dumped where it isn't wanted), and
  2. **secondary path** — offers a `.md` download for those who want the file directly.
  Markdown shape:
  ```
  # <Project> — Vízválasztó
  > Watershed answers · <date> · NN/50 answered

  ## <vertical> — Q<n>. <question>
  **→ <A | B | own words>:** <resolved answer>
  ```
- **No silent failures.** If something can't save, say so on screen. Never fail quietly.
- **Look.** Calm, focused, a little reverent — this is a decision, not a form. Honor the host project's
  identity if it has one (colors, name, lore); otherwise a clean dark theme. The bar is *"a tool you'd
  trust with a real decision."*

---

## Output locations
- The questionnaire: `vizvalaszto.html` at the project root (most discoverable — "just open it"), or a
  `docs/` / `.conflux-docs/` folder if the project keeps generated docs there.
- The saved answers: wherever the user lands them; when you receive them back, write the decision into
  the project's plan-of-record (roadmap / tracker / handover), not just the chat.

## Principles (don't violate)
- **Understand before you ask.** A questionnaire from a shallow read is noise.
- **Real forks only.** If A and B aren't both defensible, it isn't a question — it's a nudge.
- **Teach in the notes.** Every question leaves the user smarter about their own project.
- **The decision is the deliverable.** The HTML is scaffolding; movement 5 is the payoff.
