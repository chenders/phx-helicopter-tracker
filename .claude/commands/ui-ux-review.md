# UI/UX Review

Holistic usability + interaction + accessibility review of changed frontend screens. Use for any
non-trivial UI change (layout, components, flows, states). For pure visual-design polish use
`/design-review`; for the 3D map specifically use `/3d-view-review`.

## Arguments

- `$ARGUMENTS` — optional diff range (default `dev...HEAD`), screen name, or path.

## Instructions

1. **Scope** the changed UI: `git diff <range> --stat -- 'frontend/**'`. If no frontend changes,
   say so and stop.

2. **Capture the RENDERED result (do this before dispatching).** Code review alone misses the UI
   bugs that matter most. Get a **real browser screenshot** of each changed screen (a couple of
   viewport sizes; over the real map background where relevant) and, for anything interactive/
   animated, a **GIF / short screen recording or a before→during→after frame sequence** of the
   whole interaction. Capture via the `chrome-devtools-mcp` or `playwright` skills (screenshot /
   trace) after launching the app with the `/run` skill — or use a screenshot/GIF the user
   provides. Save artifacts to files and pass their **paths** in the agent prompt so the reviewer
   can `Read` (view) them. If you genuinely cannot produce one, say so — the review is degraded.

3. **Dispatch in parallel** (one message, two `Task` calls), passing the screenshot/GIF paths:
   - `hud-ux-reviewer` — **Read the provided screenshots/frames** and review the rendered result
     for information hierarchy, legibility (esp. over map imagery), interaction & state
     (hover/select/loading/empty), accessibility (keyboard, non-color cues, contrast, accessible
     names, reduced motion), and evidentiary honesty of any data viz.
   - `frontend-pre-pr-reviewer` — React/TS correctness behind the UI (hooks, query states, types,
     tsc/ESLint gates) so design feedback isn't built on broken code.

4. **Consolidate** by severity (`[Will Block]` illegible/inaccessible/broken → `[Should Address]`
   → `[Nit]`), each with a concrete, implementable fix.

5. **Recommend** the single highest-impact fix and whether the change needs an accessibility pass
   (the `chrome-devtools-mcp:a11y-debugging` skill can drive a live audit).

Reports only — does not modify code.

## Related
- `/design-review` — visual design quality / design-system / polish.
- `/3d-view-review` — the 3D map view (geospatial rendering, camera, performance, label legibility).
- `/tech-review` — full technical review across backend + frontend + DB.
