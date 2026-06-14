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

2. **Capture the RENDERED 3D scene first (essential here).** A 3D view *cannot* be reviewed from
   code — occlusion, depth-fighting, label declutter, and jank only appear on screen, and they
   change with the camera. Capture: **browser screenshots** at several camera angles/zoom levels
   (top-down, oblique, ground-level near a track), **and a GIF / short screen recording of a
   camera orbit + a track/flight selection** so the reviewer sees label behavior and smoothness
   through the motion. Use the `chrome-devtools-mcp` / `playwright` skills (screenshot + perf
   trace) after launching with `/run`, or a capture the user provides. Save to files; pass the
   **paths** to the agents (they `Read`/view them). No capture → say so; a 3D review from code
   alone is not reliable.

3. **Dispatch in parallel** (one message, two `Task` calls), passing the screenshot/GIF paths:
   - `hud-ux-reviewer` — **Read the captures** and review 3D-specific design/legibility: are
     ground/street labels readable against 3D terrain at varying camera angles (occlusion, depth
     fighting, declutter); is altitude encoded legibly (extrusion height vs color); legend/units;
     is uncertainty shown (don't draw a crisp solid track across a data gap or imply altitude
     precision the data lacks); sensible default camera and reset.
   - `frontend-pre-pr-reviewer` — rendering correctness & performance: WebGL/tiles lifecycle and
     cleanup (no context leaks), re-render/animation-loop efficiency, tile/LOD loading, large
     `flight_positions` rendered without choking the frame rate, loading/empty/error states for
     the scene.

4. **Performance note:** if a running app is available, the `chrome-devtools-mcp` performance
   tools (`performance_start_trace` / analyze) can measure frame rate and long tasks on the 3D
   view — recommend that for any change that adds geometry or animation.

5. **Consolidate** by severity (`[Will Block]` = unreadable / broken / janky-to-unusable / WebGL
   leak → `[Should Address]` → `[Nit]`) with concrete fixes.

6. **Recommend** the highest-impact fix and whether a live performance trace is warranted.

Reports only.

## Related
- `/ui-ux-review`, `/design-review` — flat UI.
- `/tech-review` — full technical review.
