# Label Altitude Fix - Testing Guide

## Background

This document describes how to test the fix for the label altitude bug where 3D street labels were created using the wrong camera altitude.

### The Bug

**Problem:** Labels were created during Cesium initialization when the camera was at its default "home" position (space altitude ~52.6 million feet) instead of the helicopter's actual starting altitude (~1,550 feet).

**Symptoms:**
- Labels were invisible or appeared as tiny dots
- Labels clustered at the horizon
- Console logs showed `Camera alt: 52638769ft`

**Root Cause:**
1. Cesium viewer initialized → camera at default position (52.6M feet)
2. Label creation code called `getCameraAltitudeFeet()` → captured 52.6M feet
3. Camera moved to helicopter position (1,550 feet)
4. Labels remained at wrong scale

### The Fix

**Changes Made:**
1. **Line 698:** Changed from `getCameraAltitudeFeet()` to use `positions[0]?.altitude_feet`
2. **Lines 2055-2060:** Disabled camera controls during animation to prevent altitude changes
3. **Lines 2351-2356:** Re-enabled camera controls when animation stops

**Files Modified:**
- `frontend/src/components/FlightVisualization3DCesiumFixed.tsx`

## Manual Testing Instructions

### Prerequisites
- Backend and frontend servers running
- At least one flight with position data in the database
- Browser developer console open

### Test 1: Verify Label Altitude on Initialization

1. Navigate to any flight detail page (e.g., `/flights/736`)
2. Open browser developer console
3. Look for the log message containing `Camera alt:`
4. **Expected:** Altitude should be between 500-10,000 feet (e.g., `Camera alt: 1550ft`)
5. **Failure:** If altitude is > 50 million feet, the bug has regressed

**Console output to look for:**
```
Before decluttering: 2 areas, 15 streets from 90 in viewport. Camera alt: 1550ft
```

### Test 2: Verify Labels are Visible

1. After page loads, observe the 3D view
2. Look for cyan/holographic text labels floating above streets
3. **Expected:** You should see 10-15 street/area labels clearly visible
4. **Failure:** If no labels visible or all clustered at horizon, bug has regressed

**What to look for:**
- Labels like "I-10", "Camelback Rd", "Downtown Phoenix"
- Labels positioned above their actual street/area locations
- Labels readable from helicopter perspective

### Test 3: Verify Camera Controls Disabled During Animation

1. Click the Play button to start animation
2. Check console for message: `Camera controls disabled for first-person animation mode`
3. Try to zoom in/out with mouse wheel
4. **Expected:** Camera should not zoom; stays locked to helicopter position
5. **Failure:** If camera zooms freely, controls not disabled properly

**Console output to look for:**
```
Camera controls disabled for first-person animation mode
```

### Test 4: Verify Camera Controls Re-enabled After Animation

1. Click Pause button to stop animation
2. Check console for message: `Camera controls re-enabled`
3. Try to zoom in/out with mouse wheel
4. **Expected:** Camera should zoom freely now
5. **Failure:** If camera doesn't respond, controls not re-enabled

**Console output to look for:**
```
Camera controls re-enabled
```

### Test 5: Verify No Extreme Altitudes During Session

1. Open console and monitor camera altitude logs
2. Start and stop animation multiple times
3. Scroll/interact with the 3D view
4. **Expected:** Camera altitude should stay within 100ft - 100,000ft
5. **Failure:** If altitude ever exceeds 1 million feet, there's a regression

**How to check current altitude:**
```javascript
// In browser console:
const viewer = window.cesiumViewer;
const pos = viewer.camera.positionCartographic;
const altitudeFeet = pos.height * 3.28084;
console.log(`Current altitude: ${altitudeFeet.toFixed(0)}ft`);
```

### Test 6: Verify Labels Scale Appropriately

1. Start animation
2. As helicopter flies, observe label behavior
3. **Expected:**
   - Labels fade in/out based on distance
   - Major streets always visible within ~3 miles
   - No sudden appearance/disappearance
4. **Failure:** If labels pop in/out abruptly or are invisible, positioning is wrong

## Automated Test Execution

### Running the Playwright Tests

1. Ensure backend and frontend are running:
   ```bash
   cd /home/phx/phx-helicopter-tracker
   docker compose up -d
   cd frontend
   npm run dev
   ```

2. In a separate terminal, run the tests:
   ```bash
   cd /home/phx/phx-helicopter-tracker/frontend
   npx playwright test test-label-altitude.spec.ts
   ```

3. View test results in the generated HTML report

### Test Coverage

The automated tests verify:
- ✅ Labels created with helicopter altitude (not camera altitude)
- ✅ Camera controls disabled during animation
- ✅ Visible street labels present during animation
- ✅ No extreme camera altitudes reached
- ✅ Correct altitude logged on initialization
- ✅ Camera control enable/disable messages logged

## Troubleshooting

### Labels Still Not Visible

**Check:**
1. Browser console for errors
2. Altitude value in "Before decluttering" log
3. Whether `positions[0]?.altitude_feet` is defined
4. If Cesium is fully initialized before label creation

### Camera Altitude Still Extreme

**Check:**
1. If `getCameraAltitudeFeet()` is still being called instead of using `positions[0]`
2. If camera controls are actually being disabled (check console logs)
3. If there's user interaction enabling camera movement

### Labels Created But Wrong Scale

**Check:**
1. The `baseHeight` values for each tier (lines 806-854)
2. If `initialAltitude` variable is being set correctly
3. Console log showing what altitude was used for creation

## Regression Prevention

To prevent this bug from reoccurring:

1. **Always use helicopter altitude for label creation:** Never call `getCameraAltitudeFeet()` during initialization
2. **Lock camera during animation:** Keep `screenSpaceCameraController` disabled during first-person mode
3. **Monitor console logs:** The "Camera alt:" log should always show reasonable values
4. **Run automated tests:** Execute `test-label-altitude.spec.ts` before major releases

## Key Code Sections

### Label Creation (Line 698)
```typescript
// CORRECT:
const helicopterStartAltitude = Math.max(positions[0]?.altitude_feet || 1550, 1000);
const initialAltitude = helicopterStartAltitude;

// WRONG (original bug):
const initialAltitude = getCameraAltitudeFeet(); // Returns 52M feet at init!
```

### Camera Control Disable (Lines 2055-2060)
```typescript
// During animation:
viewer.scene.screenSpaceCameraController.enableRotate = false;
viewer.scene.screenSpaceCameraController.enableZoom = false;
viewer.scene.screenSpaceCameraController.enableLook = false;
viewer.scene.screenSpaceCameraController.enableTilt = false;
viewer.scene.screenSpaceCameraController.enableTranslate = false;
```

### Camera Control Re-enable (Lines 2351-2356)
```typescript
// When animation stops:
viewer.scene.screenSpaceCameraController.enableRotate = true;
viewer.scene.screenSpaceCameraController.enableZoom = true;
viewer.scene.screenSpaceCameraController.enableLook = true;
viewer.scene.screenSpaceCameraController.enableTilt = true;
viewer.scene.screenSpaceCameraController.enableTranslate = true;
```

## Success Criteria

The fix is working correctly if:
- ✅ Console shows reasonable altitude (500-10,000ft) on initialization
- ✅ Street labels are visible and readable in 3D view
- ✅ Camera cannot be zoomed during animation
- ✅ Camera works normally when animation is paused
- ✅ Labels fade in/out smoothly based on distance
- ✅ No extreme altitudes (>1M feet) appear in console logs
