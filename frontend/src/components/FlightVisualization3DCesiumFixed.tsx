import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles/slider.css";

declare global {
  interface Window {
    Cesium: any;
  }
}

interface FlightPosition {
  latitude: number;
  longitude: number;
  altitude_feet: number;
  timestamp: string;
  is_hovering?: boolean;
  hover_duration_seconds?: number;
  track_degrees?: number;
  ground_speed_knots?: number;
  ground_elevation_feet?: number;
  altitude_agl_feet?: number;
}

interface FlightVisualization3DCesiumFixedProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export const FlightVisualization3DCesiumFixed: React.FC<
  FlightVisualization3DCesiumFixedProps
> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cesiumContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
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
        window.CESIUM_BASE_URL =
          "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/";

        // Set Cesium Ion default access token (your personal token)
        Cesium.Ion.defaultAccessToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiM2FlZDAyOS00ZjE4LTQ0NjItOTY4ZC0xNzQyNGIzNjhhOTkiLCJpZCI6MzQ2MjQ4LCJpYXQiOjE3NTkzMDkyMjl9.zkS_2D4Y8scZkqmS_lckpl2G_7c8sGaFwMazm26eAT0";

        // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
        const viewer = new Cesium.Viewer("cesiumContainer", {
          terrain: Cesium.Terrain.fromWorldTerrain(),
          navigationHelpButton: false,
          animation: true,
          timeline: true,
          fullscreenButton: false,
          vrButton: false,
        });
        const osmBuildings = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(osmBuildings);

        // Mark tiles as ready since we're using OSM buildings
        setTilesReady(true);
        setTileLoadProgress(100);
        const flightData = positions.map((pos, idx) => {
          return {
            longitude: pos.longitude,
            latitude: pos.latitude,
            height: pos.altitude_feet,
            timestamp: pos.timestamp,
          };
        });

        const timeStepInSeconds = 5;
        const totalSeconds = timeStepInSeconds * (flightData.length - 1);
        const start = Cesium.JulianDate.fromIso8601(flightData[0].timestamp);
        const stop = Cesium.JulianDate.addSeconds(
          start,
          totalSeconds,
          new Cesium.JulianDate(),
        );
        viewer.clock.startTime = start.clone();
        viewer.clock.stopTime = stop.clone();
        viewer.clock.currentTime = start.clone();
        viewer.timeline.zoomTo(start, stop);
        // Speed up the playback speed 50x.
        viewer.clock.multiplier = 50;
        // Start playing the scene.
        viewer.clock.shouldAnimate = true;

        // The SampledPositionedProperty stores the position and timestamp for each sample along the radar sample series.
        const positionProperty = new Cesium.SampledPositionProperty();

        for (let i = 0; i < flightData.length; i++) {
          const dataPoint = flightData[i];

          // Declare the time for this individual sample and store it in a new JulianDate instance.
          const time = Cesium.JulianDate.addSeconds(
            start,
            i * timeStepInSeconds,
            new Cesium.JulianDate(),
          );
          const position = Cesium.Cartesian3.fromDegrees(
            dataPoint.longitude,
            dataPoint.latitude,
            dataPoint.height,
          );
          // Store the position along with its timestamp.
          // Here we add the positions all upfront, but these can be added at run-time as samples are received from a server.
          positionProperty.addSample(time, position);

          viewer.entities.add({
            description: `Location: (${dataPoint.longitude}, ${dataPoint.latitude}, ${dataPoint.height})`,
            position: position,
            point: { pixelSize: 10, color: Cesium.Color.RED },
          });
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
          // Use a billboard to represent the helicopter
          billboard: {
            image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRleHQgeD0iNSIgeT0iNDAiIGZvbnQtc2l6ZT0iNDgiPvCfmoE8L3RleHQ+PC9zdmc+",
            scale: 0.8,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
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

        // Hide credits
        // viewer.cesiumWidget.creditContainer.style.display = "none";

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

        // Create flight path
        const flightPath = viewer.entities.add({
          name: "Flight Path",
          polyline: {
            positions: cartesianPositions,
            width: 4,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.RED.withAlpha(0.9),
            }),
            clampToGround: false,
            show: true,
          },
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

          viewer.searchMarker = searchMarker;
        }

        // Start with first-person pilot view
        const startPos = displayPositions[0];
        // Use reasonable altitude to prevent rendering artifacts
        const startAltitude = Math.max(startPos.altitude_feet || 1000, 1000); // Minimum 1000ft to prevent artifacts
        const startCartesian = Cesium.Cartesian3.fromDegrees(
          startPos.longitude,
          startPos.latitude,
          startAltitude * 0.3048,
        );

        // Set initial first-person view with proper pitch
        const heading = Cesium.Math.toRadians(startPos.track_degrees || 0);
        const pitchAngle = -25; // Moderate downward angle

        // Initial camera setup
        console.log("Setting initial camera position:", {
          lat: startPos.latitude,
          lon: startPos.longitude,
          alt: startAltitude,
          heading: startPos.track_degrees || 0,
          pitch: pitchAngle,
        });

        // Set camera immediately with Phoenix coordinates
        viewer.camera.setView({
          destination: startCartesian,
          orientation: {
            heading: heading,
            pitch: Cesium.Math.toRadians(pitchAngle),
            roll: 0,
          },
        });
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

  const handleStartAnimation = () => {
    console.log("handleStartAnimation called - using Cesium built-in animation");
    const viewer = (window as any).cesiumViewer;
    if (viewer && viewer.clock) {
      // Use Cesium's built-in clock animation
      viewer.clock.shouldAnimate = true;
      viewer.clock.multiplier = playbackSpeed * 50; // Adjust multiplier based on playback speed
      setIsAnimating(true);

      // Track the helicopter entity with the camera
      if (viewer.helicopterEntity) {
        viewer.trackedEntity = viewer.helicopterEntity;
      }
    } else {
      console.log("Cesium viewer not available");
    }
  };

  const handleStopAnimation = () => {
    const viewer = (window as any).cesiumViewer;
    if (viewer && viewer.clock) {
      viewer.clock.shouldAnimate = false;
      viewer.trackedEntity = undefined; // Stop tracking the helicopter
      setIsAnimating(false);
    }
  };

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

    // Update the camera view to the selected position
    const targetIndex = Math.floor((value / 100) * (positions.length - 1));

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
    <div className="relative w-full">
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
      </div>

      {!isLoading && (
        <>
          {/* Controls */}
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg shadow-xl max-w-xs z-40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                3D Pilot View
              </h3>
            </div>

            {isAnimating && (
              <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                <div className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  Animation Playing
                </div>
                <div className="text-blue-700 dark:text-blue-300 mt-1">
                  Speed: {playbackSpeed}x
                </div>
              </div>
            )}

            <div className="space-y-2 mb-3">
              {/* Tile Loading Mode Toggle */}
              <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <input
                  type="checkbox"
                  id="tileLoadingMode"
                  checked={tileLoadingMode}
                  onChange={(e) => setTileLoadingMode(e.target.checked)}
                  disabled={isAnimating}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="tileLoadingMode"
                  className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                >
                  <div className="font-medium">High Quality Mode</div>
                  <div className="text-xs opacity-75">
                    Slower animation for better 3D tiles
                  </div>
                </label>
              </div>

              <label className="text-xs text-gray-600 dark:text-gray-400">
                Playback Speed
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                disabled={isAnimating}
              >
                <option value={0.5}>0.5x (Slow)</option>
                <option value={1}>1x (Normal)</option>
                <option value={2}>2x (Fast)</option>
                <option value={3}>3x (Faster)</option>
                <option value={5}>5x (Very Fast)</option>
                <option value={10}>10x (Maximum)</option>
              </select>

              {!isAnimating ? (
                <button
                  onClick={handleStartAnimation}
                  disabled={!tilesReady}
                  className={`w-full text-white px-3 py-2 rounded text-sm transition-all shadow-md ${
                    tilesReady
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 cursor-pointer"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {tilesReady ? (
                    "🚁 Start Flight Animation"
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading tiles... ({Math.round(tileLoadProgress)}%)
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStopAnimation}
                  className="w-full bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors"
                >
                  ⏹ Stop Animation
                </button>
              )}

              <button
                onClick={handleResetView}
                className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                🔄 Reset Overview
              </button>
            </div>

            {/* Navigation */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Navigation:</p>
              <ul className="space-y-0.5">
                <li>• Left drag: Rotate</li>
                <li>• Right drag: Zoom</li>
                <li>• Scroll: Zoom</li>
              </ul>
            </div>
          </div>

          {/* Flight Timeline Slider */}
          {positions.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg shadow-xl z-40">
              <div className="flex items-center gap-3">
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Flight Timeline
                    </span>
                    {searchContext && closestPointIndex !== null && (
                      <button
                        onClick={handleJumpToClosest}
                        className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors"
                      >
                        📍 Jump to Closest
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={sliderPosition}
                      onChange={(e) => handleSliderChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
                      style={{
                        background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${sliderPosition}%, #E5E7EB ${sliderPosition}%, #E5E7EB 100%)`,
                      }}
                    />

                    {/* Closest point marker */}
                    {searchContext && closestPointIndex !== null && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full shadow-md pointer-events-none"
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

                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {positions[0]
                        ? new Date(positions[0].timestamp).toLocaleTimeString()
                        : "Start"}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      Position{" "}
                      {Math.floor(
                        (sliderPosition / 100) * (positions.length - 1),
                      ) + 1}{" "}
                      of {positions.length}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {positions[positions.length - 1]
                        ? new Date(
                            positions[positions.length - 1].timestamp,
                          ).toLocaleTimeString()
                        : "End"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg text-xs z-40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Google 3D Tiles</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FlightVisualization3DCesiumFixed;
