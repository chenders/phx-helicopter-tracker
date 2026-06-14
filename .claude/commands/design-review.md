# Design Review

Visual-design-quality review of changed UI: hierarchy, typography, spacing, color, consistency
with the existing design language, and overall polish in the tactical-map / aviation-HUD idiom
this project uses. Narrower than `/ui-ux-review` (which also covers interaction + accessibility)
and distinct from `/3d-view-review` (the 3D map specifically).

## Arguments

- `$ARGUMENTS` — optional diff range (default `dev...HEAD`), screen name, or path.

## Instructions

1. **Scope** the changed visual surface: `git diff <range> -- 'frontend/**'` (components, styles,
   Tailwind classes, theme).

2. **Capture the RENDERED screens first.** Visual quality cannot be judged from CSS/JSX — get a
   **real browser screenshot** of each affected screen (over the real map background where
   relevant; a couple of viewport sizes). Capture via the `chrome-devtools-mcp` / `playwright`
   skills after launching with `/run`, or use a screenshot the user provides. Save to files and
   pass the **paths** to the agent so it can `Read`/view them. No screenshot → say the review is
   degraded and ask for one.

3. **Dispatch `hud-ux-reviewer`** (passing the screenshot paths; it must `Read` them) with a
   *visual-design* focus:
   - Hierarchy & emphasis: is the primary datum visually dominant; do secondary elements recede?
   - Typography & spacing: scale, rhythm, alignment, density appropriate for a data-dense HUD.
   - Color & contrast: palette consistency, colorblind-safe encodings, legibility over imagery.
   - Consistency: matches existing components/patterns/spacing tokens — no one-off styles.
   - Polish: avoids generic/unconsidered defaults; cohesive with the surveillance-dashboard look.

   For new or substantially redesigned screens, also consult the **`frontend-design`** skill to
   propose a higher-quality design rather than only critiquing.

4. **Consolidate** findings (`[Should Address]` / `[Nit]` — design is rarely `[Will Block]` unless
   it breaks legibility) with concrete fixes (specific tokens/values, not vibes).

5. **Recommend** the top 1–3 changes that most raise visual quality.

Reports only.

## Related
- `/ui-ux-review` — adds interaction + accessibility + correctness.
- `/3d-view-review` — the 3D map view.
