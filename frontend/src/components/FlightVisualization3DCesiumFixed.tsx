import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles/slider.css";
import {
  createHolographicBillboard,
  createHolographicBeam,
  HolographicColors,
} from "../utils/holographicMaterials";
import { FlightHUD } from "./FlightHUD";
import { RadioAudioIndicator } from "./RadioAudioIndicator";
import { useRadioArchives } from "../hooks/useRadioArchives";
import { CADActivityPanel } from "./CADActivityPanel";
import { useRadioActivity } from "../hooks/useRadioActivity";
import { StreetLabelList } from "./StreetLabelList";
import { PhoenixMinimap } from "./PhoenixMinimap";
import {
  isMobileDevice,
  formatTime,
  getDistanceFeet,
  knotsToMph,
  metersToFeet,
} from "../utils/flightUtils";
import {
  FlightPosition,
  HudData,
  HoverLocationData,
} from "../types/flight";
import {
  ANIMATION_CONFIG,
} from "../config/cesiumConfig";

declare global {
  interface Window {
    Cesium: any;
  }
}

// Re-export HudData for backward compatibility
export type { HudData } from "../types/flight";

interface FlightVisualization3DCesiumFixedProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  playbackSpeed?: number;
  onStartAnimationRef?: React.MutableRefObject<(() => void) | null>;
  onStopAnimationRef?: React.MutableRefObject<(() => void) | null>;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  onHudDataChange?: (hudData: HudData | null) => void;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
  hoverLocations?: HoverLocationData[];
}

export const FlightVisualization3DCesiumFixed: React.FC<
  FlightVisualization3DCesiumFixedProps
> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  playbackSpeed = ANIMATION_CONFIG.DEFAULT_SPEED,
  onStartAnimationRef,
  onStopAnimationRef,
  onAnimationStateChange,
  onHudDataChange,
  searchContext,
  hoverLocations = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cesiumContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile] = useState(isMobileDevice()); // Detect mobile once on mount
  const animationRef = useRef<any>(null);
  const animationFunctionRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [closestPointIndex, setClosestPointIndex] = useState<number | null>(
    null,
  );
  const [tileLoadingMode, setTileLoadingMode] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [tileLoadProgress, setTileLoadProgress] = useState(0);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [cameraPitchMode, setCameraPitchMode] = useState<'auto' | 'level' | 'moderate' | 'steep'>('auto'); // Camera pitch control
  const cameraPitchModeRef = useRef<'auto' | 'level' | 'moderate' | 'steep'>('auto'); // Ref for accessing in callbacks
  const [enableSlowdownInRadius, setEnableSlowdownInRadius] = useState(true); // Toggle for slow-down in search radius
  const enableSlowdownInRadiusRef = useRef(true); // Ref for accessing in callbacks
  const [lookDownView, setLookDownView] = useState(false); // Toggle for camera looking nearly straight down
  const lookDownViewRef = useRef(false); // Ref for accessing in callbacks
  const [thirdPersonView, setThirdPersonView] = useState(false); // Toggle for 3rd person camera view
  const thirdPersonViewRef = useRef(false); // Ref for accessing in callbacks
  const [hudData, setHudData] = useState({
    speed: 0,
    altitude: 0,
    heading: 0,
    groundElevation: 0,
    altitudeAGL: 0,
    distanceFromSearch: 0,
    timeRemaining: 0,
    timeToSearchRadius: 0,
    isWithinSearchRadius: false,
  });
  const [totalTimeInRadius, setTotalTimeInRadius] = useState(0); // Total time spent in search radius in seconds
  const [cameraPosition, setCameraPosition] = useState<any>(null); // Cesium.Cartesian3 camera position for street labels
  const [nearbyLabels, setNearbyLabels] = useState<Array<{name: string; tier: number; distance: number; type?: 'area' | 'street' | 'highway' | 'landmark'; alwaysShow?: boolean}>>([]);

  // Fetch radio archives for flight time range
  const flightStartTime = positions.length > 0 ? positions[0].timestamp : undefined;
  const flightEndTime = positions.length > 0 ? positions[positions.length - 1].timestamp : undefined;
  const { archives: radioArchives } = useRadioArchives(flightStartTime, flightEndTime, positions.length > 0);

  // Fetch radio activity (CAD calls) for flight time range
  const { segments: radioActivity } = useRadioActivity(flightStartTime, flightEndTime, true, positions.length > 0);

  // Keep camera pitch mode ref in sync with state
  useEffect(() => {
    cameraPitchModeRef.current = cameraPitchMode;
    console.log(`Camera pitch mode changed to: ${cameraPitchMode}`);
  }, [cameraPitchMode]);

  // Keep slow-down ref in sync with state
  useEffect(() => {
    enableSlowdownInRadiusRef.current = enableSlowdownInRadius;
    console.log(`Search radius slow-down: ${enableSlowdownInRadius ? 'enabled' : 'disabled'}`);
  }, [enableSlowdownInRadius]);

  // Keep look-down view ref in sync with state
  useEffect(() => {
    lookDownViewRef.current = lookDownView;
    console.log(`Look-down view: ${lookDownView ? 'enabled' : 'disabled'}`);
  }, [lookDownView]);

  // Keep third-person view ref in sync with state
  useEffect(() => {
    thirdPersonViewRef.current = thirdPersonView;
    console.log(`Third-person view: ${thirdPersonView ? 'enabled' : 'disabled'}`);
  }, [thirdPersonView]);

  // Update HUD data based on slider position (even when not animating)
  useEffect(() => {
    if (positions.length === 0) return;

    const positionIndex = Math.floor((sliderPosition / 100) * (positions.length - 1));
    if (positionIndex < 0 || positionIndex >= positions.length) return;

    const currentPos = positions[positionIndex];

    // Calculate time remaining in flight
    const totalDuration = positions.length * 5; // Approximate 5 seconds per position
    const elapsed = positionIndex * 5;
    const timeRemainingSeconds = totalDuration - elapsed;

    // Calculate distance from search location if available
    let distanceFromSearch = 0;
    let timeToSearchRadius = 0;
    let withinRadius = false;

    if (searchContext) {
      const R = 3959; // Earth's radius in miles
      const lat1 = searchContext.lat * Math.PI / 180;
      const lat2 = currentPos.latitude * Math.PI / 180;
      const dLat = (currentPos.latitude - searchContext.lat) * Math.PI / 180;
      const dLng = (currentPos.longitude - searchContext.lng) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(lat1) * Math.cos(lat2) *
               Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceFromSearch = R * c;

      const searchRadiusMiles = searchContext.radius / 1609.34;
      withinRadius = distanceFromSearch <= searchRadiusMiles;

      // Calculate time to search radius if not already there
      if (!withinRadius) {
        // Look ahead to find when we enter the search radius
        for (let i = positionIndex + 1; i < positions.length; i++) {
          const futurePos = positions[i];
          const futureLat = futurePos.latitude * Math.PI / 180;
          const futureDLat = (futurePos.latitude - searchContext.lat) * Math.PI / 180;
          const futureDLng = (futurePos.longitude - searchContext.lng) * Math.PI / 180;

          const futureA = Math.sin(futureDLat / 2) * Math.sin(futureDLat / 2) +
                         Math.cos(lat1) * Math.cos(futureLat) *
                         Math.sin(futureDLng / 2) * Math.sin(futureDLng / 2);
          const futureC = 2 * Math.atan2(Math.sqrt(futureA), Math.sqrt(1 - futureA));
          const futureDistance = R * futureC;

          if (futureDistance <= searchRadiusMiles) {
            // Found when we enter radius
            timeToSearchRadius = (i - positionIndex) * 5; // 5 seconds per position
            break;
          }
        }
      }
    }

    setHudData({
      speed: knotsToMph(currentPos.ground_speed_knots || 0),
      altitude: currentPos.altitude_feet || 0,
      heading: currentPos.track_degrees || 0,
      groundElevation: currentPos.ground_elevation_feet || 0,
      altitudeAGL: currentPos.altitude_agl_feet || 0,
      distanceFromSearch: distanceFromSearch,
      timeRemaining: timeRemainingSeconds,
      timeToSearchRadius: timeToSearchRadius,
      isWithinSearchRadius: withinRadius,
    });
  }, [sliderPosition, positions, searchContext]);

  // Clean up function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }

    if (viewerRef.current) {
      try {
        if (!viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
      } catch (e) {
        console.warn("Error destroying Cesium viewer:", e);
      }
      viewerRef.current = null;
    }

    // Remove the cesium container entirely
    if (cesiumContainerRef.current && cesiumContainerRef.current.parentNode) {
      cesiumContainerRef.current.parentNode.removeChild(
        cesiumContainerRef.current,
      );
      cesiumContainerRef.current = null;
    }

    // Reset initialization flags
    isInitializingRef.current = false;
    hasInitializedRef.current = false;

    // Reset tile loading state
    setTilesReady(false);
    setTileLoadProgress(0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Calculate total time spent in search radius
  useEffect(() => {
    if (!searchContext || positions.length === 0) {
      setTotalTimeInRadius(0);
      return;
    }

    const searchRadiusMiles = searchContext.radius / 1609.34; // Convert meters to miles
    const R = 3959; // Earth's radius in miles
    let timeInRadius = 0;
    let prevTimestamp: Date | null = null;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const lat1 = searchContext.lat * Math.PI / 180;
      const lat2 = pos.latitude * Math.PI / 180;
      const dLat = (pos.latitude - searchContext.lat) * Math.PI / 180;
      const dLng = (pos.longitude - searchContext.lng) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(lat1) * Math.cos(lat2) *
               Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance <= searchRadiusMiles) {
        if (prevTimestamp) {
          const currentTimestamp = new Date(pos.timestamp);
          const timeDiff = (currentTimestamp.getTime() - prevTimestamp.getTime()) / 1000; // Convert to seconds
          timeInRadius += timeDiff;
        }
        prevTimestamp = new Date(pos.timestamp);
      } else {
        prevTimestamp = null; // Reset when out of radius
      }
    }

    setTotalTimeInRadius(timeInRadius);
    console.log(`Total time in search radius: ${formatTime(timeInRadius)}`);
  }, [searchContext, positions]);

  // Calculate closest point to search location
  useEffect(() => {
    console.log(
      "Calculating closest point. SearchContext:",
      searchContext,
      "Positions length:",
      positions.length,
    );
    if (!searchContext || positions.length === 0) {
      console.log("No search context or positions, clearing closest index");
      setClosestPointIndex(null);
      return;
    }

    let minDistance = Infinity;
    let closestIdx = -1;

    positions.forEach((pos, idx) => {
      const latDiff = pos.latitude - searchContext.lat;
      const lngDiff = pos.longitude - searchContext.lng;
      // Simple Euclidean distance (good enough for small areas)
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    if (closestIdx >= 0) {
      console.log(
        "Found closest point at index:",
        closestIdx,
        "distance:",
        minDistance,
      );
      setClosestPointIndex(closestIdx);
    }
  }, [positions, searchContext]);

  useEffect(() => {
    if (!containerRef.current || positions.length === 0) return;

    // Prevent multiple initializations
    if (isInitializingRef.current || hasInitializedRef.current) {
      console.log(
        "Cesium initialization already in progress or completed, skipping...",
      );
      return;
    }

    const loadCesium = async () => {
      try {
        // Set the initializing flag immediately
        isInitializingRef.current = true;
        console.log("Starting Cesium initialization...");

        setIsLoading(true);
        setError(null);

        // Clean up any existing viewer first
        cleanup();

        // Create a new container for Cesium
        const cesiumContainer = document.createElement("div");
        cesiumContainer.id = "cesiumContainer";
        cesiumContainer.style.width = "100%";
        cesiumContainer.style.height = "100%";
        cesiumContainer.style.position = "relative";
        containerRef.current!.appendChild(cesiumContainer);
        cesiumContainerRef.current = cesiumContainer;

        // Load Cesium from CDN if not already loaded
        if (!window.Cesium) {
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
          await new Promise((resolve, reject) => {
            if (window.Cesium) {
              resolve(true);
              return;
            }
            const script = document.createElement("script");
            script.src =
              "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Cesium.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // Wait for Cesium to be available
          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (window.Cesium) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 100);
          });
        }

        if (!mountedRef.current) return;

        const Cesium = window.Cesium;

        // Suppress the sandboxed iframe warning - must be set before creating viewer
        // @ts-expect-error CESIUM_BASE_URL is a global injected at runtime, not typed on Window
          window.CESIUM_BASE_URL =
          "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/";

        // Cesium Ion access token. Prefer the VITE_CESIUM_API_KEY env var (set
        // per-environment via the gitignored .env, matching the other 3D
        // components); fall back to the previously-committed token so existing
        // deploys keep working. NOTE: that fallback token is already in git
        // history and should be rotated and moved fully to env.
        Cesium.Ion.defaultAccessToken =
          import.meta.env.VITE_CESIUM_API_KEY ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiM2FlZDAyOS00ZjE4LTQ0NjItOTY4ZC0xNzQyNGIzNjhhOTkiLCJpZCI6MzQ2MjQ4LCJpYXQiOjE3NTkzMDkyMjl9.zkS_2D4Y8scZkqmS_lckpl2G_7c8sGaFwMazm26eAT0";

        // Initialize the Cesium Viewer with mobile-optimized settings
        const viewer = new Cesium.Viewer("cesiumContainer", {
          // Use lower quality terrain on mobile, high quality on desktop
          terrain: isMobile ? undefined : Cesium.Terrain.fromWorldTerrain(),
          navigationHelpButton: false,
          animation: false,  // Disable animation widget - we have custom controls
          timeline: false,   // Disable timeline widget - we have custom controls
          fullscreenButton: false,
          vrButton: false,
          // Mobile performance optimizations
          requestRenderMode: isMobile,  // Only render when needed on mobile
          maximumRenderTimeChange: isMobile ? Infinity : 0.0,  // Reduce render frequency on mobile
        });

        // Store viewer globally for debugging and tests
        (window as any).viewer = viewer;

        // Optimize scene appearance for daytime visibility with bright labels
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0001; // Very light fog for atmospheric depth
        viewer.scene.fog.minimumBrightness = 0.8; // Keep things bright

        // Apply mobile-specific scene optimizations
        if (isMobile) {
          console.log("Applying mobile performance optimizations...");
          // Limit frame rate to 30fps on mobile
          viewer.targetFrameRate = 30;
          // Increase screen space error to cull more tiles aggressively
          viewer.scene.globe.maximumScreenSpaceError = 4; // Default is 2
          // Disable shadows for better performance
          viewer.shadows = false;
          // Increase fog density to minimize far rendering on mobile
          viewer.scene.fog.density = 0.0005;
          viewer.scene.fog.minimumBrightness = 0.15;
        }

        // Add 3D Buildings - skip heavy Google tiles on mobile
        if (!isMobile) {
          // Desktop: Use high-quality Google Photorealistic 3D Tiles
          try {
            console.log("Loading Google Photorealistic 3D Tiles (desktop)...");
            const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
            viewer.scene.primitives.add(tileset);
            console.log("Google Photorealistic 3D Tiles loaded successfully");
          } catch (error) {
            console.warn("Failed to load Google 3D Tiles, using OSM buildings:", error);
            // Fallback to OSM buildings if Google tiles fail
            const osmBuildings = await Cesium.createOsmBuildingsAsync();
            viewer.scene.primitives.add(osmBuildings);
          }
        } else {
          // Mobile: Use lightweight OSM buildings only
          try {
            console.log("Loading lightweight OSM buildings (mobile)...");
            const osmBuildings = await Cesium.createOsmBuildingsAsync();
            viewer.scene.primitives.add(osmBuildings);
            console.log("OSM buildings loaded successfully");
          } catch (error) {
            console.warn("Failed to load OSM buildings, continuing without 3D buildings:", error);
          }
        }

        // Load Phoenix village boundaries and calculate centroids
        let villageLabels: Array<{ name: string; lat: number; lng: number; tier: number; isArea: boolean }> = [];
        try {
          const villagesResponse = await fetch('/phoenix_villages.geojson');
          const villagesData = await villagesResponse.json();

          // Calculate centroid for each village polygon
          villageLabels = villagesData.features.map((feature: any) => {
            const coordinates = feature.geometry.coordinates[0]; // Get outer ring

            // Calculate centroid using average of all points
            let sumLat = 0;
            let sumLng = 0;
            let count = 0;

            coordinates.forEach((coord: [number, number]) => {
              sumLng += coord[0];
              sumLat += coord[1];
              count++;
            });

            return {
              name: feature.properties.NAME,
              lng: sumLng / count,
              lat: sumLat / count,
              tier: 0, // Villages are tier 0 (large area labels)
              isArea: true,
            };
          });

          console.log(`Loaded ${villageLabels.length} Phoenix village labels from geojson`);
        } catch (error) {
          console.warn('Failed to load Phoenix villages geojson:', error);
        }

        // Add 3D floating labels for major Phoenix roads and landmarks
        // Categorized by importance for visual hierarchy
        const phoenixLabels = [
          // Tier 0: Phoenix Villages (loaded dynamically from geojson)
          ...villageLabels,

          // Tier 0: Additional area landmarks
          // Tier 0: Large area landmarks (highest, represents regions)
          { name: "Phoenix Sky Harbor Airport", lat: 33.4343, lng: -112.0080, tier: 0, isArea: true },
          { name: "Downtown Phoenix", lat: 33.4484, lng: -112.0740, tier: 0, isArea: true },
          { name: "Camelback Mountain", lat: 33.5145, lng: -111.9710, tier: 0, isArea: true },
          { name: "South Mountain", lat: 33.3390, lng: -112.0800, tier: 0, isArea: true },
          { name: "Papago Park", lat: 33.4550, lng: -111.9500, tier: 0, isArea: true },

          // Tier 1: Major Freeways
          { name: "I-10", lat: 33.4484, lng: -112.0740, tier: 1 },
          { name: "I-17", lat: 33.5000, lng: -112.0980, tier: 1 },
          { name: "Loop 101", lat: 33.5800, lng: -111.9800, tier: 1 },
          { name: "Loop 202", lat: 33.4150, lng: -111.9500, tier: 1 },
          { name: "US-60", lat: 33.4100, lng: -111.8400, tier: 1 },

          // Tier 2: Major arterials (both named and numbered)
          { name: "Camelback Rd", lat: 33.5090, lng: -112.0740, tier: 2 },
          { name: "Central Ave", lat: 33.4484, lng: -112.0740, tier: 2 },
          { name: "Bell Rd", lat: 33.6390, lng: -112.0740, tier: 2 },
          { name: "7th St", lat: 33.4484, lng: -112.0550, tier: 2 },
          { name: "7th Ave", lat: 33.4484, lng: -112.0840, tier: 2 },
          { name: "16th St", lat: 33.4484, lng: -112.0400, tier: 2 },
          { name: "24th St", lat: 33.4484, lng: -112.0250, tier: 2 },
          { name: "32nd St", lat: 33.4484, lng: -112.0100, tier: 2 },
          { name: "44th St", lat: 33.4484, lng: -111.9875, tier: 2 },
          { name: "19th Ave", lat: 33.4484, lng: -112.1050, tier: 2 },
          { name: "35th Ave", lat: 33.4484, lng: -112.1320, tier: 2 },
          { name: "43rd Ave", lat: 33.4484, lng: -112.1460, tier: 2 },

          // Tier 3: Major East-West Streets
          { name: "Greenway Rd", lat: 33.6230, lng: -112.0740, tier: 3 },
          { name: "Thunderbird Rd", lat: 33.6070, lng: -112.0740, tier: 3 },
          { name: "Cactus Rd", lat: 33.5950, lng: -112.0740, tier: 3 },
          { name: "Peoria Ave", lat: 33.5810, lng: -112.0740, tier: 3 },
          { name: "Dunlap Ave", lat: 33.5650, lng: -112.0740, tier: 3 },
          { name: "Northern Ave", lat: 33.5570, lng: -112.0740, tier: 3 },
          { name: "Glendale Ave", lat: 33.5390, lng: -112.0740, tier: 3 },
          { name: "Bethany Home Rd", lat: 33.5210, lng: -112.0740, tier: 3, alwaysShow: true },
          { name: "Indian School Rd", lat: 33.4950, lng: -112.0740, tier: 3 },
          { name: "Thomas Rd", lat: 33.4800, lng: -112.0740, tier: 3 },
          { name: "McDowell Rd", lat: 33.4650, lng: -112.0740, tier: 3 },
          { name: "Van Buren St", lat: 33.4500, lng: -112.0740, tier: 3 },
          { name: "Buckeye Rd", lat: 33.4350, lng: -112.0740, tier: 3 },
          { name: "Broadway Rd", lat: 33.4050, lng: -112.0740, tier: 3 },
          { name: "Southern Ave", lat: 33.3930, lng: -112.0740, tier: 3 },
          { name: "Baseline Rd", lat: 33.3780, lng: -112.0740, tier: 3 },

          // Tier 4: Secondary streets and avenues
          { name: "Osborn Rd", lat: 33.4870, lng: -112.0740, tier: 4 },
          { name: "Lower Buckeye Rd", lat: 33.4220, lng: -112.0740, tier: 4 },
          { name: "Dobbins Rd", lat: 33.3660, lng: -112.0740, tier: 4 },
          { name: "Elliot Rd", lat: 33.3490, lng: -112.0740, tier: 4 },
          { name: "Warner Rd", lat: 33.3350, lng: -112.0740, tier: 4 },
          { name: "Ray Rd", lat: 33.3200, lng: -112.0740, tier: 4 },
          { name: "Chandler Blvd", lat: 33.3060, lng: -112.0740, tier: 4 },
          { name: "12th St", lat: 33.4484, lng: -112.0475, tier: 4 },
          { name: "20th St", lat: 33.4484, lng: -112.0325, tier: 4 },
          { name: "40th St", lat: 33.4484, lng: -111.9950, tier: 4 },
          { name: "48th St", lat: 33.4484, lng: -111.9800, tier: 4 },
          { name: "12th Ave", lat: 33.4484, lng: -112.0920, tier: 4 },
          { name: "27th Ave", lat: 33.4484, lng: -112.1180, tier: 4 },
          { name: "51st Ave", lat: 33.4484, lng: -112.1600, tier: 4 },

          // Tier 5: Minor streets (only show when very close)
          { name: "3rd St", lat: 33.4484, lng: -112.0685, tier: 5 },
          { name: "28th St", lat: 33.4484, lng: -112.0175, tier: 5 },
          { name: "36th St", lat: 33.4484, lng: -112.0025, tier: 5 },
          { name: "52nd St", lat: 33.4484, lng: -112.0100, tier: 5 },
          { name: "56th St", lat: 33.4484, lng: -111.9650, tier: 5 },
          { name: "60th St", lat: 33.4484, lng: -111.9575, tier: 5 },
          { name: "64th St", lat: 33.4484, lng: -111.9500, tier: 5 },
          { name: "68th St", lat: 33.4484, lng: -111.9425, tier: 5 },
          { name: "3rd Ave", lat: 33.4484, lng: -112.0795, tier: 5 },
          { name: "15th Ave", lat: 33.4484, lng: -112.0975, tier: 5 },
          { name: "23rd Ave", lat: 33.4484, lng: -112.1115, tier: 5 },
          { name: "31st Ave", lat: 33.4484, lng: -112.1245, tier: 5 },
          { name: "39th Ave", lat: 33.4484, lng: -112.1390, tier: 5 },
          { name: "47th Ave", lat: 33.4484, lng: -112.1530, tier: 5 },
          { name: "55th Ave", lat: 33.4484, lng: -112.1670, tier: 5 },
          { name: "59th Ave", lat: 33.4484, lng: -112.1740, tier: 5 },
          { name: "63rd Ave", lat: 33.4484, lng: -112.1810, tier: 5 },
          { name: "67th Ave", lat: 33.4484, lng: -112.1880, tier: 5 },
          { name: "75th Ave", lat: 33.4484, lng: -112.2020, tier: 5 },
          { name: "83rd Ave", lat: 33.4484, lng: -112.2160, tier: 5 },
          { name: "91st Ave", lat: 33.4484, lng: -112.2300, tier: 5 },
          { name: "99th Ave", lat: 33.4484, lng: -112.2440, tier: 5 },
          { name: "107th Ave", lat: 33.4484, lng: -112.2580, tier: 5 },
        ];

        // ========================================
        // SMART LABEL MANAGEMENT SYSTEM
        // ========================================

        // Helper: Get camera altitude in feet
        const getCameraAltitudeFeet = () => {
          if (!viewer || !viewer.camera) return 5000;
          const cameraPosition = viewer.camera.positionCartographic;
          return metersToFeet(cameraPosition.height);
        };

        // Helper: Grid-based spatial decluttering with distance-based culling
        // Note: Using imported getDistanceFeet() from flightUtils
        const declutterLabels = (labels: any[], gridSize: number = 0.01) => {
          // MUCH smaller grid: 0.01 degrees ~= 0.7 miles for tighter control
          const grid = new Map<string, any[]>();

          labels.forEach(label => {
            const cellLat = Math.floor(label.lat / gridSize) * gridSize;
            const cellLng = Math.floor(label.lng / gridSize) * gridSize;
            const cellKey = `${cellLat},${cellLng}`;

            if (!grid.has(cellKey)) {
              grid.set(cellKey, []);
            }
            grid.get(cellKey)!.push(label);
          });

          // MUCH stricter limits - only 1-2 labels per small cell
          const result: any[] = [];
          grid.forEach((cellLabels) => {
            // Sort by tier (lower tier = higher priority)
            cellLabels.sort((a, b) => a.tier - b.tier);

            // Very strict limits per cell
            const tierLimits = {
              0: 1,  // Max 1 area label per cell
              1: 1,  // Max 1 freeway label per cell
              2: 1,  // Max 1 major arterial per cell
              3: 2,  // Max 2 major streets per cell
              4: 1,  // Max 1 secondary street per cell
              5: 1   // Max 1 minor street per cell
            };

            const tierCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

            cellLabels.forEach(label => {
              const tier = label.tier as 0|1|2|3|4|5;
              if (tierCounts[tier] < tierLimits[tier]) {
                result.push(label);
                tierCounts[tier]++;
              }
            });
          });

          // SECOND PASS: Distance-based culling
          // Remove labels that are too close to each other (in screen/world space)
          const finalResult: any[] = [];
          const minDistanceFeet = {
            0: 8000,  // Area labels must be 1.5+ miles apart
            1: 10000, // Freeways must be 2+ miles apart
            2: 5000,  // Major arterials 1 mile apart
            3: 3000,  // Major streets 0.6 miles apart
            4: 2000,  // Secondary streets 0.4 miles apart
            5: 1500   // Minor streets 0.3 miles apart
          };

          result.forEach(label => {
            let tooClose = false;
            for (const existing of finalResult) {
              const distance = getDistanceFeet(label.lat, label.lng, existing.lat, existing.lng);
              const minDist = Math.max(
                minDistanceFeet[label.tier as 0|1|2|3|4|5] || 2000,
                minDistanceFeet[existing.tier as 0|1|2|3|4|5] || 2000
              );

              if (distance < minDist) {
                // If lower tier (more important), replace the existing one
                if (label.tier < existing.tier) {
                  const index = finalResult.indexOf(existing);
                  finalResult.splice(index, 1);
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

        // Dynamic tier filtering based on camera altitude
        const getMaxTierForAltitude = (altitudeFeet: number) => {
          if (altitudeFeet > 8000) return 0;      // Very high: only areas
          if (altitudeFeet > 5000) return 1;      // High: areas + freeways
          if (altitudeFeet > 3000) return 2;      // Medium-high: + major arterials
          if (altitudeFeet > 1500) return 3;      // Medium: + major streets
          if (altitudeFeet > 800) return 4;       // Low: + secondary streets
          return 5;                               // Very low: all streets
        };

        // IMPORTANT: Use helicopter's starting altitude, NOT camera altitude
        // Camera starts at space altitude (52 million feet) before being positioned
        // Use the first flight position's altitude for label creation
        const helicopterStartAltitude = Math.max(positions[0]?.altitude_feet || 1550, 1000);
        const initialAltitude = helicopterStartAltitude;
        const maxTier = isMobile ? 2 : getMaxTierForAltitude(initialAltitude);

        // DISABLED: 3D floating labels - Now using 2D list and ground labels instead
        // NEW: View-frustum-aware label system with intelligent culling
        // Step 1: Get viewport bounds to filter only visible labels
        /* const getLabelsInViewFrustum = () => {
          try {
            const viewRectangle = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
            if (!viewRectangle) {
              // Fallback: use camera position with radius
              const cameraPos = viewer.camera.positionCartographic;
              const cameraLat = Cesium.Math.toDegrees(cameraPos.latitude);
              const cameraLng = Cesium.Math.toDegrees(cameraPos.longitude);
              const radiusDegrees = 0.3; // ~20 miles at Phoenix latitude

              return phoenixLabels.filter(label => {
                const latDiff = Math.abs(label.lat - cameraLat);
                const lngDiff = Math.abs(label.lng - cameraLng);
                return latDiff <= radiusDegrees && lngDiff <= radiusDegrees;
              });
            }

            // Add 10% buffer around viewport to avoid sudden pop-in
            const buffer = 0.1;
            const west = Cesium.Math.toDegrees(viewRectangle.west) - buffer;
            const east = Cesium.Math.toDegrees(viewRectangle.east) + buffer;
            const south = Cesium.Math.toDegrees(viewRectangle.south) - buffer;
            const north = Cesium.Math.toDegrees(viewRectangle.north) + buffer;

            return phoenixLabels.filter(label => {
              return label.lng >= west && label.lng <= east &&
                     label.lat >= south && label.lat <= north;
            });
          } catch (error) {
            console.warn('View frustum culling failed, showing all labels:', error);
            return phoenixLabels;
          }
        };

        // Step 2: Filter labels to viewport only
        let labelsInView = getLabelsInViewFrustum();

        // FALLBACK: If no labels in viewport, use distance-based filtering
        if (labelsInView.length === 0) {
          const cameraPos = viewer.camera.positionCartographic;
          const cameraLat = Cesium.Math.toDegrees(cameraPos.latitude);
          const cameraLng = Cesium.Math.toDegrees(cameraPos.longitude);

          // Get all labels within 10 miles as fallback
          labelsInView = phoenixLabels.filter(label => {
            const distance = getDistanceFeet(cameraLat, cameraLng, label.lat, label.lng);
            return distance <= 52800; // 10 miles in feet
          });

          console.warn(`View frustum empty, using distance fallback: ${labelsInView.length} labels within 10 miles`);
        }

        // Step 3: Prioritize major streets (tier 1-3) over areas
        // User wants: major streets every 1-5 miles, occasional area labels
        const cameraPos = viewer.camera.positionCartographic;
        const cameraLat = Cesium.Math.toDegrees(cameraPos.latitude);
        const cameraLng = Cesium.Math.toDegrees(cameraPos.longitude);

        // Calculate distances and prioritize streets
        const labelsWithDistance = labelsInView.map(label => {
          const distance = getDistanceFeet(cameraLat, cameraLng, label.lat, label.lng);
          return { ...label, distance };
        });

        // Split by type: areas vs streets
        const areaLabels = labelsWithDistance.filter(l => l.tier === 0); // Cities/neighborhoods
        const streetLabels = labelsWithDistance.filter(l => l.tier >= 1 && l.tier <= 3); // Freeways, major arterials, major streets

        // Take closest 1-2 area labels for context ("Entering Glendale")
        const selectedAreas = areaLabels
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 2);

        // Take 10-15 major streets to ensure coverage
        const selectedStreets = streetLabels
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 15);

        console.log(
          `Before decluttering: ${selectedAreas.length} areas, ${selectedStreets.length} streets ` +
          `from ${labelsInView.length} in viewport. Camera alt: ${Math.round(initialAltitude)}ft`
        );

        // Combine but DON'T apply decluttering if we have very few labels
        const combinedLabels = [...selectedAreas, ...selectedStreets];

        // Only apply decluttering if we have more than 12 labels
        let finalLabels;
        if (combinedLabels.length > 12) {
          const declutteredLabels = declutterLabels(combinedLabels);
          finalLabels = declutteredLabels.slice(0, 15); // Allow up to 15 labels
        } else {
          finalLabels = combinedLabels; // Keep all if we have 12 or fewer
        }

        console.log(
          `3D world labels: ${finalLabels.length} labels to show ` +
          `(final: ${finalLabels.filter(l => l.tier === 0).length} areas, ` +
          `${finalLabels.filter(l => l.tier >= 1).length} streets)`
        );

        // Store all labels for potential future use
        (window as any).phoenixLabelsData = phoenixLabels;

        // Step 5: Create labels with improved positioning and eyeOffset to prevent stacking
        finalLabels.forEach((label, index) => {
          // Tier-based styling for holographic visual hierarchy
          let fontSize, maxDistance, minDistance, baseHeight, scale;
          const color = getTierHolographicColor(label.tier);

          switch(label.tier) {
            case 0: // Area landmarks
              fontSize = 24;
              maxDistance = isMobile ? 15840 : 31680; // 3-6 miles
              minDistance = 0; // Always show when in viewport
              baseHeight = 400; // REDUCED from 1000ft - don't float so high
              scale = 1.2;
              break;
            case 1: // Major Freeways
              fontSize = 22;
              maxDistance = isMobile ? 13200 : 26400; // 2.5-5 miles
              minDistance = 0;
              baseHeight = 300; // REDUCED from 600ft
              scale = 1.1;
              break;
            case 2: // Major arterials
              fontSize = 20;
              maxDistance = isMobile ? 10560 : 21120; // 2-4 miles
              minDistance = 0;
              baseHeight = 250; // REDUCED from 500ft
              scale = 1.0;
              break;
            case 3: // Major streets
              fontSize = 18;
              maxDistance = 15840; // 3 miles
              minDistance = 0;
              baseHeight = 200; // REDUCED from 400ft
              scale = 0.9;
              break;
            case 4: // Secondary streets
              fontSize = 16;
              maxDistance = 10560; // 2 miles
              minDistance = 0;
              baseHeight = 150; // REDUCED from 350ft
              scale = 0.8;
              break;
            case 5: // Minor streets
              fontSize = 14;
              maxDistance = 7920; // 1.5 miles
              minDistance = 0;
              baseHeight = 100; // REDUCED from 300ft
              scale = 0.7;
              break;
            default:
              fontSize = 18;
              maxDistance = 15840;
              minDistance = 0;
              baseHeight = 200;
              scale = 1.0;
          }

          // Position at reduced height above ground
          const position = Cesium.Cartesian3.fromDegrees(label.lng, label.lat, baseHeight);

          // Use eyeOffset to vertically separate labels and prevent stacking
          // Stagger labels vertically based on their index
          const eyeOffsetY = (index % 5) * 40 - 80; // Spread labels: -80, -40, 0, 40, 80 pixels
          const pixelOffset = new Cesium.Cartesian2(0, eyeOffsetY);

          // Standard holographic billboard for all labels (no progressive reveal to reduce complexity)
          createHolographicBillboard(Cesium, viewer, {
            position: position,
            text: label.name,
            fontSize: fontSize,
            color: color,
            scale: scale,
            pixelOffset: pixelOffset,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(minDistance, maxDistance),
            scaleByDistance: new Cesium.NearFarScalar(1000, 1.5, maxDistance * 0.7, 0.8),
            translucencyByDistance: new Cesium.NearFarScalar(maxDistance * 0.7, 1.0, maxDistance, 0.0),
          });
        });

        console.log("3D world labels created. Total entities:", viewer.entities.values.length);
        */ // END OF DISABLED 3D LABEL CODE

        // Store phoenix labels data for use in ground labels and 2D list
        // (This was inside the commented block but is still needed)
        (window as any).phoenixLabelsData = phoenixLabels;
        console.log(`Stored ${phoenixLabels.length} Phoenix labels for ground label system`);

        // Mark tiles as ready since we're using OSM buildings
        setTilesReady(true);
        setTileLoadProgress(100);
        const flightData = positions.map((pos, idx) => {
          return {
            longitude: pos.longitude,
            latitude: pos.latitude,
            height: pos.altitude_feet,
            timestamp: pos.timestamp,
            heading: pos.track_degrees || 0,
          };
        });

        // Build the clock from the REAL recorded timestamps. Previously every
        // sample was forced 5s apart (timeStepInSeconds), which fabricated a
        // uniform timeline and hid the true gaps between recorded positions —
        // misleading for evidence. start/stop now span the actual flight.
        //
        // Derive the span from the first/last positions that actually have a
        // valid timestamp — not flightData[0]/[last] blindly. A null/malformed
        // timestamp there would throw in fromIso8601 and abort the whole viewer,
        // and if position 0 were skipped by the sample loop's guard, `start`
        // would sit ahead of the first real sample (helicopter at the origin).
        const firstValid = flightData.find((d) => !!d.timestamp);
        const lastValid = [...flightData].reverse().find((d) => !!d.timestamp);
        if (!firstValid || !lastValid) {
          throw new Error(
            "No positions with valid timestamps — cannot build the 3D timeline",
          );
        }
        const start = Cesium.JulianDate.fromIso8601(firstValid.timestamp);
        const stop = Cesium.JulianDate.fromIso8601(lastValid.timestamp);
        viewer.clock.startTime = start.clone();
        viewer.clock.stopTime = stop.clone();
        viewer.clock.currentTime = start.clone();
        viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED; // Allow animation to progress past endpoints
        viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER; // Use system clock with multiplier
        // Speed up the playback speed 50x.
        viewer.clock.multiplier = 50;
        // Don't auto-start - let user start it
        viewer.clock.shouldAnimate = false;

        // The SampledPositionedProperty stores the position and timestamp for each sample along the radar sample series.
        const positionProperty = new Cesium.SampledPositionProperty();
        const orientationProperty = new Cesium.SampledProperty(Cesium.Quaternion);

        // Cesium sampled properties require strictly increasing sample times.
        let lastSampleTime: any = null;

        for (let i = 0; i < flightData.length; i++) {
          const dataPoint = flightData[i];

          // Use this position's REAL recorded timestamp. Skip any missing,
          // duplicate, or out-of-order timestamps so the series stays strictly
          // increasing (and honest about the real spacing between positions).
          if (!dataPoint.timestamp) continue;
          const time = Cesium.JulianDate.fromIso8601(dataPoint.timestamp);
          if (
            lastSampleTime &&
            Cesium.JulianDate.lessThanOrEquals(time, lastSampleTime)
          ) {
            continue;
          }
          lastSampleTime = time;
          // Convert altitude from feet to meters (Cesium uses meters)
          const position = Cesium.Cartesian3.fromDegrees(
            dataPoint.longitude,
            dataPoint.latitude,
            dataPoint.height * 0.3048, // Convert feet to meters
          );
          // Store the position along with its timestamp.
          // Here we add the positions all upfront, but these can be added at run-time as samples are received from a server.
          positionProperty.addSample(time, position);

          // Calculate orientation from heading
          const heading = Cesium.Math.toRadians(dataPoint.heading);
          const pitch = 0;
          const roll = 0;
          const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
          const orientation = Cesium.Transforms.headingPitchRollQuaternion(
            position,
            hpr
          );
          orientationProperty.addSample(time, orientation);

          // Don't add individual point entities - we already have the polyline
          // viewer.entities.add({
          //   description: `Location: (${dataPoint.longitude}, ${dataPoint.latitude}, ${dataPoint.height})`,
          //   position: position,
          //   point: { pixelSize: 10, color: Cesium.Color.RED },
          // });
        }

        // Add the helicopter entity that will be animated by the clock
        const helicopterEntity = viewer.entities.add({
          availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({
              start: start,
              stop: stop,
            }),
          ]),
          position: positionProperty,
          orientation: orientationProperty, // Use velocity-based orientation for heading
          // Use a billboard to represent the helicopter (only visible in third-person)
          billboard: {
            // SVG helicopter icon - top-down view with clear heading indicator
            image: "data:image/svg+xml;base64," + btoa(`
              <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#00ddff;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0088cc;stop-opacity:1" />
                  </linearGradient>
                </defs>

                <!-- Shadow for depth -->
                <ellipse cx="40" cy="42" rx="16" ry="12" fill="#000000" opacity="0.2"/>

                <!-- Main rotor blades (cross pattern) -->
                <g filter="url(#glow)">
                  <line x1="10" y1="38" x2="70" y2="38" stroke="#00ffff" stroke-width="3" opacity="0.8" stroke-linecap="round"/>
                  <line x1="40" y1="8" x2="40" y2="68" stroke="#00ffff" stroke-width="3" opacity="0.8" stroke-linecap="round"/>
                </g>

                <!-- Tail boom (extending backward/down) -->
                <rect x="36" y="38" width="8" height="28" fill="#00aacc" stroke="#00ccdd" stroke-width="1" rx="2"/>

                <!-- Tail rotor (small circle at end of tail) -->
                <circle cx="40" cy="66" r="4" fill="#00ffff" stroke="#00ffff" stroke-width="1.5" opacity="0.8"/>

                <!-- Main fuselage body (rounded rectangle) -->
                <ellipse cx="40" cy="36" rx="14" ry="11" fill="url(#bodyGradient)" stroke="#00eeff" stroke-width="2" filter="url(#glow)"/>

                <!-- Cockpit/front window (slight highlight) -->
                <ellipse cx="40" cy="28" rx="8" ry="5" fill="#66ddff" opacity="0.6"/>

                <!-- Forward direction indicator (large orange arrow at nose) -->
                <g filter="url(#glow)">
                  <path d="M 40 8 L 48 22 L 44 22 L 44 30 L 36 30 L 36 22 L 32 22 Z"
                        fill="#ff6600" stroke="#ffaa00" stroke-width="2"/>
                </g>

                <!-- Center rotor hub -->
                <circle cx="40" cy="38" r="5" fill="#00aacc" stroke="#00ffff" stroke-width="2" filter="url(#glow)"/>

                <!-- Additional direction indicator triangle above arrow -->
                <path d="M 40 2 L 35 8 L 45 8 Z" fill="#ff8800" stroke="#ffaa00" stroke-width="1" filter="url(#glow)"/>
              </svg>
            `),
            scale: 1.5,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            show: false, // Hide in first-person view
            alignedAxis: Cesium.Cartesian3.UNIT_Z, // Align to helicopter's heading
            rotation: 0, // Will be controlled by entity orientation
          },
          // Optionally add a label
          label: {
            text: "Helicopter",
            font: "12px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -50),
            show: false, // Hide in first-person view
          },
        });

        // Store reference for later use
        viewer.helicopterEntity = helicopterEntity;
        // // Remove all default imagery providers to get rid of the grid
        // viewer.imageryLayers.removeAll();
        //
        // if (!mountedRef.current) {
        //   viewer.destroy();
        //   return;
        // }

        viewerRef.current = viewer;

        // Also store globally for testing
        (window as any).cesiumViewer = viewer;

        // Keep the Google / Cesium ion attribution visible (required by their
        // terms — it must not be hidden or obscured) but move it from Cesium's
        // default bottom-left to the bottom-right, freeing the bottom-left
        // corner for the minimap. Inline styles override widgets.css.
        const creditContainer = (viewer as any).cesiumWidget?.creditContainer as
          | HTMLElement
          | undefined;
        if (creditContainer) {
          creditContainer.style.left = "auto";
          creditContainer.style.right = "8px";
          creditContainer.style.textAlign = "right";
        }

        // Configure scene - completely hide the globe to avoid grid
        // viewer.scene.globe.show = false; // Hide globe completely from the start
        // viewer.scene.globe.depthTestAgainstTerrain = false;
        // viewer.scene.skyBox.show = false; // Hide skybox
        // viewer.scene.sun.show = false;
        // viewer.scene.moon.show = false;
        // viewer.scene.backgroundColor = Cesium.Color.BLACK; // Black background
        // viewer.scene.fog.enabled = false; // Disable fog

        // Set a default terrain provider using the correct API
        // viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();

        // Add Google Photorealistic 3D Tiles
        // try {
        //   const apiKey =
        //     import.meta.env.VITE_GOOGLE_TILES_API_KEY ||
        //     import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        //   console.log(
        //     "Using Google Tiles API Key:",
        //     apiKey ? "Key present" : "No key found",
        //   );
        //
        //   if (!apiKey) {
        //     throw new Error("Google Maps API key not configured");
        //   }
        //
        //   // Remove quotes if present in the API key
        //   const cleanApiKey = apiKey.replace(/['"]/g, "");
        //
        //   // Check if tileset already exists on viewer
        //   if (viewer.googleTileset) {
        //     console.log(
        //       "Google 3D Tileset already loaded on viewer, skipping...",
        //     );
        //     return;
        //   }
        //
        //   console.log(
        //     "Loading Google 3D Tiles from:",
        //     `https://tile.googleapis.com/v1/3dtiles/root.json?key=${cleanApiKey.substring(0, 10)}...`,
        //   );
        //   // Increase request limit for faster tile loading
        //   Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] =
        //     100;
        //
        //   const tileset = await Cesium.Cesium3DTileset.fromUrl(
        //     `https://tile.googleapis.com/v1/3dtiles/root.json?key=${cleanApiKey}`,
        //     {
        //       showCreditsOnScreen: false, // Hide credits for performance
        //       maximumScreenSpaceError: 8, // Higher error tolerance for better performance
        //       cacheBytes: 512 * 1024 * 1024, // 512MB cache - smaller for faster access
        //       maximumCacheOverflowBytes: 256 * 1024 * 1024, // 256MB overflow
        //       skipLevelOfDetail: true, // Skip levels for faster loading
        //       immediatelyLoadDesiredLevelOfDetail: false, // Don't force immediate loading
        //       loadSiblings: false, // Don't load siblings for performance
        //       cullWithChildrenBounds: true, // Cull for performance
        //       dynamicScreenSpaceError: true, // Dynamic adjustment for performance
        //       dynamicScreenSpaceErrorDensity: 0.00278,
        //       dynamicScreenSpaceErrorFactor: 8.0, // More aggressive factor for performance
        //       dynamicScreenSpaceErrorHeightFalloff: 0.5,
        //       progressiveResolutionHeightFraction: 0.5, // Faster progressive loading
        //       foveatedConeSize: 0.2, // Larger cone for more aggressive foveation
        //       foveatedMinimumScreenSpaceErrorRelaxation: 0.5, // More relaxation
        //       cullRequestsWhileMoving: true, // Cull while moving
        //       cullRequestsWhileMovingMultiplier: 0.3, // Aggressive culling while moving
        //       preferLeaves: false,
        //       maximumMemoryUsage: 512, // 512MB limit for faster tile swapping
        //       preloadWhenHidden: false, // Don't preload hidden tiles
        //       preloadFlightDestinations: false, // Don't preload ahead
        //     },
        //   );
        //
        //   console.log("Google 3D Tileset loaded successfully");
        //   console.log("Tileset cache settings:", {
        //     cacheBytes: tileset.cacheBytes / (1024 * 1024) + " MB",
        //     maximumCacheOverflowBytes:
        //       tileset.maximumCacheOverflowBytes / (1024 * 1024) + " MB",
        //     totalMemoryUsageInBytes:
        //       tileset.totalMemoryUsageInBytes / (1024 * 1024) + " MB",
        //   });
        //
        //   if (mountedRef.current) {
        //     viewer.scene.primitives.add(tileset);
        //
        //     // Store tileset reference on viewer for access during animation
        //     viewer.googleTileset = tileset;
        //
        //     // Wait for initial tiles to load
        //     await tileset.readyPromise;
        //     console.log("Google 3D Tiles ready");
        //
        //     // Log tileset properties to debug quality issues
        //     console.log("Tileset properties:", {
        //       maximumScreenSpaceError: tileset.maximumScreenSpaceError,
        //       skipLevelOfDetail: tileset.skipLevelOfDetail,
        //       immediatelyLoadDesiredLevelOfDetail:
        //         tileset.immediatelyLoadDesiredLevelOfDetail,
        //       geometricError: tileset.root?.geometricError,
        //       hasExtension: tileset.root?.hasExtension,
        //       tilesLoaded: tileset.statistics?.numberOfTilesLoaded,
        //       tilesTotal: tileset.statistics?.numberOfTilesTotal,
        //       geometricErrorScale: tileset.geometricErrorScale,
        //     });
        //
        //     // Set performance-optimized quality after loading
        //     tileset.maximumScreenSpaceError = 8; // Higher tolerance for performance
        //     // Don't modify geometricErrorScale as it can cause rendering issues
        //
        //     // Monitor tile loading progress
        //     let lastTileCount = 0;
        //     let stableFrames = 0;
        //     const minimumTiles = 20; // Minimum tiles before allowing animation
        //
        //     const checkTileLoading = setInterval(() => {
        //       if (!mountedRef.current || !tileset) {
        //         clearInterval(checkTileLoading);
        //         return;
        //       }
        //
        //       const tilesLoaded = tileset.statistics.numberOfTilesLoaded;
        //       const progress = Math.min(
        //         100,
        //         (tilesLoaded / Math.max(minimumTiles, tilesLoaded)) * 100,
        //       );
        //
        //       setTileLoadProgress(progress);
        //
        //       // Check if tiles are stable (no new tiles loading)
        //       if (tilesLoaded === lastTileCount) {
        //         stableFrames++;
        //       } else {
        //         stableFrames = 0;
        //         lastTileCount = tilesLoaded;
        //       }
        //
        //       // Consider tiles ready when we have enough tiles and loading is stable
        //       if (tilesLoaded >= minimumTiles && stableFrames >= 10) {
        //         console.log(`Tiles ready! Loaded ${tilesLoaded} tiles`);
        //         setTilesReady(true);
        //         clearInterval(checkTileLoading);
        //       }
        //     }, 200); // Check every 200ms
        //
        //     // Fallback: Set ready after max 5 seconds even if not all tiles loaded
        //     setTimeout(() => {
        //       if (!tilesReady && mountedRef.current) {
        //         console.log("Tile loading timeout - enabling animation");
        //         setTilesReady(true);
        //         clearInterval(checkTileLoading);
        //       }
        //     }, 5000);
        //
        //     // Keep the globe hidden - don't change this during animation
        //     viewer.scene.globe.show = false;
        //
        //     // Also ensure the globe stays hidden during rendering
        //     viewer.scene.globe.enableLighting = false;
        //
        //     // Force a render
        //     viewer.scene.requestRender();
        //   }
        // } catch (tileError) {
        //   console.warn(
        //     "Could not load Google 3D tiles, using default terrain:",
        //     tileError,
        //   );
        //   // Keep the default ellipsoid terrain provider
        //   viewer.scene.globe.show = true;
        //
        //   // Still mark tiles as "ready" so animation can proceed
        //   setTilesReady(true);
        //   setTileLoadProgress(100);
        // }

        if (!mountedRef.current) return;

        // When we have a search context, only use positions around the closest point
        let displayPositions = positions;
        let adjustedClosestIndex = closestPointIndex;

        if (
          searchContext &&
          closestPointIndex !== null &&
          closestPointIndex >= 0
        ) {
          // Calculate how many positions represent approximately 1 minute
          // Assuming positions are logged every 1-2 seconds on average
          const positionsPerMinute = 30; // Approximate

          // Start 1 minute before closest point, end at closest point
          const startIdx = Math.max(0, closestPointIndex - positionsPerMinute);
          const endIdx = Math.min(positions.length - 1, closestPointIndex + 5); // Add a few positions after for smooth stop

          displayPositions = positions.slice(startIdx, endIdx + 1);
          adjustedClosestIndex = closestPointIndex - startIdx; // Adjust index for sliced array

          console.log(
            `Using reduced positions: ${displayPositions.length} (from ${startIdx} to ${endIdx}, closest at ${adjustedClosestIndex})`,
          );
        }

        // Convert positions to Cesium format
        const cartesianPositions = displayPositions.map((pos) => {
          return Cesium.Cartesian3.fromDegrees(
            pos.longitude,
            pos.latitude,
            pos.altitude_feet * 0.3048,
          );
        });

        // Split the path into continuous segments, breaking wherever there is a
        // tracking gap between consecutive positions. Drawing one unbroken line
        // across a gap would imply a flight path that was never recorded —
        // misleading for evidence. Normal sampling is ~2-3s (<=16s even on dense
        // flights); a delta over GAP_THRESHOLD_SECONDS means tracking was lost
        // (out of range, transponder off, etc.), so the line is broken there.
        const GAP_THRESHOLD_SECONDS = 30;
        const pathSegments: any[][] = [];
        // A position isolated on both sides by gaps can't form a line. Keep it
        // as a point rather than dropping it — silently omitting a real recorded
        // coordinate would be an evidence gap, not a rendering nicety.
        const isolatedPoints: any[] = [];
        let currentSegment: any[] = [];
        const flushSegment = () => {
          if (currentSegment.length >= 2) pathSegments.push(currentSegment);
          else if (currentSegment.length === 1)
            isolatedPoints.push(currentSegment[0]);
          currentSegment = [];
        };
        for (let i = 0; i < displayPositions.length; i++) {
          if (i > 0) {
            const prevTs = displayPositions[i - 1].timestamp;
            const curTs = displayPositions[i].timestamp;
            const prevMs = prevTs ? new Date(prevTs).getTime() : NaN;
            const curMs = curTs ? new Date(curTs).getTime() : NaN;
            // If either timestamp is missing or unparseable we can't verify the
            // two positions are contiguous in time. Treat that as a gap (break
            // the line) rather than asserting a continuity we can't support —
            // bridging an unknown interval with a solid line would fabricate a
            // path. (Mirrors the animation sample loop, which skips positions
            // without a usable timestamp.)
            const gapSeconds =
              Number.isFinite(prevMs) && Number.isFinite(curMs)
                ? (curMs - prevMs) / 1000
                : Infinity;
            if (gapSeconds > GAP_THRESHOLD_SECONDS) {
              flushSegment();
            }
          }
          currentSegment.push(cartesianPositions[i]);
        }
        flushSegment();

        // One polyline entity per continuous segment; gaps are left visibly
        // unbridged rather than connected by a fabricated straight line.
        pathSegments.forEach((segmentPositions, segIdx) => {
          viewer.entities.add({
            name:
              segIdx === 0
                ? "Flight Path"
                : `Flight Path (segment ${segIdx + 1})`,
            polyline: {
              positions: segmentPositions,
              width: 4,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.RED.withAlpha(0.9),
              }),
              clampToGround: false,
              show: true,
            },
          });
        });

        // Render any gap-isolated single positions as points so they remain
        // visible in the record instead of disappearing.
        isolatedPoints.forEach((pointPosition) => {
          viewer.entities.add({
            name: "Isolated position",
            position: pointPosition,
            point: {
              pixelSize: 8,
              color: Cesium.Color.RED.withAlpha(0.9),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        // Add start marker
        viewer.entities.add({
          name: "Start",
          position: cartesianPositions[0],
          point: {
            pixelSize: 12,
            color: Cesium.Color.GREEN,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: "START",
            font: "14px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        // Add end marker
        const endPos = positions[positions.length - 1];
        viewer.entities.add({
          name: "End",
          position: cartesianPositions[cartesianPositions.length - 1],
          point: {
            pixelSize: 12,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: "END",
            font: "14px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });



        // Add blue marker for search location if present
        if (searchContext) {
          console.log(
            "Creating search location marker at:",
            searchContext.lat,
            searchContext.lng,
            "closestIndex:",
            closestPointIndex,
          );

          const searchMarker = viewer.entities.add({
            name: "Search Location",
            position: Cesium.Cartesian3.fromDegrees(
              searchContext.lng,
              searchContext.lat,
              100,
            ),
            point: {
              pixelSize: 20,
              color: Cesium.Color.BLUE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 3,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          // Add a circle to show the search radius
          viewer.entities.add({
            name: "Search Radius",
            position: Cesium.Cartesian3.fromDegrees(
              searchContext.lng,
              searchContext.lat,
            ),
            ellipse: {
              semiMinorAxis: searchContext.radius,
              semiMajorAxis: searchContext.radius,
              height: 0,
              material: Cesium.Color.BLUE.withAlpha(0.15),
              outline: true,
              outlineColor: Cesium.Color.BLUE.withAlpha(0.5),
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          });

          // Add a bright ground-level marker at the search location (for look-down view)
          viewer.entities.add({
            name: "Search Location Ground Marker",
            position: Cesium.Cartesian3.fromDegrees(
              searchContext.lng,
              searchContext.lat,
              0
            ),
            point: {
              pixelSize: 30,
              color: Cesium.Color.fromCssColorString('#FF4466'), // Bright red/pink
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 3,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          // Add a pulsing inner circle for better visibility
          viewer.entities.add({
            name: "Search Location Ground Pulse",
            position: Cesium.Cartesian3.fromDegrees(
              searchContext.lng,
              searchContext.lat,
              0.5 // Slightly above ground to avoid z-fighting
            ),
            ellipse: {
              semiMinorAxis: 15,
              semiMajorAxis: 15,
              height: 0,
              material: new Cesium.Color(
                HolographicColors.CRITICAL_ALERT.r,
                HolographicColors.CRITICAL_ALERT.g,
                HolographicColors.CRITICAL_ALERT.b,
                0.6
              ),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#FF4466'),
              outlineWidth: 3,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          });

          viewer.searchMarker = searchMarker;
        }

        // Add hover location markers with holographic vertical light beams
        if (hoverLocations && hoverLocations.length > 0) {
          console.log(`Adding ${hoverLocations.length} holographic hover location visualizations`);

          hoverLocations.forEach((hoverLoc, idx) => {
            // Calculate radius based on duration (longer hover = larger radius)
            // Base radius: 50m, add 10m per minute of hovering, max 200m
            const radiusMeters = Math.min(50 + (hoverLoc.duration_minutes * 10), 200);

            // Create holographic beam (animated pulsing cylinder)
            createHolographicBeam(Cesium, viewer, {
              position: { longitude: hoverLoc.longitude, latitude: hoverLoc.latitude },
              radius: radiusMeters,
              height: 4572, // ~15,000 feet
              color: HolographicColors.HOVER_ALERT,
              pulseSpeed: 1.5,
            });

            // Add ground marker - holographic ellipse showing surveillance area
            viewer.entities.add({
              name: `Hover Area ${idx + 1}`,
              position: Cesium.Cartesian3.fromDegrees(
                hoverLoc.longitude,
                hoverLoc.latitude,
                0 // Explicit height of 0
              ),
              ellipse: {
                semiMinorAxis: radiusMeters,
                semiMajorAxis: radiusMeters,
                height: 0, // Required when using heightReference
                material: new Cesium.Color(
                  HolographicColors.HOVER_ALERT.r,
                  HolographicColors.HOVER_ALERT.g,
                  HolographicColors.HOVER_ALERT.b,
                  0.4
                ),
                outline: false, // Disable outline to avoid terrain clamping warning
                // outlineColor and outlineWidth removed since outline is disabled
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
            });

            // Add holographic label showing duration
            const labelPosition = Cesium.Cartesian3.fromDegrees(
              hoverLoc.longitude,
              hoverLoc.latitude,
              100 // 100m above ground for visibility
            );

            createHolographicBillboard(Cesium, viewer, {
              position: labelPosition,
              text: `HOVER\n${hoverLoc.duration_minutes.toFixed(1)} min`,
              fontSize: 18,
              color: HolographicColors.HOVER_ALERT,
              scale: 1.0,
            });
          });

          console.log(`Added ${hoverLocations.length} holographic hover visualization sets`);
        }

        // Start with first-person pilot view
        const cameraStartPos = displayPositions[0];
        // Use reasonable altitude to prevent rendering artifacts
        const startAltitude = Math.max(cameraStartPos.altitude_feet || 1000, 1000); // Minimum 1000ft to prevent artifacts
        const cameraStartCartesian = Cesium.Cartesian3.fromDegrees(
          cameraStartPos.longitude,
          cameraStartPos.latitude,
          startAltitude * 0.3048,
        );

        // Set initial first-person view with proper pitch
        const heading = Cesium.Math.toRadians(cameraStartPos.track_degrees || 0);
        const pitchAngle = -25; // Moderate downward angle

        // Initial camera setup
        console.log("Setting initial camera position:", {
          lat: cameraStartPos.latitude,
          lon: cameraStartPos.longitude,
          alt: startAltitude,
          heading: cameraStartPos.track_degrees || 0,
          pitch: pitchAngle,
        });

        // Set camera immediately with Phoenix coordinates
        viewer.camera.setView({
          destination: cameraStartCartesian,
          orientation: {
            heading: heading,
            pitch: Cesium.Math.toRadians(pitchAngle),
            roll: 0,
          },
        });

        // Update camera position for street labels
        setCameraPosition(viewer.camera.position.clone());

        // Add camera move listener to update street labels
        viewer.camera.moveEnd.addEventListener(() => {
          if (mountedRef.current) {
            setCameraPosition(viewer.camera.position.clone());
          }
        });

        // Initialize nearby labels for 2D list (using first position)
        if (positions.length > 0 && (window as any).phoenixLabelsData) {
          const phoenixLabels = (window as any).phoenixLabelsData;
          const firstPos = positions[0];

          const getDistanceFeet = (lat1: number, lng1: number, lat2: number, lng2: number) => {
            const R = 20925721; // Earth radius in feet
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          };

          const nearbyLabelsData = phoenixLabels
            .map((label: any) => ({
              ...label,
              distance: getDistanceFeet(firstPos.latitude, firstPos.longitude, label.lat, label.lng)
            }))
            .filter((label: any) => label.distance <= 52800) // 10 miles
            .sort((a: any, b: any) => a.distance - b.distance);

          const areas = nearbyLabelsData.filter((l: any) => l.tier === 0).slice(0, 2);
          const alwaysShowLabels = phoenixLabels
            .filter((l: any) => l.alwaysShow)
            .map((label: any) => ({
              ...label,
              distance: getDistanceFeet(firstPos.latitude, firstPos.longitude, label.lat, label.lng)
            }));
          const streets = nearbyLabelsData.filter((l: any) => l.tier >= 1 && l.tier <= 3 && !l.alwaysShow).slice(0, 15);
          const labelsToShow = [...areas, ...alwaysShowLabels, ...streets];

          console.log(`Initial labels: ${labelsToShow.length} (${areas.length} areas, ${streets.length} streets)`);

          setNearbyLabels(labelsToShow.map((label: any) => ({
            name: label.name,
            tier: label.tier,
            distance: label.distance / 5280, // Convert feet to miles
            type: label.type,
            alwaysShow: label.alwaysShow
          })));

          // Also create initial ground-level street labels (for look-down view)
          const streetsForGroundLabels = labelsToShow.filter((l: any) => l.tier >= 1 && l.tier <= 3).slice(0, 15);
          console.log(`Creating ${streetsForGroundLabels.length} initial ground labels`);

          streetsForGroundLabels.forEach((label: any, index: number) => {
            let fontSize, color;

            if (label.tier === 1) {
              fontSize = 20;
              color = Cesium.Color.fromCssColorString('rgba(255, 170, 0, 0.9)'); // Amber for highways
            } else if (label.tier === 2) {
              fontSize = 18;
              color = Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.85)'); // Cyan for major streets
            } else {
              fontSize = 16;
              color = Cesium.Color.fromCssColorString('rgba(136, 221, 255, 0.75)'); // Light cyan for regular streets
            }

            viewer.entities.add({
              name: `Ground Label: ${label.name}`,
              position: Cesium.Cartesian3.fromDegrees(label.lng, label.lat, 0),
              label: {
                text: label.name,
                font: `bold ${fontSize}px monospace`,
                fillColor: color,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5280), // Within 1 mile
                scale: 0.8,
                pixelOffset: new Cesium.Cartesian2(0, (index % 3) * 25),
              }
            });
          });
        }

        // Don't auto-start animation - let user start it manually
        viewer.clock.shouldAnimate = false;

        // Force a render
        // viewer.scene.requestRender();

        // After tiles load, set camera again to ensure proper view
        // setTimeout(() => {
        //   console.log("Resetting camera after tiles load");
        //   viewer.camera.setView({
        //     destination: startCartesian,
        //     orientation: {
        //       heading: heading,
        //       pitch: Cesium.Math.toRadians(-25),
        //       roll: 0,
        //     },
        //   });
        //
        //   // Ensure we're rendering the tiles
        //   viewer.scene.requestRender();
        // }, 2000);

        // Smooth interpolation function
        // const lerp = (start: number, end: number, t: number) => {
        //   return start + (end - start) * t;
        // };

        // Create animation state on the viewer itself to ensure persistence
        // if (viewer && !viewer.animationState) {
        //   viewer.animationState = {
        //     currentIndex: 0,
        //     interpolationProgress: 0,
        //     frameCount: 0,
        //     continuousPosition: 0,
        //     lastPosition: 0, // Track last position for speed calculation
        //     hasStoppedAtClosest: false, // Track if we've paused at the closest point
        //   };
        // }
        //
        // // Animation function with smooth interpolation
        // const animateFlight = (speed?: number) => {
        //   // Validate prerequisites
        //   if (!displayPositions || displayPositions.length < 2) {
        //     console.error(
        //       "Cannot start animation: not enough positions",
        //       displayPositions?.length || 0,
        //     );
        //     setIsAnimating(false);
        //     return;
        //   }
        //
        //   if (!viewer) {
        //     console.error("Cannot start animation: viewer not ready");
        //     setIsAnimating(false);
        //     return;
        //   }
        //
        //   // Use provided speed or get from viewer settings or fallback to 1
        //   const currentSpeed =
        //     speed || viewer.animationSettings?.playbackSpeed || 1;
        //
        //   console.log(
        //     "Starting animation with",
        //     displayPositions.length,
        //     "positions at",
        //     currentSpeed,
        //     "x speed",
        //   );
        //   console.log("Viewer exists:", !!viewer);
        //   console.log("Helicopter entity exists:", !!viewer.helicopterEntity);
        //
        //   if (animationRef.current) {
        //     console.log("Clearing existing animation timeout");
        //     clearTimeout(animationRef.current);
        //   }
        //
        //   setIsAnimating(true);
        //
        //   // Reset animation state for new animation
        //   viewer.animationState.currentIndex = 0;
        //   viewer.animationState.continuousPosition = 0;
        //   viewer.animationState.frameCount = 0;
        //   viewer.animationState.lastPosition = 0;
        //   viewer.animationState.hasStoppedAtClosest = false; // Reset the flag when starting new animation
        //
        //   // Animation timing configuration
        //   const positionCount = displayPositions.length;
        //   let framesPerSecond = 30; // Target FPS
        //
        //   // Calculate total animation duration based on mode and speed
        //   let targetDurationSeconds;
        //
        //   // Calculate realistic flight time based on actual timestamps
        //   const actualFlightTimeMs =
        //     new Date(
        //       displayPositions[displayPositions.length - 1].timestamp,
        //     ).getTime() - new Date(displayPositions[0].timestamp).getTime();
        //   const actualFlightSeconds = actualFlightTimeMs / 1000;
        //
        //   if (tileLoadingMode) {
        //     // High quality mode - slower for tile loading, but based on real time
        //     targetDurationSeconds = Math.max(
        //       60,
        //       actualFlightSeconds / (currentSpeed * 10),
        //     ); // Scale down by 10x at 1x speed
        //     framesPerSecond = 20; // Moderate FPS for quality
        //   } else {
        //     // Normal mode - faster playback
        //     targetDurationSeconds = Math.max(
        //       20,
        //       actualFlightSeconds / (currentSpeed * 30),
        //     ); // Scale down by 30x at 1x speed
        //     framesPerSecond = 30; // Higher FPS for smoothness
        //   }
        //
        //   // Calculate how much progress to make per frame
        //   const totalFrames = targetDurationSeconds * framesPerSecond;
        //   const progressPerFrame = (positionCount - 1) / totalFrames;
        //
        //   const baseIntervalMs = 1000 / framesPerSecond;
        //
        //   // Store animation settings in viewer for access in animate function
        //   viewer.animationSettings = {
        //     intervalMs: baseIntervalMs,
        //     progressPerFrame: progressPerFrame,
        //     playbackSpeed: currentSpeed,
        //     totalFrames: totalFrames,
        //   };
        //
        //   console.log("Animation settings:", {
        //     positionCount,
        //     currentSpeed,
        //     framesPerSecond,
        //     targetDuration: `${Math.round(targetDurationSeconds)} seconds`,
        //     progressPerFrame: progressPerFrame.toFixed(3),
        //     tileLoadingMode,
        //     actualFlightTime: `${Math.round(actualFlightSeconds)} seconds`,
        //   });
        //   viewer.animationState.continuousPosition = 0; // Float value for smooth interpolation
        //
        //   // Use recursive setTimeout instead of setInterval for better reliability
        //   const animate = () => {
        //     try {
        //       // Ensure animationState exists
        //       if (!viewer.animationState) {
        //         console.error("Animation state not initialized");
        //         return;
        //       }
        //
        //       viewer.animationState.frameCount++;
        //
        //       // Advance the continuous position smoothly
        //       if (!viewer.animationState.continuousPosition) {
        //         viewer.animationState.continuousPosition = 0;
        //       }
        //       // Use calculated progress per frame for proper speed control
        //       viewer.animationState.continuousPosition +=
        //         viewer.animationSettings.progressPerFrame;
        //
        //       // Log progress periodically
        //       if (viewer.animationState.frameCount % 60 === 0) {
        //         const progress = (
        //           (viewer.animationState.continuousPosition /
        //             (displayPositions.length - 1)) *
        //           100
        //         ).toFixed(1);
        //         console.log(
        //           `Animation progress: ${progress}% (position ${viewer.animationState.continuousPosition.toFixed(1)}/${displayPositions.length})`,
        //         );
        //
        //         // Check tile loading status if tileset exists
        //         if (viewer.googleTileset) {
        //           const tileset = viewer.googleTileset;
        //           console.log(
        //             `Tiles - Loaded: ${tileset.statistics.numberOfTilesLoaded}, Total: ${tileset.statistics.numberOfTilesTotal}, Memory: ${(tileset.totalMemoryUsageInBytes / 1048576).toFixed(1)}MB`,
        //           );
        //         }
        //       }
        //
        //       if (!mountedRef.current || !viewer) {
        //         console.log(
        //           "Animation stopped: component unmounted or viewer destroyed",
        //         );
        //         setIsAnimating(false);
        //         return;
        //       }
        //
        //       // Check if animation is complete
        //       if (
        //         viewer.animationState.continuousPosition >=
        //         displayPositions.length - 1
        //       ) {
        //         console.log("Animation completed");
        //         setIsAnimating(false);
        //         viewer.animationState.continuousPosition = 0;
        //         viewer.animationState.currentIndex = 0;
        //         return;
        //       }
        //
        //       // Get the two positions we're interpolating between
        //       const currentIdx = Math.floor(
        //         viewer.animationState.continuousPosition,
        //       );
        //       const nextIdx = Math.min(
        //         currentIdx + 1,
        //         displayPositions.length - 1,
        //       );
        //       const currentPos = displayPositions[currentIdx];
        //       const nextPos = displayPositions[nextIdx];
        //
        //       // Calculate smooth interpolation factor between the two positions
        //       const t = viewer.animationState.continuousPosition - currentIdx;
        //
        //       // Update the visible index for UI
        //       viewer.animationState.currentIndex = currentIdx;
        //
        //       // Check if we've reached the closest point to search location
        //       if (
        //         searchContext &&
        //         adjustedClosestIndex !== null &&
        //         adjustedClosestIndex >= 0 &&
        //         !viewer.animationState.hasStoppedAtClosest
        //       ) {
        //         // Check if we've reached or passed the closest point
        //         if (currentIdx >= adjustedClosestIndex) {
        //           console.log(
        //             "Reached closest point to search location at index",
        //             adjustedClosestIndex,
        //           );
        //           viewer.animationState.hasStoppedAtClosest = true;
        //
        //           // Pause the animation
        //           setIsAnimating(false);
        //
        //           // Orient camera to look at the search location
        //           const currentPosition =
        //             displayPositions[adjustedClosestIndex];
        //           const searchCartesian = window.Cesium.Cartesian3.fromDegrees(
        //             searchContext.lng,
        //             searchContext.lat,
        //             100,
        //           );
        //
        //           // Calculate heading from current position to search location
        //           const deltaLon =
        //             searchContext.lng - currentPosition.longitude;
        //           const deltaLat = searchContext.lat - currentPosition.latitude;
        //           const headingToSearch =
        //             (Math.atan2(deltaLon, deltaLat) * 180) / Math.PI;
        //
        //           // Set camera to look at search location
        //           const viewCartesian = window.Cesium.Cartesian3.fromDegrees(
        //             currentPosition.longitude,
        //             currentPosition.latitude,
        //             currentPosition.altitude_feet * 0.3048,
        //           );
        //
        //           viewer.camera.setView({
        //             destination: viewCartesian,
        //             orientation: {
        //               heading: window.Cesium.Math.toRadians(headingToSearch),
        //               pitch: window.Cesium.Math.toRadians(-15), // Slight downward angle
        //               roll: 0,
        //             },
        //           });
        //
        //           console.log(
        //             "Animation paused at closest point. Camera oriented toward search location.",
        //           );
        //           console.log(
        //             'Click "Start Flight Animation" to continue the flight.',
        //           );
        //
        //           // Don't continue the animation loop
        //           return;
        //         }
        //       }
        //
        //       // Smoothly interpolate position
        //       const interpolatedLat = lerp(
        //         currentPos.latitude,
        //         nextPos.latitude,
        //         t,
        //       );
        //       const interpolatedLon = lerp(
        //         currentPos.longitude,
        //         nextPos.longitude,
        //         t,
        //       );
        //       // Ensure minimum altitude of 1000 feet to prevent rendering artifacts
        //       const rawAlt = lerp(
        //         currentPos.altitude_feet,
        //         nextPos.altitude_feet,
        //         t,
        //       );
        //       const interpolatedAlt = Math.max(rawAlt, 1000);
        //
        //       // Interpolate heading (handling wrap-around at 360 degrees)
        //       let currentHeading = currentPos.track_degrees || 0;
        //       let nextHeading = nextPos.track_degrees || currentHeading;
        //
        //       // Handle heading wrap-around (e.g., 350° to 10°)
        //       if (Math.abs(nextHeading - currentHeading) > 180) {
        //         if (currentHeading > nextHeading) {
        //           nextHeading += 360;
        //         } else {
        //           currentHeading += 360;
        //         }
        //       }
        //       const interpolatedHeading =
        //         lerp(currentHeading, nextHeading, t) % 360;
        //
        //       // Create smooth position (use window.Cesium to ensure access)
        //       let cartesianPos;
        //       try {
        //         cartesianPos = window.Cesium.Cartesian3.fromDegrees(
        //           interpolatedLon,
        //           interpolatedLat,
        //           interpolatedAlt * 0.3048,
        //         );
        //       } catch (e) {
        //         console.error("Error creating Cartesian position:", e);
        //         setIsAnimating(false);
        //         return;
        //       }
        //
        //       // Update helicopter position (use stored reference)
        //       if (viewer.helicopterEntity) {
        //         viewer.helicopterEntity.position = cartesianPos;
        //       }
        //
        //       // Set camera to first-person pilot view with interpolated heading
        //       const heading = window.Cesium.Math.toRadians(interpolatedHeading);
        //       const pitchAngle = -15; // Shallower angle to see more tiles ahead
        //
        //       // Disable tile preloading for performance
        //       viewer.scene.preloadTilesWhenIdle = false;
        //       viewer.scene.requestRenderMode = false; // Continuous rendering for smooth animation
        //
        //       // Preload tiles ahead of current position
        //       const preloadDistance = 10; // Look ahead 10 positions
        //       if (viewer.googleTileset && currentIdx % 30 === 0) {
        //         // Only update every 30 frames to avoid performance issues
        //         // Instead of restricting tile loading, we'll adjust the camera frustum to load more tiles
        //         const currentTileset = viewer.googleTileset;
        //
        //         // Temporarily increase screen space error to load more tiles faster
        //         if (currentTileset.maximumScreenSpaceError > 1) {
        //           currentTileset.maximumScreenSpaceError = Math.max(
        //             1,
        //             currentTileset.maximumScreenSpaceError - 0.1,
        //           );
        //         }
        //
        //         // Ensure tiles are being loaded by not restricting the view
        //         currentTileset.viewerRequestVolume = undefined; // Remove any volume restrictions
        //
        //         // Force tile updates
        //         viewer.scene.requestRender();
        //       }
        //
        //       // Smooth camera movement
        //       try {
        //         viewer.camera.setView({
        //           destination: cartesianPos,
        //           orientation: {
        //             heading: heading,
        //             pitch: window.Cesium.Math.toRadians(pitchAngle),
        //             roll: 0,
        //           },
        //         });
        //
        //         // Optimize quality for performance during animation
        //         if (viewer.googleTileset) {
        //           viewer.animationState.lastPosition =
        //             viewer.animationState.continuousPosition;
        //
        //           // Higher error tolerance for better performance
        //           viewer.googleTileset.maximumScreenSpaceError = 12; // Even more tolerant during movement
        //         }
        //
        //         // Request render to ensure tiles are displayed
        //         viewer.scene.requestRender();
        //       } catch (error) {
        //         console.error("Error setting camera view:", error);
        //         // Don't stop animation on camera errors - keep going
        //       }
        //       // Update slider position based on continuous position
        //       const percentage =
        //         (viewer.animationState.continuousPosition /
        //           (displayPositions.length - 1)) *
        //         100;
        //       setSliderPosition(percentage);
        //
        //       // Schedule next frame with proper delay
        //       const animationInterval =
        //         viewer.animationSettings?.intervalMs || 33; // Default to 30 FPS
        //       // Use setTimeout with the calculated interval
        //       const timeoutId = setTimeout(() => {
        //         animate();
        //       }, animationInterval);
        //       animationRef.current = timeoutId;
        //
        //       // Verify the timeout was actually set
        //       if (!animationRef.current) {
        //         console.error("Failed to set timeout!");
        //         setIsAnimating(false);
        //         return;
        //       }
        //     } catch (error) {
        //       console.error("Error in animation frame:", error);
        //       console.error("Stack trace:", error.stack);
        //       setIsAnimating(false);
        //     }
        //   };

          // Start the animation
          console.log("Starting animation loop with recursive setTimeout");

          // Start animation with initial delay to ensure everything is ready
          console.log("Scheduling initial animation frame...");
        //   setTimeout(() => {
        //     try {
        //       console.log("Starting first animation frame now");
        //       animate();
        //     } catch (error) {
        //       console.error("Error starting animation:", error);
        //       console.error("Stack:", error.stack);
        //       setIsAnimating(false);
        //     }
        //   }, 100); // Small delay to ensure everything is initialized
        // };

        // Store animation function in ref to preserve closure
        // animationFunctionRef.current = animateFlight;

        // Also store on viewer for backwards compatibility
        // viewer.animateFlight = animateFlight;
        // viewer.resetView = () => {
        //   if (animationRef.current) {
        //     clearTimeout(animationRef.current);
        //     animationRef.current = null;
        //     setIsAnimating(false);
        //   }
        //   viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        //   viewer.zoomTo(flightPath, new Cesium.HeadingPitchRange(0, -45, 5000));
        // };
        //
        // // Don't auto-start animation - user can start it manually

        // Wait a moment for Cesium to fully render before hiding loading indicator
        setTimeout(() => {
          console.log("Cesium fully initialized - hiding loading indicator");
          setIsLoading(false);

          // Mark initialization as complete
          isInitializingRef.current = false;
          hasInitializedRef.current = true;
        }, 1000);

        console.log("Cesium initialization complete");
      } catch (err) {
        console.error("Error loading Cesium:", err);
        if (mountedRef.current) {
          // @ts-expect-error err is typed as unknown in catch; message is accessed defensively
            setError(`Failed to load 3D visualization: ${err.message}`);
          setIsLoading(false);
        }
        // Reset initialization flag on error
        isInitializingRef.current = false;
      }
    };

    loadCesium();

    return cleanup;
  }, [positions, cleanup]);

  // Handle external position updates with smooth interpolation
  // useEffect(() => {
  //   if (!viewerRef.current || !mountedRef.current || positions.length === 0)
  //     return;
  //   if (currentPositionIndex < 0 || currentPositionIndex >= positions.length)
  //     return;
  //
  //   const targetPos = positions[currentPositionIndex];
  //   const viewer = viewerRef.current;
  //
  //   // If we have a previous position, interpolate smoothly
  //   if (currentPositionIndex > 0 && !isAnimating) {
  //     const prevIndex = Math.max(0, currentPositionIndex - 1);
  //     const prevPos = positions[prevIndex];
  //
  //     // Calculate number of interpolation steps based on distance
  //     const distance = Math.sqrt(
  //       Math.pow(targetPos.latitude - prevPos.latitude, 2) +
  //         Math.pow(targetPos.longitude - prevPos.longitude, 2),
  //     );
  //     //      const steps = Math.min(15, Math.max(5, Math.floor(distance * 10000)));
  //     const steps = positions.length;
  //     let step = 0;
  //     const interpolationInterval = setInterval(() => {
  //       if (!mountedRef.current || step >= steps) {
  //         clearInterval(interpolationInterval);
  //         return;
  //       }
  //
  //       const t = step / steps;
  //       const smoothT = t * t * (3 - 2 * t); // Smoothstep function for even smoother motion
  //
  //       // Interpolate position
  //       const lat =
  //         prevPos.latitude + (targetPos.latitude - prevPos.latitude) * smoothT;
  //       const lon =
  //         prevPos.longitude +
  //         (targetPos.longitude - prevPos.longitude) * smoothT;
  //       const alt =
  //         prevPos.altitude_feet +
  //         (targetPos.altitude_feet - prevPos.altitude_feet) * smoothT;
  //
  //       // Interpolate heading
  //       let prevHeading = prevPos.track_degrees || 0;
  //       let targetHeading = targetPos.track_degrees || prevHeading;
  //
  //       // Handle wrap-around
  //       if (Math.abs(targetHeading - prevHeading) > 180) {
  //         if (prevHeading > targetHeading) {
  //           targetHeading += 360;
  //         } else {
  //           prevHeading += 360;
  //         }
  //       }
  //       const heading =
  //         (prevHeading + (targetHeading - prevHeading) * smoothT) % 360;
  //
  //       const cartesianPos = window.Cesium.Cartesian3.fromDegrees(
  //         lon,
  //         lat,
  //         alt * 0.3048,
  //       );
  //
  //       viewer.camera.setView({
  //         destination: cartesianPos,
  //         orientation: {
  //           heading: window.Cesium.Math.toRadians(heading),
  //           pitch: window.Cesium.Math.toRadians(-15),
  //           roll: 0,
  //         },
  //       });
  //
  //       step++;
  //     }, 16); // ~60 FPS for very smooth motion
  //   } else {
  //     // Direct jump if no previous position or during animation
  //     const cartesianPos = window.Cesium.Cartesian3.fromDegrees(
  //       targetPos.longitude,
  //       targetPos.latitude,
  //       targetPos.altitude_feet * 0.3048,
  //     );
  //
  //     viewer.camera.setView({
  //       destination: cartesianPos,
  //       orientation: {
  //         heading: window.Cesium.Math.toRadians(targetPos.track_degrees || 0),
  //         pitch: window.Cesium.Math.toRadians(-15),
  //         roll: 0,
  //       },
  //     });
  //   }
  // }, [currentPositionIndex, positions, isAnimating]);

  // Handle external play/pause control
  // useEffect(() => {
  //   if (!viewerRef.current && !animationFunctionRef.current) return;
  //
  //   if (isPlaying && !isAnimating) {
  //     if (animationFunctionRef.current) {
  //       console.log("Starting animation via external play control");
  //       animationFunctionRef.current();
  //     } else if (viewerRef.current?.animateFlight) {
  //       viewerRef.current.animateFlight();
  //     }
  //   } else if (!isPlaying && isAnimating) {
  //     if (animationRef.current) {
  //       clearTimeout(animationRef.current);
  //       animationRef.current = null;
  //       setIsAnimating(false);
  //     }
  //   }
  // }, [isPlaying, isAnimating]);

  const handleStartAnimation = React.useCallback(() => {
    console.log("handleStartAnimation called - using Cesium built-in animation");
    const viewer = (window as any).cesiumViewer;
    const Cesium = window.Cesium;

    if (!tilesReady) {
      console.log("Tiles not ready yet, cannot start animation");
      return;
    }

    if (viewer && viewer.clock && Cesium) {
      console.log("Clock state:", {
        currentTime: viewer.clock.currentTime.toString(),
        startTime: viewer.clock.startTime.toString(),
        stopTime: viewer.clock.stopTime.toString(),
        shouldAnimate: viewer.clock.shouldAnimate,
        multiplier: viewer.clock.multiplier
      });

      // CRITICAL: Ensure continuous rendering is enabled
      viewer.scene.requestRenderMode = false; // Force continuous rendering
      viewer.useDefaultRenderLoop = true; // Ensure default render loop is active

      // IMPORTANT: Disable camera controls during first-person animation
      // This prevents the user from zooming out to extreme altitudes (52 million feet!)
      // which makes labels invisible due to perspective distortion
      viewer.scene.screenSpaceCameraController.enableRotate = false;
      viewer.scene.screenSpaceCameraController.enableZoom = false;
      viewer.scene.screenSpaceCameraController.enableLook = false;
      viewer.scene.screenSpaceCameraController.enableTilt = false;
      viewer.scene.screenSpaceCameraController.enableTranslate = false;
      console.log("Camera controls disabled for first-person animation mode");

      // Use Cesium's built-in clock animation
      viewer.clock.shouldAnimate = true;
      viewer.clock.multiplier = playbackSpeed * 50; // Adjust multiplier based on playback speed
      setIsAnimating(true);
      onAnimationStateChange?.(true);

      console.log("Clock animation started, multiplier:", viewer.clock.multiplier);
      console.log("Render mode:", viewer.scene.requestRenderMode, "useDefaultRenderLoop:", viewer.useDefaultRenderLoop);

      // Debug: Monitor clock updates
      let frameCount = 0;
      const monitorClock = () => {
        if (frameCount < 10) {
          console.log(`Frame ${frameCount}: Clock time:`, viewer.clock.currentTime.toString(),
                      "shouldAnimate:", viewer.clock.shouldAnimate);
          frameCount++;
          requestAnimationFrame(monitorClock);
        }
      };
      requestAnimationFrame(monitorClock);

      // Manually update camera on each frame instead of using trackedEntity
      if (viewer.helicopterEntity) {
        console.log("Setting up manual first-person camera tracking");
        console.log("Helicopter entity:", {
          id: viewer.helicopterEntity.id,
          hasPosition: !!viewer.helicopterEntity.position,
          hasOrientation: !!viewer.helicopterEntity.orientation
        });

        // Remove any existing render listeners
        if (viewer._cameraUpdateListener) {
          viewer.scene.preRender.removeEventListener(viewer._cameraUpdateListener);
        }

        // Create a render listener to update camera position every frame
        const updateCamera = () => {
          if (!viewer.clock.shouldAnimate) return;

          const currentTime = viewer.clock.currentTime;
          const position = viewer.helicopterEntity.position.getValue(currentTime);
          const orientation = viewer.helicopterEntity.orientation.getValue(currentTime);

          if (position && orientation) {
            // Convert quaternion to heading/pitch/roll
            const hpr = Cesium.HeadingPitchRoll.fromQuaternion(orientation);

            // Calculate current position index for distance check
            const startTime = viewer.clock.startTime;
            const elapsedSeconds = Cesium.JulianDate.secondsDifference(currentTime, startTime);
            const positionIndex = Math.floor((elapsedSeconds / 5));

            // Check if within hover area or search radius and adjust camera/speed
            let cameraPitch = Cesium.Math.toRadians(-5); // Default: mostly level with slight downward tilt for horizon visibility
            let isWithinSearchRadius = false;
            let isInHoverArea = false;

            // Get current camera pitch mode from ref (for stable closure)
            const currentPitchMode = cameraPitchModeRef.current;

            // Determine camera pitch based on mode
            if (currentPitchMode === 'level') {
              cameraPitch = Cesium.Math.toRadians(-5); // Level view
            } else if (currentPitchMode === 'moderate') {
              cameraPitch = Cesium.Math.toRadians(-40); // Moderate downward angle
            } else if (currentPitchMode === 'steep') {
              cameraPitch = Cesium.Math.toRadians(-50); // Steep downward angle
            }
            // else 'auto' mode - will be set based on hover/search detection below

            // Check if current position is within a hover location time range
            if (currentPitchMode === 'auto' && hoverLocations && hoverLocations.length > 0 && positionIndex >= 0 && positionIndex < positions.length) {
              const currentPos = positions[positionIndex];
              const currentPosTime = new Date(currentPos.timestamp).getTime();

              for (const hoverLoc of hoverLocations) {
                if (!hoverLoc.start_time || !hoverLoc.end_time) continue;
                const hoverStartTime = new Date(hoverLoc.start_time).getTime();
                const hoverEndTime = new Date(hoverLoc.end_time).getTime();

                if (currentPosTime >= hoverStartTime && currentPosTime <= hoverEndTime) {
                  isInHoverArea = true;
                  cameraPitch = Cesium.Math.toRadians(-70); // Look straight down in hover areas (bird's eye view)

                  // Slow down to 10x speed when in hover area
                  const hoverSpeed = playbackSpeed * 10;

                  if (Math.abs(viewer.clock.multiplier - hoverSpeed) > 0.1) {
                    viewer.clock.multiplier = hoverSpeed;
                    console.log(`Entering hover area - slowing to ${hoverSpeed.toFixed(1)}x to show ${hoverLoc.duration_minutes.toFixed(1)} min hover`);
                  }

                  // IMPORTANT: Store the center of hover location to lock camera heading
                  if (!viewer._hoverCenterHeading) {
                    // Calculate heading from current position to hover center
                    const deltaLng = hoverLoc.longitude - currentPos.longitude;
                    const deltaLat = hoverLoc.latitude - currentPos.latitude;
                    viewer._hoverCenterHeading = Math.atan2(deltaLng, deltaLat);
                    console.log("Locked camera heading for hover area");
                  }
                  break;
                }
              }

              // Clear the locked heading when leaving hover area
              if (!isInHoverArea && viewer._hoverCenterHeading !== undefined) {
                viewer._hoverCenterHeading = undefined;
                console.log("Unlocked camera heading - exiting hover area");
              }
            }

            // Check search radius (only if not in hover area - hover takes priority, and only in auto mode)
            if (currentPitchMode === 'auto' && !isInHoverArea && searchContext && positionIndex >= 0 && positionIndex < positions.length) {
              const currentPos = positions[positionIndex];

              // Calculate distance from search location
              const R = 3959; // Earth's radius in miles
              const lat1 = searchContext.lat * Math.PI / 180;
              const lat2 = currentPos.latitude * Math.PI / 180;
              const dLat = (currentPos.latitude - searchContext.lat) * Math.PI / 180;
              const dLng = (currentPos.longitude - searchContext.lng) * Math.PI / 180;

              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                       Math.cos(lat1) * Math.cos(lat2) *
                       Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceInMiles = R * c;
              const searchRadiusMiles = searchContext.radius / 1609.34; // Convert meters to miles

              if (distanceInMiles <= searchRadiusMiles) {
                isWithinSearchRadius = true;

                // Only change camera angle when slow-down is enabled
                if (enableSlowdownInRadiusRef.current) {
                  cameraPitch = Cesium.Math.toRadians(-40); // Look down steeply (40 degrees)

                  // Slow down to 1/10th speed when in search radius
                  const slowSpeed = (playbackSpeed * 50) / 10;
                  if (Math.abs(viewer.clock.multiplier - slowSpeed) > 0.1) {
                    viewer.clock.multiplier = slowSpeed;
                    console.log("Entering search radius - slowing down 10x and looking down");
                  }
                }
              }
            }

            // If not in any special area, return to normal speed
            if (!isInHoverArea && !isWithinSearchRadius) {
              const normalSpeed = playbackSpeed * 50;
              if (Math.abs(viewer.clock.multiplier - normalSpeed) > 0.1) {
                viewer.clock.multiplier = normalSpeed;
                console.log("Returning to normal speed");
              }
            }

            // Set camera to entity position with first-person orientation
            // Airbus H125 has bubble canopy with excellent visibility:
            // - Forward: 180° horizontal, -70° to +40° vertical
            // - Sides: 120° per side with large windows
            // - Downward: 70° through floor bubble (excellent for observation)

            // Use locked heading during hover, otherwise follow helicopter heading
            const cameraHeading = (isInHoverArea && viewer._hoverCenterHeading !== undefined)
              ? viewer._hoverCenterHeading
              : hpr.heading;

            // Override camera pitch if look-down view is enabled
            if (lookDownViewRef.current) {
              cameraPitch = Cesium.Math.toRadians(-75); // Nearly straight down (75 degrees)
            }

            // Handle third-person view
            if (thirdPersonViewRef.current) {
              // Follow camera: position behind and slightly above the helicopter
              const distanceBehind = 100; // meters (~328 feet)
              const heightAbove = 20; // meters (~65 feet)

              // Get helicopter's current heading
              const heading = hpr.heading;

              // Create offset vector pointing backward from helicopter's heading
              // Heading of 0 = North, π/2 = East, π = South, 3π/2 = West
              // We want to go opposite the heading direction
              const backwardHeading = heading + Math.PI; // 180 degrees opposite

              // Calculate offset in ENU (East-North-Up) coordinates
              const offsetENU = new Cesium.Cartesian3(
                distanceBehind * Math.sin(backwardHeading), // East
                distanceBehind * Math.cos(backwardHeading), // North
                heightAbove // Up
              );

              // Convert helicopter position to cartographic to get the local reference frame
              const helicopterCarto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);

              // Get transform from ENU to world coordinates at helicopter location
              const transformMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);

              // Transform offset from ENU to world coordinates
              const offsetWorld = Cesium.Matrix4.multiplyByPoint(
                transformMatrix,
                offsetENU,
                new Cesium.Cartesian3()
              );

              // Calculate camera position (offset from helicopter)
              const cameraPosition = offsetWorld;

              // Camera looks forward in the direction of helicopter's heading
              // This creates a smooth follow-cam effect
              const forwardDirection = new Cesium.Cartesian3(
                Math.sin(heading),
                Math.cos(heading),
                -0.1 // Slight downward tilt to see helicopter better
              );

              // Transform forward direction to world coordinates
              const forwardWorld = Cesium.Matrix4.multiplyByPointAsVector(
                transformMatrix,
                forwardDirection,
                new Cesium.Cartesian3()
              );

              // Normalize the direction vector
              const direction = Cesium.Cartesian3.normalize(forwardWorld, new Cesium.Cartesian3());

              // Up vector (perpendicular to surface at camera location)
              const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(cameraPosition, new Cesium.Cartesian3());

              viewer.camera.setView({
                destination: cameraPosition,
                orientation: {
                  direction: direction,
                  up: up
                }
              });

              // Make helicopter billboard visible in third-person
              if (viewer.helicopterEntity && viewer.helicopterEntity.billboard) {
                viewer.helicopterEntity.billboard.show = true;
              }
            } else {
              // First-person view
              viewer.camera.setView({
                destination: position,
                orientation: {
                  heading: cameraHeading, // Lock heading during hover to prevent spinning
                  pitch: cameraPitch, // Dynamic pitch based on location or look-down override
                  roll: 0
                }
              });

              // Hide helicopter billboard in first-person
              if (viewer.helicopterEntity && viewer.helicopterEntity.billboard) {
                viewer.helicopterEntity.billboard.show = false;
              }
            }

            // Set realistic H125 field of view (90° horizontal is realistic for pilot view)
            // Default Cesium FOV is 60°, H125 bubble canopy allows wider view
            viewer.camera.frustum.fov = Cesium.Math.toRadians(90);

            // Update slider position based on clock time
            const stopTime = viewer.clock.stopTime;
            const totalSeconds = Cesium.JulianDate.secondsDifference(stopTime, startTime);
            const percentage = (elapsedSeconds / totalSeconds) * 100;
            setSliderPosition(Math.min(100, Math.max(0, percentage)));

            // DYNAMIC LABEL UPDATES: Regenerate labels as helicopter moves
            // Track last label update position to avoid excessive updates
            if (!viewer._lastLabelUpdatePos) {
              viewer._lastLabelUpdatePos = { lat: 0, lng: 0 };
              viewer._labelUpdateFrameCount = 0;
            }

            // Check if we should update labels (every 60 frames AND moved > 1.5 miles)
            viewer._labelUpdateFrameCount++;
            if (viewer._labelUpdateFrameCount > 60 && positionIndex >= 0 && positionIndex < positions.length) {
              const currentPos = positions[positionIndex];
              const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
              const currentLat = Cesium.Math.toDegrees(carto.latitude);
              const currentLng = Cesium.Math.toDegrees(carto.longitude);

              // Calculate distance moved since last label update
              const R = 3959; // Earth radius in miles
              const dLat = (currentLat - viewer._lastLabelUpdatePos.lat) * Math.PI / 180;
              const dLng = (currentLng - viewer._lastLabelUpdatePos.lng) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(viewer._lastLabelUpdatePos.lat * Math.PI / 180) * Math.cos(currentLat * Math.PI / 180) *
                       Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distanceMoved = R * c;

              // Update labels if moved > 1.5 miles
              if (distanceMoved > 1.5 && (window as any).phoenixLabelsData) {
                console.log(`Helicopter moved ${distanceMoved.toFixed(2)} miles - regenerating labels`);

                // Remove all existing ground label entities (keep helicopter and other markers)
                const entitiesToRemove: any[] = [];
                for (let i = 0; i < viewer.entities.values.length; i++) {
                  const entity = viewer.entities.values[i];
                  if (entity.name && entity.name.startsWith('Ground Label:')) {
                    entitiesToRemove.push(entity);
                  }
                }
                entitiesToRemove.forEach(e => viewer.entities.remove(e));
                console.log(`Removed ${entitiesToRemove.length} old ground labels`);

                // Regenerate labels centered on current helicopter position
                const phoenixLabels = (window as any).phoenixLabelsData;
                const getDistanceFeet = (lat1, lng1, lat2, lng2) => {
                  const R = 20925721; // Earth radius in feet
                  const dLat = (lat2 - lat1) * Math.PI / 180;
                  const dLng = (lng2 - lng1) * Math.PI / 180;
                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                           Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                           Math.sin(dLng/2) * Math.sin(dLng/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  return R * c;
                };

                // Get labels within 10 miles of current position
                const nearbyLabels = phoenixLabels
                  .map(label => ({
                    ...label,
                    distance: getDistanceFeet(currentLat, currentLng, label.lat, label.lng)
                  }))
                  .filter(label => label.distance <= 52800) // 10 miles
                  .sort((a, b) => a.distance - b.distance);

                // Prioritize: 2 closest areas + 15 closest streets (tiers 1-3) + always-show labels
                const areas = nearbyLabels.filter(l => l.tier === 0).slice(0, 2);
                const alwaysShowLabels = phoenixLabels
                  .filter(l => l.alwaysShow)
                  .map(label => ({
                    ...label,
                    distance: getDistanceFeet(currentLat, currentLng, label.lat, label.lng)
                  }));
                const streets = nearbyLabels.filter(l => l.tier >= 1 && l.tier <= 3 && !l.alwaysShow).slice(0, 15);
                const labelsToShow = [...areas, ...alwaysShowLabels, ...streets];

                console.log(`Updating ${labelsToShow.length} labels for 2D list (${areas.length} areas, ${alwaysShowLabels.length} always-show, ${streets.length} streets)`);

                // Update the 2D label list state
                setNearbyLabels(labelsToShow.map(label => ({
                  name: label.name,
                  tier: label.tier,
                  distance: label.distance / 5280, // Convert feet to miles
                  type: label.type,
                  alwaysShow: label.alwaysShow
                })));

                // Create ground-level street labels for look-down view (only streets, not areas)
                const streetsForGroundLabels = labelsToShow.filter(l => l.tier >= 1 && l.tier <= 2).slice(0, 10);
                streetsForGroundLabels.forEach((label, index) => {
                  let fontSize, color;

                  if (label.tier === 1) {
                    fontSize = 20;
                    color = Cesium.Color.fromCssColorString('rgba(255, 170, 0, 0.9)'); // Amber for highways
                  } else {
                    fontSize = 18;
                    color = Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.85)'); // Cyan for streets
                  }

                  viewer.entities.add({
                    name: `Ground Label: ${label.name}`,
                    position: Cesium.Cartesian3.fromDegrees(label.lng, label.lat, 0),
                    label: {
                      text: label.name,
                      font: `bold ${fontSize}px monospace`,
                      fillColor: color,
                      outlineColor: Cesium.Color.BLACK,
                      outlineWidth: 3,
                      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                      verticalOrigin: Cesium.VerticalOrigin.CENTER,
                      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                      disableDepthTestDistance: Number.POSITIVE_INFINITY,
                      // Show only when camera is looking down (pitch < -60 degrees)
                      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15840), // Within 3 miles
                      scale: 0.8,
                      pixelOffset: new Cesium.Cartesian2(0, (index % 3) * 25), // Slight vertical offset to prevent overlap
                    }
                  });
                });

                // Update last position and reset frame counter
                viewer._lastLabelUpdatePos = { lat: currentLat, lng: currentLng };
                viewer._labelUpdateFrameCount = 0;
              }
            }

            // Update HUD data
            // Reuse positionIndex already calculated above
            if (positionIndex >= 0 && positionIndex < positions.length) {
              const currentPos = positions[positionIndex];

              // Calculate time remaining in flight
              const timeRemainingSeconds = Cesium.JulianDate.secondsDifference(stopTime, currentTime);

              // Calculate distance from search location if available
              let distanceFromSearch = 0;
              let timeToSearchRadius = 0;
              let withinRadius = false;

              if (searchContext) {
                const R = 3959; // Earth's radius in miles
                const lat1 = searchContext.lat * Math.PI / 180;
                const lat2 = currentPos.latitude * Math.PI / 180;
                const dLat = (currentPos.latitude - searchContext.lat) * Math.PI / 180;
                const dLng = (currentPos.longitude - searchContext.lng) * Math.PI / 180;

                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                         Math.cos(lat1) * Math.cos(lat2) *
                         Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distanceFromSearch = R * c;

                const searchRadiusMiles = searchContext.radius / 1609.34;
                withinRadius = distanceFromSearch <= searchRadiusMiles;

                // Calculate time to search radius if not already there
                if (!withinRadius) {
                  // Look ahead to find when we enter the search radius
                  for (let i = positionIndex + 1; i < positions.length; i++) {
                    const futurePos = positions[i];
                    const futureLat = futurePos.latitude * Math.PI / 180;
                    const futureDLat = (futurePos.latitude - searchContext.lat) * Math.PI / 180;
                    const futureDLng = (futurePos.longitude - searchContext.lng) * Math.PI / 180;

                    const futureA = Math.sin(futureDLat / 2) * Math.sin(futureDLat / 2) +
                                   Math.cos(lat1) * Math.cos(futureLat) *
                                   Math.sin(futureDLng / 2) * Math.sin(futureDLng / 2);
                    const futureC = 2 * Math.atan2(Math.sqrt(futureA), Math.sqrt(1 - futureA));
                    const futureDistance = R * futureC;

                    if (futureDistance <= searchRadiusMiles) {
                      // Found when we enter radius
                      timeToSearchRadius = (i - positionIndex) * 5; // 5 seconds per position
                      break;
                    }
                  }
                }
              }

              setHudData({
                speed: knotsToMph(currentPos.ground_speed_knots || 0),
                altitude: currentPos.altitude_feet || 0,
                heading: Cesium.Math.toDegrees(hpr.heading),
                groundElevation: currentPos.ground_elevation_feet || 0,
                altitudeAGL: currentPos.altitude_agl_feet || 0,
                distanceFromSearch: distanceFromSearch,
                timeRemaining: timeRemainingSeconds,
                timeToSearchRadius: timeToSearchRadius,
                isWithinSearchRadius: withinRadius,
              });
            }
          }
        };

        // Store listener reference for cleanup
        viewer._cameraUpdateListener = updateCamera;

        // Add the listener to update camera on every frame
        viewer.scene.preRender.addEventListener(updateCamera);

        console.log("Manual camera tracking enabled - camera will update on every frame");
      } else {
        console.error("No helicopter entity found!");
      }
    } else {
      console.log("Cesium viewer not available:", {
        hasViewer: !!viewer,
        hasClock: !!viewer?.clock,
        hasCesium: !!Cesium
      });
    }
  }, [tilesReady, playbackSpeed, onAnimationStateChange]);

  // Expose start animation function to parent
  React.useEffect(() => {
    if (onStartAnimationRef) {
      onStartAnimationRef.current = handleStartAnimation;
    }
  }, [onStartAnimationRef, handleStartAnimation]);

  const handleStopAnimation = React.useCallback(() => {
    const viewer = (window as any).cesiumViewer;
    if (viewer && viewer.clock) {
      viewer.clock.shouldAnimate = false;

      // Re-enable camera controls when animation stops
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      console.log("Camera controls re-enabled");

      // Clean up camera update listener
      if (viewer._cameraUpdateListener) {
        viewer.scene.preRender.removeEventListener(viewer._cameraUpdateListener);
        viewer._cameraUpdateListener = null;
      }

      setIsAnimating(false);
      onAnimationStateChange?.(false);
      onHudDataChange?.(null); // Clear HUD data when animation stops
      console.log("Animation stopped and camera listener removed");
    }
  }, [onAnimationStateChange, onHudDataChange]);

  // Expose stop animation function to parent
  React.useEffect(() => {
    if (onStopAnimationRef) {
      onStopAnimationRef.current = handleStopAnimation;
    }
  }, [onStopAnimationRef, handleStopAnimation]);

  // Notify parent of HUD data changes
  React.useEffect(() => {
    if (isAnimating && onHudDataChange) {
      onHudDataChange(hudData);
    }
  }, [isAnimating, hudData, onHudDataChange]);

  const handleResetView = () => {
    const viewer = (window as any).cesiumViewer;
    if (viewer) {
      // Reset to home view
      viewer.camera.flyHome(1);
    }
  };

  const handleSliderChange = (value: number) => {
    setSliderPosition(value);

    // Get the actual Cesium viewer from window
    const viewer = (window as any).cesiumViewer;
    if (!viewer || !window.Cesium) {
      console.error("Cesium viewer not available");
      return;
    }

    // Calculate target index and time
    const targetIndex = Math.floor((value / 100) * (positions.length - 1));

    // CRITICAL FIX: Update the Cesium clock's current time
    // This ensures animation continues from the new position
    const startTime = viewer.clock.startTime;
    const stopTime = viewer.clock.stopTime;
    const totalSeconds = window.Cesium.JulianDate.secondsDifference(stopTime, startTime);
    const targetSeconds = (value / 100) * totalSeconds;

    // Set the clock to the new time
    viewer.clock.currentTime = window.Cesium.JulianDate.addSeconds(
      startTime,
      targetSeconds,
      new window.Cesium.JulianDate()
    );

    if (positions[targetIndex]) {
      const targetPos = positions[targetIndex];

      try {
        const cartesianPos = window.Cesium.Cartesian3.fromDegrees(
          targetPos.longitude,
          targetPos.latitude,
          targetPos.altitude_feet * 0.3048,
        );

        viewer.camera.setView({
          destination: cartesianPos,
          orientation: {
            heading: window.Cesium.Math.toRadians(targetPos.track_degrees || 0),
            pitch: window.Cesium.Math.toRadians(-15),
            roll: 0,
          },
        });
      } catch (error) {
        console.error("Error updating camera position:", error);
      }
    }
  };

  const handleJumpToClosest = () => {
    if (closestPointIndex !== null) {
      const percentage = (closestPointIndex / (positions.length - 1)) * 100;
      handleSliderChange(percentage);
    }
  };

  if (error) {
    return (
      <div className="w-full h-[800px] flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center text-white">
          <div className="text-red-400 mb-2">⚠️ Error Loading CesiumJS</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-2">
      {/* Map Container */}
      <div
        ref={containerRef}
        className="w-full h-[800px] bg-gray-900 rounded-lg relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading Google Photorealistic 3D View...</div>
            </div>
          </div>
        )}

        {/* Flight HUD - Division-inspired holographic display */}
        {!isLoading && positions.length > 0 && (
          <FlightHUD
            data={{
              speed: hudData.speed,
              altitude: hudData.altitude,
              heading: hudData.heading,
              groundElevation: hudData.groundElevation,
              altitudeAGL: hudData.altitudeAGL,
              distanceFromSearch: hudData.distanceFromSearch,
              timeRemaining: hudData.timeRemaining,
              timeToSearchRadius: hudData.timeToSearchRadius,
              isWithinSearchRadius: hudData.isWithinSearchRadius,
              timestamp: positions[Math.floor(sliderPosition / 100 * (positions.length - 1))]?.timestamp,
            }}
            showSearchInfo={!!searchContext}
          />
        )}

        {/* Surveillance Radius Alert - Show center alert when in radius */}
        {!isLoading && isAnimating && searchContext && hudData.isWithinSearchRadius && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="bg-red-600/90 backdrop-blur text-white px-8 py-6 rounded-xl font-mono text-center border-4 border-red-400/50 shadow-2xl animate-pulse">
              <div className="text-sm font-bold mb-2 tracking-wider">⚠ SURVEILLANCE RADIUS ⚠</div>
              <div className="text-5xl font-bold tabular-nums">
                {formatTime(hudData.timeRemaining)}
              </div>
              <div className="text-xs mt-2 opacity-80">Time in radius this pass</div>
            </div>
          </div>
        )}

        {/* Right-side locations panel. top-44 clears the HUD's default position
            (the HUD is independently draggable; dragging it here is the user's
            choice); bottom-10 clears the relocated bottom-right attribution
            strip so the expanded card never covers it. pointer-events-none on
            the wrapper + auto on the card keeps the gaps click-through for
            camera dragging. */}
        {!isLoading && positions.length > 0 && (
          <div className="absolute right-4 top-44 bottom-10 z-30 flex flex-col items-end pointer-events-none">
            {/* 2D Street Label List - Shows nearby streets and areas */}
            <StreetLabelList labels={nearbyLabels} className="flex-1 min-h-0" />
          </div>
        )}

        {/* Phoenix Area Minimap - moved to the bottom-left (the corner the
            Cesium/Google attribution used to occupy; we relocated that to the
            bottom-right at viewer init). */}
        {!isLoading && positions.length > 0 && viewerRef.current && (
          <PhoenixMinimap
            viewer={viewerRef.current}
            flightPath={positions.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
            currentPosition={positions[Math.floor(sliderPosition / 100 * (positions.length - 1))] ? {
              latitude: positions[Math.floor(sliderPosition / 100 * (positions.length - 1))].latitude,
              longitude: positions[Math.floor(sliderPosition / 100 * (positions.length - 1))].longitude,
            } : undefined}
            className="absolute bottom-4 left-4 z-[9999]"
            size={200}
            onClick={(latitude, longitude) => {
              // Navigate camera to clicked location
              if (viewerRef.current && window.Cesium) {
                const Cesium = window.Cesium;
                viewerRef.current.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 5000),
                  duration: 1.5,
                });
              }
            }}
          />
        )}
      </div>

      {!isLoading && (
        <>
          {/* Compact Flight Timeline Slider - Below the map */}
          {positions.length > 0 && (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur p-2 rounded-lg shadow-md">
              <div className="flex items-center gap-2">
                {/* Jump to closest button (if available) */}
                {searchContext && closestPointIndex !== null && (
                  <button
                    onClick={handleJumpToClosest}
                    className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors whitespace-nowrap flex-shrink-0"
                    title="Jump to closest point to search location"
                  >
                    📍
                  </button>
                )}

                {/* Slider */}
                <div className="flex-grow relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={sliderPosition}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${sliderPosition}%, #E5E7EB ${sliderPosition}%, #E5E7EB 100%)`,
                    }}
                  />

                  {/* Hover location markers - Red dots */}
                  {hoverLocations && hoverLocations.map((hoverLoc, idx) => {
                    // Find position indices that match this hover location's time range
                    if (!hoverLoc.start_time || !hoverLoc.end_time) return null;
                    const hoverStartTime = new Date(hoverLoc.start_time).getTime();
                    const hoverEndTime = new Date(hoverLoc.end_time).getTime();

                    // Find all positions within this hover time range
                    const hoverPositionIndices: number[] = [];
                    positions.forEach((pos, posIdx) => {
                      const posTime = new Date(pos.timestamp).getTime();
                      if (posTime >= hoverStartTime && posTime <= hoverEndTime) {
                        hoverPositionIndices.push(posIdx);
                      }
                    });

                    // Use the middle position of the hover range for the marker
                    if (hoverPositionIndices.length > 0) {
                      const middleIdx = hoverPositionIndices[Math.floor(hoverPositionIndices.length / 2)];
                      return (
                        <div
                          key={`hover-${idx}`}
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md cursor-pointer hover:scale-150 transition-transform"
                          style={{
                            left: `${(middleIdx / (positions.length - 1)) * 100}%`,
                            transform: "translateX(-50%) translateY(-50%)",
                            zIndex: 15,
                          }}
                          title={`Hover location: ${hoverLoc.duration_minutes.toFixed(1)} min`}
                          onClick={() => handleSliderChange((middleIdx / (positions.length - 1)) * 100)}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Low altitude markers - Yellow dots */}
                  {positions.map((pos, idx) => {
                    if (pos.altitude_feet < 500 && pos.over_private_property) {
                      return (
                        <div
                          key={`low-alt-${idx}`}
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full shadow-sm cursor-pointer hover:scale-150 transition-transform"
                          style={{
                            left: `${(idx / (positions.length - 1)) * 100}%`,
                            transform: "translateX(-50%) translateY(-50%)",
                            zIndex: 12,
                          }}
                          title={`Low altitude: ${pos.altitude_feet} ft over residential`}
                          onClick={() => handleSliderChange((idx / (positions.length - 1)) * 100)}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Closest point marker - Orange dot */}
                  {searchContext && closestPointIndex !== null && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full shadow-sm pointer-events-none"
                      style={{
                        left: `${(closestPointIndex / (positions.length - 1)) * 100}%`,
                        transform: "translateX(-50%) translateY(-50%)",
                        zIndex: 10,
                      }}
                      title="Closest to search location"
                    >
                      <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                  )}
                </div>

                {/* Position counter */}
                <span className="text-xs text-gray-600 dark:text-gray-300 font-mono whitespace-nowrap flex-shrink-0">
                  {Math.floor((sliderPosition / 100) * (positions.length - 1)) + 1}/{positions.length}
                </span>
              </div>

              {/* Timeline Legend and Controls */}
              <div className="flex items-center justify-between mt-2 text-xs px-1">
                {/* Legend items */}
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  {hoverLocations && hoverLocations.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                      <span>Hover locations</span>
                    </div>
                  )}
                  {positions.some(p => p.altitude_feet < 500 && p.over_private_property) && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Low altitude</span>
                    </div>
                  )}
                  {searchContext && closestPointIndex !== null && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Search location</span>
                    </div>
                  )}
                </div>

                {/* View controls */}
                <div className="flex items-center gap-3">
                  {/* Look-down view toggle */}
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={lookDownView}
                      onChange={(e) => setLookDownView(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                    <span className="text-xs font-medium">Look down</span>
                  </label>

                  {/* Third-person view toggle */}
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={thirdPersonView}
                      onChange={(e) => setThirdPersonView(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-500 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                    <span className="text-xs font-medium">3rd person</span>
                  </label>

                  {/* Slow-down toggle (only show if search context exists) */}
                  {searchContext && (
                    <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={enableSlowdownInRadius}
                        onChange={(e) => setEnableSlowdownInRadius(e.target.checked)}
                        className="w-3.5 h-3.5 text-cyan-500 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                      <span className="text-xs font-medium">Slow in radius</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Radio Audio Indicators - Division-inspired audio availability display */}
          {positions.length > 0 && radioArchives.length > 0 && (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur p-3 rounded-lg shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Radio Communications
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {radioArchives.length} archive{radioArchives.length !== 1 ? 's' : ''} available
                </span>
              </div>
              <RadioAudioIndicator
                archives={radioArchives}
                currentTimestamp={positions[Math.floor(sliderPosition / 100 * (positions.length - 1))]?.timestamp}
                isPlaying={isAnimating}
                onPlayAudio={(filename, timestamp) => {
                  console.log(`Playing audio: ${filename} at ${timestamp}`);
                  // Open audio in new window for now
                  window.open(`/api/v1/radio/archives/${filename}/audio`, '_blank');
                }}
              />
            </div>
          )}

          {/* CAD Activity Panel - Division-inspired activity visualization */}
          {positions.length > 0 && radioActivity.length > 0 && (
            <CADActivityPanel
              segments={radioActivity}
              currentTimestamp={positions[Math.floor(sliderPosition / 100 * (positions.length - 1))]?.timestamp}
            />
          )}
        </>
      )}
    </div>
  );
};

export default FlightVisualization3DCesiumFixed;
