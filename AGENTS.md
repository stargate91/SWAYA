# AGENTS.md

## Communication Style

- Be concise.
- Do not explain obvious code changes.
- Do not summarize diffs unless explicitly asked.
- Avoid verbose reasoning and unnecessary commentary.
- Prefer short status updates over long explanations.
- Assume the user can read the actual code changes.
- Only mention:
  - important architectural decisions
  - breaking changes
  - risks / side effects
  - required manual steps
  - blockers or uncertainties

## Code Changes

- Do not refactor unrelated code.

## Output Format

When finishing a task:

- Keep the response under ~5 lines unless more detail is requested.
- Do not paste large code snippets unless asked.
- Do not explain implementation details already visible in the diff.
- If tests were run, state only:
  - what was tested
  - whether it passed

Good example:
- "Fixed race condition in auth middleware."
- "Added retry handling for failed uploads."
- "Tests passed."

Bad example:
- Multi-paragraph explanation of every edited file and function.

## Code Changes

- You must never unilaterally modify existing business logic. You must always ask the user before making modifications, presenting details of payoffs/tradeoffs and reasoning, and asking if they request this change.


## CSS & Design System Rules

1. **NO Hardcoded Values in Components!** No `.css` file may contain concrete colors (`#FF0000`), specific pixel dimensions (`14px`), or font families. Everything must be referenced using `var(--...)` variables.
2. **NO `!important` Usage!**
3. **NO Aggressive External Styling of Components!** A page stylesheet must never override the internal padding, color, or layout of a generic component.
4. **NO External Margins on Components!** Spacing is always the responsibility of the parent layout container.
5. **NO Deep Selector Nesting!** Keep CSS classes as flat as possible. Use BEM.
6. **No Uncontrolled Dynamic Inline Styles:** Inline styles are strictly limited to purely dynamic runtime values.
7. **Component State vs. Styling:** Use native CSS pseudo-classes or HTML `data-` attributes for custom states.
8. **Scrollbars:** Use `scrollbar-gutter: stable` on containers where dynamic length causes shifts.
9. **Media Queries:** Always use standard breakpoint tokens (e.g., `--sys-bp-tablet`).
10. **Z-Index Scale:** Use central z-index tokens (dropdown: 100, sticky: 200, backdrop: 300, modal: 400, toast: 500).

## Frontend V2 Architecture Rules

1. **Automatic and Declarative Cache Invalidation:** Define query keys and invalidation mappings centrally using TanStack Query's `meta` object inside global `QueryClient` onSuccess mutation hooks instead of manual inline `onSuccess` invalidation.
2. **API Layer and Strict Type Safety:** Define explicit `Request` and `Response` interfaces for every API endpoint. Declare return types on API clients.
3. **Zustand Persistence:** Use Zustand's built-in `persist` middleware to synchronize store states instead of writing manual `localStorage` logic.
4. **Data Normalization:** Establish a dedicated, typed Mapper layer (accepts raw API response, returns clean typed model).
5. **Global Modal Management:** Use a centralized modal store to manage active modals and context data instead of local `useState` visibility toggles.
6. **Style Isolation:** Use CSS Modules (`[Component].module.css`) or utility-first CSS (Tailwind) to prevent global scoping leaks.
7. **Electron IPC Type Safety:** Define a strict TypeScript interface for `window.electronAPI` to secure message passing.
8. **URL Query Parameters:** Use a unified, type-safe state-in-url utility (e.g. `useQueryParams`) to sync page state with navigation.
9. **Typed Translations (i18n):** Convert localization JSON files to TypeScript types to prevent missing keys/typos.

