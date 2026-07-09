---
name: conflux-scout
description: The deep-research gate — plan a question, gather findings at the cheapest tier, and cite them before handing off. Use when the user says "research", "/conflux-scout", "deep dive on X", "find sources for", or wants a cited answer to an open question. Drives Scout's plan→gate→cite loop; the engine is token-free bookkeeping — spend the model only on reading.
---

# conflux-scout

Research is a **gate**, not a vibe: a claim without a source is RED and blocks the handover, exactly like
`conflux-verify`. Scout (`quas/scout/scout.mjs`) does all the bookkeeping — plan, recency lens, citation
scoring, the markdown render — **token-free**. The model is spent **only on reading and synthesis**.

## The loop

1. **Plan (token-free)** — `plan(question)`. Scout types the question (definition / how-to / comparison /
   timeline / current-state), decomposes it into facets with query variants, and appends a **recency step**
   when the question implies *latest / now / 2026*. Read the steps before spending anything.
2. **Execute each step at the cheapest tier first** — the waterfall is **cache → free web → model**:
   - **cache** — `cacheGet(root, query)` over `.conflux/scout/cache.json`. A hit costs nothing; use it.
   - **free web** — the fenced `fetchSource(url)` (node:https) + `htmlToText(html)`, or your own free-source
     reads (Hacker News / Reddit JSON, docs). Still cheap. `cachePut(root, query, result)` what you fetch.
   - **model** — escalate to the model ONLY to read/summarize fetched text into claims. Use `costTier(step)`
     to pick. Emit findings as `{ facet, claim, sourceIds:[...] }` and sources as `{ id, url, title, date }`.
   You can hand all of this to `research(question, executor)` — the executor is the only thing that spends.
3. **Gate (red blocks handover)** — `gate(plan, findings, { sources })`. The **plan-gate** checks every facet
   is covered + the recency step is present when needed + within `maxSteps`. The **citation-gate** checks
   every claim resolves to ≥1 source and scores on *cited-fraction · domain-diversity · freshness*. If
   `gate.ok` is **false** — uncited claims, a low score — **do not hand off**: go gather more, then re-gate.
4. **Cite** — `cite(plan, findings, { sources })` renders the report: a freshness/coverage banner, sections
   per facet with `[n]` citations, a deduped references list ordered by recency, and a gaps footer. Numbering
   is stable. This is the deliverable.

## Make the gate real

- A **claim with no source** = FAIL. Report it; never soften an uncited claim into a fact.
- Prefer **fresh, free sources** — the recency lens flags stale (>365d / undated) and paywalled domains.
  A report leaning on stale or non-free sources is weaker; the banner says so.
- **Dedupe by domain** — three claims from one blog is not three sources. The gate's `diversity` reflects it.

> Token honesty: the only token spend is the model reading fetched text into claims and synthesizing the
> prose. Plan, recency scoring, dedupe, gating, and the render are all deterministic and free. Read the
> changed facet, not the whole web.
