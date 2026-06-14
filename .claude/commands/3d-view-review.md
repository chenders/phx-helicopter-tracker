# 3D View Review

Focused review of the **3D map view** — the geospatial 3D scene (Google 3D Tiles / map terrain,
flight tracks, altitude extrusion, ground/street labels, camera). Covers concerns the flat-UI
commands don't: 3D rendering correctness, camera/navigation, performance (frame rate), depth/
occlusion, label legibility in 3D, and the evidentiary honesty of a 3D depiction.

## Arguments

- `$ARGUMENTS` — optional diff range (default `dev...HEAD`) or path to the 3D components.

## Instructions

1. **Scope** the 3D code: `git diff <range> -- 'frontend/**'` filtered to the 3D view (map/globe/
   tiles/three/deck/cesium/webgl components, camera, label-placement, altitude/extrusion logic,
   `VITE_GOOGLE_TILES_API_KEY` usage). If the 3D view isn't touched, say so and stop.

2. **Dispatch in parallel** (one message, two `Task` calls):
   - `hud-ux-reviewer` — 3D-specific design/legibility: are ground/street labels readable against
     3D terrain at varying camera angles (occlusion, depth fighting, declutter); is altitude
     encoded legibly (extrusion height vs color); legend/units; is uncertainty shown (don't draw a
     crisp solid track across a data gap or imply altitude precision the data lacks); sensible
     default camera and reset.
   - `frontend-pre-pr-reviewer` — rendering correctness & performance: WebGL/tiles lifecycle and
     cleanup (no context leaks), re-render/animation-loop efficiency, tile/LOD loading, large
     `flight_positions` rendered without choking the frame rate, loading/empty/error states for
     the scene.

3. **Performance note:** if a running app is available, the `chrome-devtools-mcp` performance
   tools (`performance_start_trace` / analyze) can measure frame rate and long tasks on the 3D
   view — recommend that for any change that adds geometry or animation.

4. **Consolidate** by severity (`[Will Block]` = unreadable / broken / janky-to-unusable / WebGL
   leak → `[Should Address]` → `[Nit]`) with concrete fixes.

5. **Recommend** the highest-impact fix and whether a live performance trace is warranted.

Reports only.

## Related
- `/ui-ux-review`, `/design-review` — flat UI.
- `/tech-review` — full technical review.
