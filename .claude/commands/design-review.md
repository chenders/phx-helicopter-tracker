# Design Review

Visual-design-quality review of changed UI: hierarchy, typography, spacing, color, consistency
with the existing design language, and overall polish in the tactical-map / aviation-HUD idiom
this project uses. Narrower than `/ui-ux-review` (which also covers interaction + accessibility)
and distinct from `/3d-view-review` (the 3D map specifically).

## Arguments

- `$ARGUMENTS` — optional diff range (default `dev...HEAD`), screen name, or path.

## Instructions

1. **Scope** the changed visual surface: `git diff <range> -- 'frontend/**'` (components, styles,
   Tailwind classes, theme). Use a screenshot/running app if available.

2. **Dispatch `hud-ux-reviewer`** with a *visual-design* focus:
   - Hierarchy & emphasis: is the primary datum visually dominant; do secondary elements recede?
   - Typography & spacing: scale, rhythm, alignment, density appropriate for a data-dense HUD.
   - Color & contrast: palette consistency, colorblind-safe encodings, legibility over imagery.
   - Consistency: matches existing components/patterns/spacing tokens — no one-off styles.
   - Polish: avoids generic/unconsidered defaults; cohesive with the surveillance-dashboard look.

   For new or substantially redesigned screens, also consult the **`frontend-design`** skill to
   propose a higher-quality design rather than only critiquing.

3. **Consolidate** findings (`[Should Address]` / `[Nit]` — design is rarely `[Will Block]` unless
   it breaks legibility) with concrete fixes (specific tokens/values, not vibes).

4. **Recommend** the top 1–3 changes that most raise visual quality.

Reports only.

## Related
- `/ui-ux-review` — adds interaction + accessibility + correctness.
- `/3d-view-review` — the 3D map view.
