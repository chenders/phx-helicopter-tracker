# Code Extraction Examples - FlightVisualization3DCesiumFixed.tsx

This document shows what code should be extracted from the main component into separate modules, with example structure.

## 1. cesiumLoader.ts

**Extract from**: Lines 337-372

```typescript
// frontend/src/utils/cesiumLoader.ts

/**
 * Loads Cesium.js library from CDN
 */
export const loadCesiumFromCDN = async (): Promise<void> => {
  if (window.Cesium) {
    return; // Already loaded
  }

  // Add Cesium CSS
  if (!document.getElementById("cesium-css")) {
    const cesiumCSS = document.createElement("link");
    cesiumCSS.id = "cesium-css";
    cesiumCSS.rel = "stylesheet";
    cesiumCSS.href =
      "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Widgets/widgets.css";
    document.head.appendChild(cesiumCSS);
  }

  // Load Cesium JS
  await new Promise<void>((resolve, reject) => {
    if (window.Cesium) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Cesium.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cesium"));
    document.head.appendChild(script);
  });

  // Wait for Cesium to be available
  await new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.Cesium) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
};

/**
 * Sets Cesium Ion token and configuration
 */
export const configureCesiumIon = (token: string): void => {
  window.Cesium.Ion.defaultAccessToken = token;
  // @ts-ignore
  window.CESIUM_BASE_URL =
    "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/";
};
```

---

## 2. geoCalculations.ts

**Extract from**: Lines 582-598 and repeated blocks

```typescript
// frontend/src/utils/geoCalculations.ts

/**
 * Calculate distance between two lat/lng points in feet using Haversine formula
 */
export const getDistanceFeet = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 20902231; // Earth radius in feet
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate distance between two lat/lng points in miles
 */
export const getDistanceMiles = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get camera altitude in feet from Cesium viewer
 */
export const getCameraAltitudeFeet = (viewer: any): number => {
  if (!viewer || !viewer.camera) return 5000;
  const cameraPosition = viewer.camera.positionCartographic;
  return cameraPosition.height * 3.28084; // Convert meters to feet
};

/**
 * Convert heading degrees to Cesium radians
 */
export const headingDegreesToRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Convert altitude feet to Cesium meters
 */
export const altitudeFeetToMeters = (feet: number): number => {
  return feet * 0.3048;
};
```

---

## 3. labelDecluttering.ts

**Extract from**: Lines 601-683

```typescript
// frontend/src/utils/labelDecluttering.ts

export interface LabelWithDistance {
  name: string;
  lat: number;
  lng: number;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  distance?: number;
}

/**
 * Grid-based spatial decluttering with distance-based culling
 * Removes labels that are too close together
 */
export const declutterLabels = (
  labels: LabelWithDistance[],
  gridSize: number = 0.01 // 0.01 degrees ~= 0.7 miles
): LabelWithDistance[] => {
  // Step 1: Grid-based spatial grouping
  const grid = new Map<string, LabelWithDistance[]>();

  labels.forEach((label) => {
    const cellLat = Math.floor(label.lat / gridSize) * gridSize;
    const cellLng = Math.floor(label.lng / gridSize) * gridSize;
    const cellKey = `${cellLat},${cellLng}`;

    if (!grid.has(cellKey)) {
      grid.set(cellKey, []);
    }
    grid.get(cellKey)!.push(label);
  });

  // Step 2: Per-cell tier-based selection
  const tierLimits: Record<number, number> = {
    0: 1, // Max 1 area label per cell
    1: 1, // Max 1 freeway label per cell
    2: 1, // Max 1 major arterial per cell
    3: 2, // Max 2 major streets per cell
    4: 1, // Max 1 secondary street per cell
    5: 1, // Max 1 minor street per cell
  };

  const cellFiltered: LabelWithDistance[] = [];
  grid.forEach((cellLabels) => {
    cellLabels.sort((a, b) => a.tier - b.tier); // Sort by tier (priority)
    const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    cellLabels.forEach((label) => {
      if (tierCounts[label.tier] < tierLimits[label.tier]) {
        cellFiltered.push(label);
        tierCounts[label.tier]++;
      }
    });
  });

  // Step 3: Distance-based culling
  const minDistanceFeet: Record<number, number> = {
    0: 8000,  // Area labels must be 1.5+ miles apart
    1: 10000, // Freeways must be 2+ miles apart
    2: 5000,  // Major arterials 1 mile apart
    3: 3000,  // Major streets 0.6 miles apart
    4: 2000,  // Secondary streets 0.4 miles apart
    5: 1500,  // Minor streets 0.3 miles apart
  };

  const finalResult: LabelWithDistance[] = [];
  cellFiltered.forEach((label) => {
    let tooClose = false;

    for (const existing of finalResult) {
      const distance = getDistanceFeet(label.lat, label.lng, existing.lat, existing.lng);
      const minDist = Math.max(
        minDistanceFeet[label.tier] || 2000,
        minDistanceFeet[existing.tier] || 2000
      );

      if (distance < minDist) {
        // If lower tier (more important), replace the existing one
        if (label.tier < existing.tier) {
          finalResult.splice(finalResult.indexOf(existing), 1);
          break;
        } else {
          tooClose = true;
          break;
        }
      }
    }

    if (!tooClose) {
      finalResult.push(label);
    }
  });

  return finalResult;
};

// Import from geoCalculations
import { getDistanceFeet } from './geoCalculations';
```

---

## 4. searchRadiusCalculations.ts

**Extract from**: Lines 224-303

```typescript
// frontend/src/utils/searchRadiusCalculations.ts

import { getDistanceMiles } from './geoCalculations';

export interface SearchContext {
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface FlightPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  [key: string]: any;
}

/**
 * Calculate total time helicopter spent within search radius
 */
export const calculateTimeInSearchRadius = (
  positions: FlightPosition[],
  searchContext: SearchContext | undefined
): number => {
  if (!searchContext || positions.length === 0) {
    return 0;
  }

  const searchRadiusMiles = searchContext.radius / 1609.34; // Convert meters to miles
  let timeInRadius = 0;
  let prevTimestamp: Date | null = null;

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const distanceInMiles = getDistanceMiles(
      searchContext.lat,
      searchContext.lng,
      pos.latitude,
      pos.longitude
    );

    if (distanceInMiles <= searchRadiusMiles) {
      if (prevTimestamp) {
        const currentTimestamp = new Date(pos.timestamp);
        const timeDiff = (currentTimestamp.getTime() - prevTimestamp.getTime()) / 1000; // seconds
        timeInRadius += timeDiff;
      }
      prevTimestamp = new Date(pos.timestamp);
    } else {
      prevTimestamp = null; // Reset when out of radius
    }
  }

  return timeInRadius;
};

/**
 * Find position closest to search location
 */
export const findClosestPointIndex = (
  positions: FlightPosition[],
  searchContext: SearchContext | undefined
): number | null => {
  if (!searchContext || positions.length === 0) {
    return null;
  }

  let minDistance = Infinity;
  let closestIdx = -1;

  positions.forEach((pos, idx) => {
    const latDiff = pos.latitude - searchContext.lat;
    const lngDiff = pos.longitude - searchContext.lng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff); // Simple Euclidean

    if (distance < minDistance) {
      minDistance = distance;
      closestIdx = idx;
    }
  });

  return closestIdx >= 0 ? closestIdx : null;
};

/**
 * Check if position is within search radius
 */
export const isWithinSearchRadius = (
  position: FlightPosition,
  searchContext: SearchContext | undefined
): boolean => {
  if (!searchContext) return false;

  const searchRadiusMiles = searchContext.radius / 1609.34;
  const distanceMiles = getDistanceMiles(
    searchContext.lat,
    searchContext.lng,
    position.latitude,
    position.longitude
  );

  return distanceMiles <= searchRadiusMiles;
};

/**
 * Calculate distance from position to search center
 */
export const distanceFromSearchCenter = (
  position: FlightPosition,
  searchContext: SearchContext | undefined
): number => {
  if (!searchContext) return 0;

  return getDistanceMiles(
    searchContext.lat,
    searchContext.lng,
    position.latitude,
    position.longitude
  );
};
```

---

## 5. cameraAnimationLoop.ts

**Extract from**: Lines 2101-2360 (The most complex section)

```typescript
// frontend/src/services/cameraAnimationLoop.ts

import { getDistanceMiles } from '../utils/geoCalculations';
import { FlightPosition, SearchContext } from '../utils/searchRadiusCalculations';

export interface HoverLocation {
  latitude: number;
  longitude: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
}

export interface CameraParameters {
  pitch: number; // in radians
  speed: number; // multiplier
  heading: number; // in radians
}

/**
 * Determine camera pitch, speed, and heading based on current position
 */
export const calculateCameraParameters = (
  currentPositionIndex: number,
  positions: FlightPosition[],
  hoverLocations: HoverLocation[],
  searchContext: SearchContext | undefined,
  cameraPitchMode: 'auto' | 'level' | 'moderate' | 'steep',
  enableSlowdownInRadius: boolean,
  lookDownView: boolean,
  hpr: any, // Cesium HeadingPitchRoll
  playbackSpeed: number,
  Cesium: any
): CameraParameters => {
  let cameraPitch = Cesium.Math.toRadians(-5); // Default: mostly level
  let speed = playbackSpeed * 50; // Normal speed multiplier
  let heading = hpr.heading;

  const currentPos = positions[currentPositionIndex];
  const currentPosTime = new Date(currentPos.timestamp).getTime();

  // Handle manual camera pitch modes
  if (cameraPitchMode === 'level') {
    cameraPitch = Cesium.Math.toRadians(-5);
  } else if (cameraPitchMode === 'moderate') {
    cameraPitch = Cesium.Math.toRadians(-40);
  } else if (cameraPitchMode === 'steep') {
    cameraPitch = Cesium.Math.toRadians(-50);
  }

  // Auto mode: detect hover areas first
  if (cameraPitchMode === 'auto' && hoverLocations.length > 0) {
    for (const hoverLoc of hoverLocations) {
      const hoverStartTime = new Date(hoverLoc.start_time).getTime();
      const hoverEndTime = new Date(hoverLoc.end_time).getTime();

      if (currentPosTime >= hoverStartTime && currentPosTime <= hoverEndTime) {
        cameraPitch = Cesium.Math.toRadians(-70); // Bird's eye view
        speed = playbackSpeed * 10; // Slow to 10x in hover area
        
        // Could set locked heading here
        return { pitch: cameraPitch, speed, heading };
      }
    }
  }

  // Auto mode: detect search radius second
  if (cameraPitchMode === 'auto' && searchContext && enableSlowdownInRadius) {
    const distanceMiles = getDistanceMiles(
      searchContext.lat,
      searchContext.lng,
      currentPos.latitude,
      currentPos.longitude
    );
    const searchRadiusMiles = searchContext.radius / 1609.34;

    if (distanceMiles <= searchRadiusMiles) {
      cameraPitch = Cesium.Math.toRadians(-40);
      speed = (playbackSpeed * 50) / 10; // Slow to 1/10th speed
    }
  }

  // Override with look-down view if enabled
  if (lookDownView) {
    cameraPitch = Cesium.Math.toRadians(-75);
  }

  return { pitch: cameraPitch, speed, heading };
};

/**
 * Calculate HUD telemetry data for current animation frame
 */
export const calculateHUDData = (
  currentPositionIndex: number,
  positions: FlightPosition[],
  searchContext: SearchContext | undefined,
  Cesium: any,
  hpr: any
): Record<string, any> => {
  const currentPos = positions[currentPositionIndex];
  
  const speed = (currentPos.ground_speed_knots || 0) * 1.15078; // knots to mph
  const altitude = currentPos.altitude_feet || 0;
  const heading = Cesium.Math.toDegrees(hpr.heading);
  const groundElevation = currentPos.ground_elevation_feet || 0;
  const altitudeAGL = currentPos.altitude_agl_feet || (altitude - groundElevation);

  let distanceFromSearch = 0;
  let timeToSearchRadius = 0;
  let withinRadius = false;

  if (searchContext) {
    distanceFromSearch = getDistanceMiles(
      searchContext.lat,
      searchContext.lng,
      currentPos.latitude,
      currentPos.longitude
    );

    const searchRadiusMiles = searchContext.radius / 1609.34;
    withinRadius = distanceFromSearch <= searchRadiusMiles;

    // Look-ahead: find when we enter search radius
    if (!withinRadius) {
      for (let i = currentPositionIndex + 1; i < positions.length; i++) {
        const futurePos = positions[i];
        const futureDistance = getDistanceMiles(
          searchContext.lat,
          searchContext.lng,
          futurePos.latitude,
          futurePos.longitude
        );

        if (futureDistance <= searchRadiusMiles) {
          timeToSearchRadius = (i - currentPositionIndex) * 5; // 5 seconds per position
          break;
        }
      }
    }
  }

  return {
    speed,
    altitude,
    heading,
    groundElevation,
    altitudeAGL,
    distanceFromSearch,
    timeToSearchRadius,
    isWithinSearchRadius: withinRadius,
  };
};
```

---

## 6. hudCalculator.ts

**Extract from**: Lines 2362-2430+

```typescript
// frontend/src/services/hudCalculator.ts

import { calculateHUDData } from './cameraAnimationLoop';

export interface HUDData {
  speed: number;
  altitude: number;
  heading: number;
  groundElevation: number;
  altitudeAGL: number;
  distanceFromSearch: number;
  timeRemaining: number;
  timeToSearchRadius: number;
  isWithinSearchRadius: boolean;
}

/**
 * Wraps HUD calculation with time remaining calculation
 */
export const updateHUDData = (
  currentPositionIndex: number,
  positions: any[],
  searchContext: any,
  timeRemaining: number,
  Cesium: any,
  hpr: any
): HUDData => {
  const hudData = calculateHUDData(
    currentPositionIndex,
    positions,
    searchContext,
    Cesium,
    hpr
  );

  return {
    ...hudData,
    timeRemaining,
  };
};
```

---

## Summary: Module Organization

| Module | Purpose | Lines | Complexity |
|--------|---------|-------|-----------|
| `cesiumLoader.ts` | Load & configure Cesium | 30 | Low |
| `geoCalculations.ts` | Distance & altitude math | 40 | Medium |
| `labelDecluttering.ts` | Smart label culling | 80 | High |
| `searchRadiusCalculations.ts` | Radius calculations | 100 | Medium |
| `cameraAnimationLoop.ts` | Camera parameters | 120 | High |
| `hudCalculator.ts` | HUD telemetry | 30 | Low |

Each extracted module:
- Has a single responsibility
- Contains pure functions (mostly)
- Is independently testable
- Reduces main component complexity by ~70%

