import React, { useEffect, useRef, useState, useCallback } from 'react';

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

export const FlightVisualization3DCesiumFixed: React.FC<FlightVisualization3DCesiumFixedProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
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
        console.warn('Error destroying Cesium viewer:', e);
      }
      viewerRef.current = null;
    }

    // Remove the cesium container entirely
    if (cesiumContainerRef.current && cesiumContainerRef.current.parentNode) {
      cesiumContainerRef.current.parentNode.removeChild(cesiumContainerRef.current);
      cesiumContainerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (!containerRef.current || positions.length === 0) return;

    const loadCesium = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up any existing viewer first
        cleanup();

        // Create a new container for Cesium
        const cesiumContainer = document.createElement('div');
        cesiumContainer.style.width = '100%';
        cesiumContainer.style.height = '100%';
        cesiumContainer.style.position = 'relative';
        containerRef.current!.appendChild(cesiumContainer);
        cesiumContainerRef.current = cesiumContainer;

        // Load Cesium from CDN if not already loaded
        if (!window.Cesium) {
          // Add Cesium CSS
          if (!document.getElementById('cesium-css')) {
            const cesiumCSS = document.createElement('link');
            cesiumCSS.id = 'cesium-css';
            cesiumCSS.rel = 'stylesheet';
            cesiumCSS.href = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css';
            document.head.appendChild(cesiumCSS);
          }

          // Load Cesium JS
          await new Promise((resolve, reject) => {
            if (window.Cesium) {
              resolve(true);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // Wait for Cesium to be available
          await new Promise(resolve => {
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

        // Suppress the sandboxed iframe warning
        window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/';

        // Set Cesium Ion default access token (your personal token)
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiM2FlZDAyOS00ZjE4LTQ0NjItOTY4ZC0xNzQyNGIzNjhhOTkiLCJpZCI6MzQ2MjQ4LCJpYXQiOjE3NTkzMDkyMjl9.zkS_2D4Y8scZkqmS_lckpl2G_7c8sGaFwMazm26eAT0';

        // Create the Cesium Viewer with no base imagery (to avoid grid)
        const viewer = new Cesium.Viewer(cesiumContainer, {
          terrainProvider: undefined,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          requestRenderMode: false, // Keep rendering continuously for 3D tiles
          maximumRenderTimeChange: Infinity,
          shadows: false,
          shouldAnimate: true,
          useBrowserRecommendedResolution: true,
          automaticallyTrackDataSourceClocks: false,
          contextOptions: {
            webgl: {
              preserveDrawingBuffer: true
            }
          },
          orderIndependentTranslucency: false
        });

        // Remove all default imagery providers to get rid of the grid
        viewer.imageryLayers.removeAll();

        if (!mountedRef.current) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        // Also store globally for testing
        (window as any).cesiumViewer = viewer;

        // Hide credits
        viewer.cesiumWidget.creditContainer.style.display = 'none';

        // Configure scene - completely hide the globe to avoid grid
        viewer.scene.globe.show = false; // Hide globe completely from the start
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.skyBox.show = false; // Hide skybox
        viewer.scene.sun.show = false;
        viewer.scene.moon.show = false;
        viewer.scene.backgroundColor = Cesium.Color.BLACK; // Black background
        viewer.scene.fog.enabled = false; // Disable fog

        // Set a default terrain provider using the correct API
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();

        // Add Google Photorealistic 3D Tiles
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_TILES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          console.log('Using Google Tiles API Key:', apiKey ? 'Key present' : 'No key found');

          if (!apiKey) {
            throw new Error('Google Maps API key not configured');
          }

          // Remove quotes if present in the API key
          const cleanApiKey = apiKey.replace(/['"]/g, '');

          console.log('Loading Google 3D Tiles from:', `https://tile.googleapis.com/v1/3dtiles/root.json?key=${cleanApiKey.substring(0, 10)}...`);

          const tileset = await Cesium.Cesium3DTileset.fromUrl(
            `https://tile.googleapis.com/v1/3dtiles/root.json?key=${cleanApiKey}`,
            {
              showCreditsOnScreen: true,
              maximumScreenSpaceError: 8, // Start with lower quality for faster loading
              maximumMemoryUsage: 1024, // More memory for tiles
              skipLevelOfDetail: true,
              immediatelyLoadDesiredLevelOfDetail: false,
              loadSiblings: true,
              cullWithChildrenBounds: true,
              dynamicScreenSpaceError: true,
              dynamicScreenSpaceErrorDensity: 0.00278,
              dynamicScreenSpaceErrorFactor: 4.0
            }
          );

          console.log('Google 3D Tileset loaded successfully');

          if (mountedRef.current) {
            viewer.scene.primitives.add(tileset);

            // Store tileset reference on viewer for access during animation
            viewer.googleTileset = tileset;

            // Wait for initial tiles to load
            await tileset.readyPromise;
            console.log('Google 3D Tiles ready');

            // Configure tileset for better rendering
            tileset.maximumScreenSpaceError = 4; // Higher value = faster loading, lower quality
            tileset.skipLevelOfDetail = true; // Speed up loading

            // Keep the globe hidden - don't change this during animation
            viewer.scene.globe.show = false;

            // Also ensure the globe stays hidden during rendering
            viewer.scene.globe.enableLighting = false;

            // Force a render
            viewer.scene.requestRender();
          }
        } catch (tileError) {
          console.warn('Could not load Google 3D tiles, using default terrain:', tileError);
          // Keep the default ellipsoid terrain provider
          viewer.scene.globe.show = true;
        }

        if (!mountedRef.current) return;

        // Convert positions to Cesium format
        const cartesianPositions = positions.map(pos => {
          return Cesium.Cartesian3.fromDegrees(
            pos.longitude,
            pos.latitude,
            pos.altitude_feet * 0.3048
          );
        });

        // Create flight path
        const flightPath = viewer.entities.add({
          name: 'Flight Path',
          polyline: {
            positions: cartesianPositions,
            width: 4,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.RED.withAlpha(0.9)
            }),
            clampToGround: false,
            show: true
          }
        });

        // Add start marker
        viewer.entities.add({
          name: 'Start',
          position: cartesianPositions[0],
          point: {
            pixelSize: 12,
            color: Cesium.Color.GREEN,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: 'START',
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // Add end marker
        const endPos = positions[positions.length - 1];
        viewer.entities.add({
          name: 'End',
          position: cartesianPositions[cartesianPositions.length - 1],
          point: {
            pixelSize: 12,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: 'END',
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // Create an invisible entity for camera tracking (no visual marker)
        const helicopter = viewer.entities.add({
          name: 'Helicopter',
          position: cartesianPositions[0],
          // No visual representation - we're inside the helicopter!
          show: false
        });

        // Store helicopter reference on viewer for access in animation function
        viewer.helicopterEntity = helicopter;

        // Start with first-person pilot view
        const startPos = positions[0];
        // Higher altitude to see more tiles
        const startAltitude = 2000; // Higher altitude to load more tiles
        const startCartesian = Cesium.Cartesian3.fromDegrees(
          startPos.longitude,
          startPos.latitude,
          startAltitude * 0.3048
        );

        // Set initial first-person view with proper pitch
        const heading = Cesium.Math.toRadians(startPos.track_degrees || 0);
        const pitchAngle = -25; // Moderate downward angle

        // Initial camera setup
        console.log('Setting initial camera position:', {
          lat: startPos.latitude,
          lon: startPos.longitude,
          alt: startAltitude,
          heading: startPos.track_degrees || 0,
          pitch: pitchAngle
        });

        // Set camera immediately with Phoenix coordinates
        viewer.camera.setView({
          destination: startCartesian,
          orientation: {
            heading: heading,
            pitch: Cesium.Math.toRadians(pitchAngle),
            roll: 0
          }
        });

        // Force a render
        viewer.scene.requestRender();

        // After tiles load, set camera again to ensure proper view
        setTimeout(() => {
          console.log('Resetting camera after tiles load');
          viewer.camera.setView({
            destination: startCartesian,
            orientation: {
              heading: heading,
              pitch: Cesium.Math.toRadians(-25),
              roll: 0
            }
          });

          // Ensure we're rendering the tiles
          viewer.scene.requestRender();
        }, 2000);

        // Smooth interpolation function
        const lerp = (start: number, end: number, t: number) => {
          return start + (end - start) * t;
        };

        // Create animation state on the viewer itself to ensure persistence
        if (viewer && !viewer.animationState) {
          viewer.animationState = {
            currentIndex: 0,
            interpolationProgress: 0,
            frameCount: 0
          };
        }

        // Animation function with smooth interpolation
        const animateFlight = (speed?: number) => {
          // Validate prerequisites
          if (!positions || positions.length < 2) {
            console.error('Cannot start animation: not enough positions', positions?.length || 0);
            setIsAnimating(false);
            return;
          }

          if (!viewer) {
            console.error('Cannot start animation: viewer not ready');
            setIsAnimating(false);
            return;
          }

          // Use provided speed or get from viewer settings or fallback to 1
          const currentSpeed = speed || viewer.animationSettings?.playbackSpeed || 1;

          console.log('Starting animation with', positions.length, 'positions at', currentSpeed, 'x speed');
          console.log('Viewer exists:', !!viewer);
          console.log('Helicopter entity exists:', !!viewer.helicopterEntity);

          if (animationRef.current) {
            console.log('Clearing existing animation timeout');
            clearTimeout(animationRef.current);
          }

          setIsAnimating(true);

          // Reset animation state for new animation
          viewer.animationState.currentIndex = 0;
          viewer.animationState.interpolationProgress = 0;
          viewer.animationState.frameCount = 0;

          // Extremely slow animation optimized for tile loading
          // Real helicopter speed is too fast for Google tiles to load
          // We need to move slowly enough that tiles can stream in
          const framesPerSecond = 10; // 10 FPS for smooth animation
          const interpolationSteps = 30; // Fixed interpolation steps for smooth movement
          const baseIntervalMs = 1000 / framesPerSecond; // 100ms between frames at 1x speed

          // Store animation settings in viewer for access in animate function with current speed
          viewer.animationSettings = {
            intervalMs: baseIntervalMs / currentSpeed,
            interpolationSteps: interpolationSteps,
            playbackSpeed: currentSpeed
          };

          console.log('Animation settings:', viewer.animationSettings);

          // Use recursive setTimeout instead of setInterval for better reliability
          const animate = () => {

            try {
              // Ensure animationState exists
              if (!viewer.animationState) {
                console.error('Animation state not initialized');
                return;
              }

              viewer.animationState.frameCount++;

              // Log frame progress every 10 frames
              if (viewer.animationState.frameCount % 10 === 1) {
                console.log(`Frame ${viewer.animationState.frameCount}, Position ${viewer.animationState.currentIndex}/${positions.length}`);
              }

              if (!mountedRef.current || !viewer) {
                console.log('Animation stopped: component unmounted or viewer destroyed');
                setIsAnimating(false);
                return;
              }

              if (viewer.animationState.currentIndex >= positions.length - 1) {
                console.log(`Animation completed: reached end at index ${viewer.animationState.currentIndex} of ${positions.length} after ${viewer.animationState.frameCount} frames`);
                setIsAnimating(false);
                return;
              }

            // Get current and next positions for interpolation
            const currentPos = positions[viewer.animationState.currentIndex];
            const nextPos = positions[Math.min(viewer.animationState.currentIndex + 1, positions.length - 1)];

            // Debug log every new position (less verbose)
            if (viewer.animationState.interpolationProgress === 0 && viewer.animationState.currentIndex % 10 === 0) {
              console.log(`Position ${viewer.animationState.currentIndex}: ${currentPos.latitude.toFixed(4)}, ${currentPos.longitude.toFixed(4)}`);
            }

            // Additional debug logging
            if (!currentPos || !nextPos) {
              console.error('Missing position data:', { currentPos: !!currentPos, nextPos: !!nextPos, index: viewer.animationState.currentIndex });
              setIsAnimating(false);
              return;
            }

            // Calculate interpolation factor (0 to 1)
            const t = viewer.animationState.interpolationProgress / (viewer.animationSettings?.interpolationSteps || 30);

            // Smoothly interpolate position
            const interpolatedLat = lerp(currentPos.latitude, nextPos.latitude, t);
            const interpolatedLon = lerp(currentPos.longitude, nextPos.longitude, t);
            // Ensure minimum altitude of 1500 feet to stay above ground
            const rawAlt = lerp(currentPos.altitude_feet, nextPos.altitude_feet, t);
            const interpolatedAlt = Math.max(rawAlt, 1500);

            // Interpolate heading (handling wrap-around at 360 degrees)
            let currentHeading = currentPos.track_degrees || 0;
            let nextHeading = nextPos.track_degrees || currentHeading;

            // Handle heading wrap-around (e.g., 350° to 10°)
            if (Math.abs(nextHeading - currentHeading) > 180) {
              if (currentHeading > nextHeading) {
                nextHeading += 360;
              } else {
                currentHeading += 360;
              }
            }
            const interpolatedHeading = lerp(currentHeading, nextHeading, t) % 360;

            // Create smooth position (use window.Cesium to ensure access)
            let cartesianPos;
            try {
              cartesianPos = window.Cesium.Cartesian3.fromDegrees(
                interpolatedLon,
                interpolatedLat,
                interpolatedAlt * 0.3048
              );
            } catch (e) {
              console.error('Error creating Cartesian position:', e);
              setIsAnimating(false);
              return;
            }

            // Update helicopter position (use stored reference)
            if (viewer.helicopterEntity) {
              viewer.helicopterEntity.position = cartesianPos;
            }

            // Set camera to first-person pilot view with interpolated heading
            const heading = window.Cesium.Math.toRadians(interpolatedHeading);
            const pitchAngle = -15; // Shallower angle to see more tiles ahead

            // Enable tile preloading
            viewer.scene.preloadTilesWhenIdle = true;

            // Smooth camera movement
            try {
              viewer.camera.setView({
                destination: cartesianPos,
                orientation: {
                  heading: heading,
                  pitch: window.Cesium.Math.toRadians(pitchAngle),
                  roll: 0
                }
              });

              // Request render to ensure tiles are displayed
              viewer.scene.requestRender();
            } catch (error) {
              console.error('Error setting camera view:', error);
              // Don't stop animation on camera errors - keep going
            }

            // Advance interpolation
            const interpolationSteps = viewer.animationSettings?.interpolationSteps || 30;

            viewer.animationState.interpolationProgress++;
            if (viewer.animationState.interpolationProgress >= interpolationSteps) {
              viewer.animationState.interpolationProgress = 0;
              viewer.animationState.currentIndex++;
            }

            // Schedule next frame with proper delay
            const animationInterval = viewer.animationSettings?.intervalMs || 100;
            const delay = animationInterval;

            // Use setTimeout with the calculated interval
            const timeoutId = setTimeout(() => {
              if (viewer.animationState.frameCount % 10 === 0) {
                console.log(`Frame ${viewer.animationState.frameCount} timeout fired, continuing animation...`);
              }
              animate();
            }, delay);
            animationRef.current = timeoutId;

            // Verify the timeout was actually set
            if (!animationRef.current) {
              console.error('Failed to set timeout!');
              setIsAnimating(false);
              return;
            }
            } catch (error) {
              console.error('Error in animation frame:', error);
              console.error('Stack trace:', error.stack);
              setIsAnimating(false);
            }
          };

          // Start the animation
          console.log('Starting animation loop with recursive setTimeout');

          // Start animation with initial delay to ensure everything is ready
          console.log('Scheduling initial animation frame...');
          setTimeout(() => {
            try {
              console.log('Starting first animation frame now');
              animate();
            } catch (error) {
              console.error('Error starting animation:', error);
              console.error('Stack:', error.stack);
              setIsAnimating(false);
            }
          }, 100); // Small delay to ensure everything is initialized
        };

        // Store animation function in ref to preserve closure
        animationFunctionRef.current = animateFlight;

        // Also store on viewer for backwards compatibility
        viewer.animateFlight = animateFlight;
        viewer.resetView = () => {
          if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
            setIsAnimating(false);
          }
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          viewer.zoomTo(flightPath, new Cesium.HeadingPitchRange(0, -45, 5000));
        };

        // Don't auto-start animation - user can start it manually

        setIsLoading(false);

      } catch (err) {
        console.error('Error loading Cesium:', err);
        if (mountedRef.current) {
          setError(`Failed to load 3D visualization: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    loadCesium();

    return cleanup;
  }, [positions, cleanup]);

  // Handle external position updates with smooth interpolation
  useEffect(() => {
    if (!viewerRef.current || !mountedRef.current || positions.length === 0) return;
    if (currentPositionIndex < 0 || currentPositionIndex >= positions.length) return;

    const targetPos = positions[currentPositionIndex];
    const viewer = viewerRef.current;

    // If we have a previous position, interpolate smoothly
    if (currentPositionIndex > 0 && !isAnimating) {
      const prevIndex = Math.max(0, currentPositionIndex - 1);
      const prevPos = positions[prevIndex];

      // Calculate number of interpolation steps based on distance
      const distance = Math.sqrt(
        Math.pow(targetPos.latitude - prevPos.latitude, 2) +
        Math.pow(targetPos.longitude - prevPos.longitude, 2)
      );
      const steps = Math.min(15, Math.max(5, Math.floor(distance * 10000)));

      let step = 0;
      const interpolationInterval = setInterval(() => {
        if (!mountedRef.current || step >= steps) {
          clearInterval(interpolationInterval);
          return;
        }

        const t = step / steps;
        const smoothT = t * t * (3 - 2 * t); // Smoothstep function for even smoother motion

        // Interpolate position
        const lat = prevPos.latitude + (targetPos.latitude - prevPos.latitude) * smoothT;
        const lon = prevPos.longitude + (targetPos.longitude - prevPos.longitude) * smoothT;
        const alt = prevPos.altitude_feet + (targetPos.altitude_feet - prevPos.altitude_feet) * smoothT;

        // Interpolate heading
        let prevHeading = prevPos.track_degrees || 0;
        let targetHeading = targetPos.track_degrees || prevHeading;

        // Handle wrap-around
        if (Math.abs(targetHeading - prevHeading) > 180) {
          if (prevHeading > targetHeading) {
            targetHeading += 360;
          } else {
            prevHeading += 360;
          }
        }
        const heading = (prevHeading + (targetHeading - prevHeading) * smoothT) % 360;

        const cartesianPos = window.Cesium.Cartesian3.fromDegrees(lon, lat, alt * 0.3048);

        viewer.camera.setView({
          destination: cartesianPos,
          orientation: {
            heading: window.Cesium.Math.toRadians(heading),
            pitch: window.Cesium.Math.toRadians(-15),
            roll: 0
          }
        });

        step++;
      }, 16); // ~60 FPS for very smooth motion
    } else {
      // Direct jump if no previous position or during animation
      const cartesianPos = window.Cesium.Cartesian3.fromDegrees(
        targetPos.longitude,
        targetPos.latitude,
        targetPos.altitude_feet * 0.3048
      );

      viewer.camera.setView({
        destination: cartesianPos,
        orientation: {
          heading: window.Cesium.Math.toRadians(targetPos.track_degrees || 0),
          pitch: window.Cesium.Math.toRadians(-15),
          roll: 0
        }
      });
    }
  }, [currentPositionIndex, positions, isAnimating]);

  // Handle external play/pause control
  useEffect(() => {
    if (!viewerRef.current && !animationFunctionRef.current) return;

    if (isPlaying && !isAnimating) {
      if (animationFunctionRef.current) {
        console.log('Starting animation via external play control');
        animationFunctionRef.current();
      } else if (viewerRef.current?.animateFlight) {
        viewerRef.current.animateFlight();
      }
    } else if (!isPlaying && isAnimating) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
        setIsAnimating(false);
      }
    }
  }, [isPlaying, isAnimating]);

  const handleStartAnimation = () => {
    console.log('handleStartAnimation called with speed:', playbackSpeed);
    if (viewerRef.current && animationFunctionRef.current) {
      // Call animation function with current speed
      animationFunctionRef.current(playbackSpeed);
    } else if (viewerRef.current?.animateFlight) {
      // Fallback to viewer method
      viewerRef.current.animateFlight(playbackSpeed);
    } else {
      console.log('No animation function available');
    }
  };

  const handleStopAnimation = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
      setIsAnimating(false);
    }
  };

  const handleResetView = () => {
    if (viewerRef.current?.resetView) {
      viewerRef.current.resetView();
    }
  };

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-900 rounded-lg">
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
        className="w-full h-[400px] bg-gray-900 rounded-lg relative"
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
              <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
                <div className="text-yellow-800 dark:text-yellow-200">
                  ⚠️ Tile Loading Mode
                </div>
                <div className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Animation slowed for optimal 3D tile loading
                </div>
              </div>
            )}

            <div className="space-y-2 mb-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Playback Speed
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                disabled={isAnimating}
              >
                <option value={0.1}>0.1x (Very Slow - Best for Tiles)</option>
                <option value={0.25}>0.25x (Slow)</option>
                <option value={0.5}>0.5x (Medium)</option>
                <option value={1}>1x (Normal)</option>
                <option value={2}>2x (Fast)</option>
                <option value={3}>3x (Very Fast)</option>
              </select>

              {!isAnimating ? (
                <button
                  onClick={handleStartAnimation}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded text-sm hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                  🚁 Start Flight Animation
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
