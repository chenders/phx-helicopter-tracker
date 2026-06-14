---
applyTo: "frontend/**"
---

# TypeScript / React review rules (phx-helicopter-tracker)

Path-scoped rules Copilot activates when reviewing `frontend/**`. Same recurring categories the
`frontend-pre-pr-reviewer` agent tracks. Cross-cutting priorities live in
`.github/copilot-instructions.md`; UI/design and the *rendered-result* requirement are covered by
`hud-ux-reviewer` / `/ui-ux-review`.

## Flag these (type safety — CI-blocking via `tsc`)

- **`any` / `as any` that hides a real type error**, and non-null assertions (`!`) on values that
  can genuinely be null/undefined. Type API responses (see `src/types/`) — no untyped `data.foo`.
- **React Query v4 idioms** (this repo migrated v3→v4 — a past CI breakage). Use the object form
  `useQuery({ queryKey, queryFn })`, `gcTime` not `cacheTime`. Flag v3 positional
  `useQuery(key, fn)` calls that won't type-check.

## Flag these (hooks correctness)

- **Exhaustive deps** on `useEffect`/`useCallback`/`useMemo` — missing deps cause stale-closure
  bugs. **No conditional hooks** (Rules of Hooks — also an ESLint error → blocking).
- **`queryKey` completeness** — must include every variable the `queryFn` depends on, or cached
  data goes stale / collides across params.

## Flag these (correctness & UX)

- **Unhandled `isLoading`/`isError`** on a new `useQuery` (renders undefined-driven UI).
- **Missing stable `key`** in `.map()` lists (not array index when the list reorders).
- **Floating promises** in handlers (unawaited async with no `.catch`).
- **Hardcoded API URLs/ports** — use the app's relative-URL convention (deliberate, to avoid HTTPS
  issues). Only `VITE_`-prefixed envs reach the client — flag any secret read via
  `import.meta.env.VITE_*`.

## Accessibility

- Icon-only controls need `aria-label`; don't put meaning in color alone; interactive elements
  need keyboard support. (Deeper a11y + legibility-over-imagery is `hud-ux-reviewer`'s lane.)

## Tests & don't-flag

- New components/hooks with logic need Vitest coverage (`*.test.tsx` / `src/__tests__/`).
- Don't flag style Prettier/ESLint auto-fix; don't flag idiomatic choices that compile and lint clean.
