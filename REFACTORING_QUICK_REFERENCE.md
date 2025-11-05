# FlightVisualization3DCesiumFixed.tsx - Quick Reference Guide

## Overview
- **File**: `frontend/src/components/FlightVisualization3DCesiumFixed.tsx`
- **Current Size**: 2,866 lines
- **Suggested Post-Refactor Size**: 600-700 lines
- **Extraction Potential**: 2,100+ lines of reusable code

## At-a-Glance Section Breakdown

| Section | Lines | Complexity | Module(s) | Priority |
|---------|-------|-----------|-----------|----------|
| Utility Functions | 27-100 | Low | utils/* | Phase 3 |
| Cesium Script Loading | 337-372 | Low | `cesiumLoader.ts` | Phase 1 |
| Viewer Initialization | 376-419 | Medium | `cesiumViewerFactory.ts` | Phase 1 |
| Tileset Loading | 421-445 | Medium | `tilesetLoader.ts` | Phase 1 |
| Village Data Loader | 447-481 | Low | `villageDataLoader.ts` | Phase 2 |
| Label Data Config | 484-575 | Low | `phoenixLabelsConfig.ts` | Phase 3 |
| Geo Calculation Helpers | 582-598 | Medium | `geoCalculations.ts` | Phase 1 |
| Label Decluttering | 601-683 | HIGH | `labelDecluttering.ts` | Phase 1 |
| Label Tier Filtering | 685-693 | Low | `labelFiltering.ts` | Phase 2 |
| View Frustum Culling | 702-755 | Medium | `labelViewportFilter.ts` | Phase 2 |
| Label Selection Logic | 756-797 | Medium | `labelSelection.ts` | Phase 2 |
| Label Creation/Rendering | 808-887 | Medium | `labelRenderer.ts` | Phase 2 |
| Flight Data Transform | 892-910 | Low | `flightDataTransform.ts` | Phase 3 |
| Search Radius Calculations | 224-263 | Medium | `searchRadiusCalculations.ts` | Phase 2 |
| Closest Point Finding | 265-303 | Low | `searchRadiusCalculations.ts` | Phase 2 |
| Animation Start Handler | 2032-2100 | Medium | `animationController.ts` | Phase 2 |
| **Camera Update Loop** | **2101-2360** | **HIGH** | `cameraAnimationLoop.ts` | **Phase 2** |
| Dynamic Label Regeneration | 2254-2360 | High | `dynamicLabelUpdater.ts` | Phase 2 |
| HUD Data Calculation | 2362-2430+ | Medium | `hudCalculator.ts` | Phase 2 |
| Animation Stop Handler | 2456-2480 | Low | `animationController.ts` | Phase 2 |
| Slider/Playback Controls | 2504-2553 | Low | `playbackController.ts` | Phase 3 |
| Jump to Closest | 2555-2560 | Low | `playbackController.ts` | Phase 3 |
| Error State UI | 2562-2571 | Low | Keep in component | Phase 3 |
| Loading State | 2573-2588 | Low | Keep in component | Phase 3 |
| Flight HUD Overlay | 2589-2606 | Low | Keep in component | Phase 3 |
| Surveillance Alert | 2608-2619 | Low | `SurveillanceRadiusAlert.tsx` | Phase 3 |
| Minimap Integration | 2641-2663 | Low | Keep in component | Phase 3 |
| **Timeline Slider UI** | **2666-2827** | **Medium** | `FlightTimeline.tsx` | **Phase 3** |
| Radio Audio UI | 2829-2851 | Low | Keep in component | Phase 3 |
| CAD Activity UI | 2853-2859 | Low | Keep in component | Phase 3 |

## Extraction Sequence

### Phase 1: Foundation Services (Medium effort, enables everything else)
1. `cesiumLoader.ts` - Load Cesium.js from CDN
2. `cesiumViewerFactory.ts` - Create and configure viewer
3. `geoCalculations.ts` - Distance and altitude math
4. `labelDecluttering.ts` - Smart label culling algorithm

### Phase 2: Core Animation & Labels (High effort, high impact)
5. `tilesetLoader.ts` - Load 3D buildings
6. `villageDataLoader.ts` - Load village GeoJSON
7. `labelViewportFilter.ts` - Viewport-aware label filtering
8. `labelRenderer.ts` - Create label entities
9. `labelSelection.ts` - Priority-based label selection
10. `searchRadiusCalculations.ts` - Radius calculations
11. `animationController.ts` - Start/stop animation
12. **`cameraAnimationLoop.ts`** - Main animation loop (MOST COMPLEX)
13. `dynamicLabelUpdater.ts` - Runtime label updates
14. `hudCalculator.ts` - HUD telemetry calculations

### Phase 3: Polish & UI (Lower effort, finishing touches)
15. `playbackController.ts` - Slider handling
16. `FlightTimeline.tsx` - Timeline UI component
17. `SurveillanceRadiusAlert.tsx` - Alert overlay
18. Utility modules (formatTime, getCardinalDirection, etc.)
19. Move label config to `phoenixLabelsConfig.ts`

## Key Challenge Areas

### 1. Camera Animation Loop (Lines 2101-2360)
- **Complexity**: HIGHEST
- **Why**: 250+ lines of nested logic handling:
  - Hover area detection with pitch/speed adjustments
  - Search radius detection with optional slowdown
  - Dynamic label regeneration
  - HUD data calculations
  - All happening every animation frame
- **Solution**: Extract into multiple pure functions:
  - `calculateCameraParameters()` - Determine pitch, speed, heading
  - `updateCameraPosition()` - Apply camera settings
  - `shouldRegenerateLables()` - Check if labels need refresh
  - `updateHUDData()` - Calculate telemetry

### 2. Label Management (Lines 447-890)
- **Complexity**: HIGH
- **Why**: Multiple interdependent systems:
  - Viewport frustum culling
  - Grid-based spatial decluttering
  - Tier-based distance filtering
  - Priority selection
  - Entity creation
- **Solution**: Extract in order:
  1. `labelDecluttering.ts` (pure logic, testable)
  2. `labelViewportFilter.ts` (Cesium-dependent)
  3. `labelSelection.ts` (pure logic)
  4. `labelRenderer.ts` (Cesium entity creation)

### 3. State Management
- **Complexity**: MEDIUM
- **Issue**: 15+ useState hooks managing 5 different concerns
- **Solution**: Group related state or create custom hooks:
  - `useAnimationState()` - isAnimating, animationRef, etc.
  - `useLoadingState()` - isLoading, error, tilesReady, etc.
  - `useCameraState()` - cameraPitchMode, lookDownView, etc.
  - `usePlaybackState()` - sliderPosition, closestPointIndex, etc.

## Critical Dependencies to Watch

### Cesium Global References
Multiple functions access `window.Cesium` and `(window as any).cesiumViewer`:
- Create Cesium service wrapper to centralize access
- Consider lazy loading Cesium utilities

### Hardcoded Values (Magic Numbers)
- **Line 385**: Cesium Ion token - Move to env vars
- **Line 646-653**: Min distances between labels - Extract to constants
- **Line 687-692**: Altitude thresholds - Extract to constants
- **Line 814-863**: Tier-specific styling - Extract to config

### Cross-Module Communication
Several modules need to share data:
- Label configuration data
- Position/time information
- Camera state
- Consider context API or prop drilling pattern

## Testing Strategy After Refactoring

**Priority 1** (Critical for correctness):
- `geoCalculations.ts` - Distance formulas must be accurate
- `labelDecluttering.ts` - Grid-based culling logic
- `searchRadiusCalculations.ts` - Affects legal analysis

**Priority 2** (Important for features):
- `hudCalculator.ts` - Telemetry calculations
- `cameraAnimationLoop.ts` - Core animation behavior
- `labelSelection.ts` - Label priority logic

**Priority 3** (Nice to have):
- `cesiumViewerFactory.ts` - Configuration logic
- `playbackController.ts` - Slider interaction
- UI components - Presentation logic

## Files to Create Checklist

### Utils (3 new files)
- [ ] `utils/cesiumLoader.ts`
- [ ] `utils/geoCalculations.ts`
- [ ] `utils/labelDecluttering.ts`
- [ ] `utils/labelFiltering.ts`
- [ ] `utils/labelSelection.ts`
- [ ] `utils/searchRadiusCalculations.ts`
- [ ] `utils/flightDataTransform.ts`

### Services (7 new files)
- [ ] `services/cesiumViewerFactory.ts`
- [ ] `services/tilesetLoader.ts`
- [ ] `services/villageDataLoader.ts`
- [ ] `services/labelViewportFilter.ts`
- [ ] `services/labelRenderer.ts`
- [ ] `services/animationController.ts`
- [ ] `services/cameraAnimationLoop.ts` (LARGEST)
- [ ] `services/dynamicLabelUpdater.ts`
- [ ] `services/hudCalculator.ts`
- [ ] `services/playbackController.ts`

### Components (2 new files)
- [ ] `components/FlightTimeline.tsx`
- [ ] `components/SurveillanceRadiusAlert.tsx`

### Data (1 new file)
- [ ] `data/phoenixLabelsConfig.ts`

## Success Criteria

After refactoring:
- [ ] Main component file < 700 lines
- [ ] No function > 50 lines (except animation loop intermediates)
- [ ] Utilities are independently testable
- [ ] Services clearly separate concerns
- [ ] All tests pass (existing + new)
- [ ] No regression in functionality
- [ ] Animation performance maintained
- [ ] Memory usage not increased
