import React, { useEffect, useRef, useState } from 'react';

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

interface HoverLocation {
  latitude: number;
  longitude: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  position_count: number;
}

interface FlightVisualization3DCesiumProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
  hoverLocations?: HoverLocation[];
}

export const FlightVisualization3DCesium: React.FC<FlightVisualization3DCesiumProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext,
  hoverLocations = []
}) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!cesiumContainerRef.current || positions.length === 0) return;

    const loadCesium = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Cesium from CDN if not already loaded
        if (!window.Cesium) {
          // Add Cesium CSS
          const cesiumCSS = document.createElement('link');
          cesiumCSS.rel = 'stylesheet';
          cesiumCSS.href = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css';
          document.head.appendChild(cesiumCSS);

          // Load Cesium JS
          await new Promise((resolve, reject) => {
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

        const Cesium = window.Cesium;

        // Set Cesium Ion default access token (free tier)
        Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_API_KEY;

        // Create the Cesium Viewer with Google Photorealistic 3D Tiles
        const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          terrainProvider: undefined, // Will be replaced by 3D tiles
          imageryProvider: false, // No base imagery needed
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          creditContainer: (() => {
            const creditDiv = document.createElement('div');
            creditDiv.style.display = 'none';
            return creditDiv;
          })(), // Hide credits
          contextOptions: {
            webgl: {
              powerPreference: 'high-performance'
            }
          }
        });

        viewerRef.current = viewer;

        // Disable globe to show only 3D tiles
        viewer.scene.globe.show = false;
        viewer.scene.skyBox.show = true;
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = false;

        // Add Google Photorealistic 3D Tiles
        const googleTileset = await Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${import.meta.env.VITE_GOOGLE_TILES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`,
          {
            showCreditsOnScreen: true,
            maximumScreenSpaceError: 2,
            maximumMemoryUsage: 512
          }
        );

        viewer.scene.primitives.add(googleTileset);

        // Convert positions to Cesium format with elevation
        const cartesianPositions = positions.map(pos => {
          // Use ground elevation if available, otherwise use Phoenix average
          const groundElev = pos.ground_elevation_feet || 1100;
          const actualAltitude = pos.altitude_feet;

          return Cesium.Cartesian3.fromDegrees(
            pos.longitude,
            pos.latitude,
            actualAltitude * 0.3048 // Convert feet to meters
          );
        });

        // Create the flight path polyline
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
            heightReference: Cesium.HeightReference.NONE
          },
          label: {
            text: 'START',
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.NONE
          }
        });

        // Add end marker
        viewer.entities.add({
          name: 'End',
          position: cartesianPositions[cartesianPositions.length - 1],
          point: {
            pixelSize: 12,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE
          },
          label: {
            text: 'END',
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.NONE
          }
        });

        // Add hover location markers using calculated centroids from pattern detection
        if (hoverLocations && hoverLocations.length > 0) {
          console.log(`Adding ${hoverLocations.length} hover location visualizations`);

          hoverLocations.forEach((hoverLoc, idx) => {
            // Calculate radius based on duration (longer hover = larger radius)
            // Base radius: 50m, add 10m per minute of hovering, max 200m
            const radiusMeters = Math.min(50 + (hoverLoc.duration_minutes * 10), 200);

            // Position at centroid of hover cluster
            const hoverPosition = Cesium.Cartesian3.fromDegrees(
              hoverLoc.longitude,
              hoverLoc.latitude,
              0 // Ground level
            );

            // Add cylinder from ground to high altitude for better visibility
            viewer.entities.add({
              name: `Hover Cylinder ${idx + 1}`,
              position: hoverPosition,
              cylinder: {
                length: 4572, // 15000 feet in meters
                topRadius: radiusMeters,
                bottomRadius: radiusMeters,
                material: Cesium.Color.RED.withAlpha(0.15),
                outline: true,
                outlineColor: Cesium.Color.RED.withAlpha(0.4),
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
              }
            });

            // Add ground circle at hover centroid
            viewer.entities.add({
              name: `Hover Ground Circle ${idx + 1}`,
              position: hoverPosition,
              ellipse: {
                semiMinorAxis: radiusMeters,
                semiMajorAxis: radiusMeters,
                height: 0,
                material: Cesium.Color.RED.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.RED.withAlpha(0.7),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
              }
            });

            // Add hover marker point
            viewer.entities.add({
              name: `Hover Point ${idx + 1}`,
              position: hoverPosition,
              point: {
                pixelSize: 12,
                color: Cesium.Color.ORANGE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
              },
              label: {
                text: `HOVER ${idx + 1}\n${hoverLoc.duration_minutes.toFixed(1)} min`,
                font: '12px sans-serif bold',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                showBackground: true,
                backgroundColor: Cesium.Color.RED.withAlpha(0.7),
                backgroundPadding: new Cesium.Cartesian2(7, 5)
              }
            });
          });

          console.log(`Added ${hoverLocations.length * 3} hover visualization entities`);
        }

        // Add helicopter marker that moves during playback
        const aircraft = viewer.entities.add({
          name: 'Helicopter',
          position: cartesianPositions[0],
          point: {
            pixelSize: 16,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: '🚁',
            font: '24px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // Start with pilot view from the beginning
        const startPos = positions[0];
        const startCartesian = Cesium.Cartesian3.fromDegrees(
          startPos.longitude,
          startPos.latitude,
          startPos.altitude_feet * 0.3048
        );

        const heading = Cesium.Math.toRadians(startPos.track_degrees || 0);
        const pitch = Cesium.Math.toRadians(-20); // Look slightly down
        const range = 800; // Distance behind aircraft

        viewer.camera.lookAt(
          startCartesian,
          new Cesium.HeadingPitchRange(heading, pitch, range)
        );

        // Start animation automatically
        setTimeout(() => {
          viewer.animateFlight();
          setIsAnimating(true);
        }, 2000); // Start after 2 seconds

        // Animation function
        const animateFlight = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }

          setIsAnimating(true);
          let index = 0;
          const stepSize = Math.max(1, Math.floor(playbackSpeed));

          animationRef.current = setInterval(() => {
            if (index >= positions.length) {
              index = 0; // Loop
            }

            const currentPos = positions[index];
            const cartesianPos = Cesium.Cartesian3.fromDegrees(
              currentPos.longitude,
              currentPos.latitude,
              currentPos.altitude_feet * 0.3048
            );

            // Update aircraft position
            aircraft.position = cartesianPos;

            // Follow aircraft with camera
            const heading = Cesium.Math.toRadians(currentPos.track_degrees || 0);
            const pitch = Cesium.Math.toRadians(-30); // Look down at 30 degrees
            const range = 1000 + (currentPos.ground_speed_knots || 50) * 10; // Distance based on speed

            viewer.camera.lookAt(
              cartesianPos,
              new Cesium.HeadingPitchRange(heading, pitch, range)
            );

            index += stepSize;
          }, 1000 / playbackSpeed);
        };

        // Store animation function
        viewer.animateFlight = animateFlight;

        viewer.resetView = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
            setIsAnimating(false);
          }
          viewer.zoomTo(flightPath, new Cesium.HeadingPitchRange(0, -45, 5000));
        };

        setIsLoading(false);

      } catch (err) {
        console.error('Error loading Cesium:', err);
        setError(`Failed to load 3D visualization: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadCesium();

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      // Clean up any lingering Cesium resources
      if (cesiumContainerRef.current) {
        cesiumContainerRef.current.innerHTML = '';
      }
    };
  }, [positions]);

  // Update view when playing
  useEffect(() => {
    if (!viewerRef.current || !isPlaying || positions.length === 0) return;

    const currentPos = positions[currentPositionIndex];
    if (!currentPos) return;

    const cartesianPos = window.Cesium.Cartesian3.fromDegrees(
      currentPos.longitude,
      currentPos.latitude,
      currentPos.altitude_feet * 0.3048
    );

    // Update camera to follow current position
    const heading = window.Cesium.Math.toRadians(currentPos.track_degrees || 0);
    const pitch = window.Cesium.Math.toRadians(-30);
    const range = 1500;

    viewerRef.current.camera.lookAt(
      cartesianPos,
      new window.Cesium.HeadingPitchRange(heading, pitch, range)
    );
  }, [currentPositionIndex, isPlaying, positions]);

  const handleStartAnimation = () => {
    if (viewerRef.current?.animateFlight) {
      viewerRef.current.animateFlight();
    }
  };

  const handleStopAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
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
          <div className="mt-4 text-xs text-gray-500">
            CesiumJS provides the most accurate photorealistic 3D visualization
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={cesiumContainerRef}
        className="w-full h-[400px] bg-gray-900 rounded-lg"
        style={{ position: 'relative' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading CesiumJS with Google 3D Tiles...</div>
              <div className="text-sm text-gray-400 mt-2">
                This provides photorealistic 3D buildings and terrain
              </div>
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <>
          {/* Cesium Controls */}
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg shadow-xl max-w-xs z-40">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                CesiumJS 3D View
              </h3>
            </div>

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
                <option value={0.5}>0.5x (Slow)</option>
                <option value={1}>1x (Normal)</option>
                <option value={2}>2x (Fast)</option>
                <option value={5}>5x (Very Fast)</option>
                <option value={10}>10x (Ultra Fast)</option>
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
                🔄 Reset to Overview
              </button>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visualization Features:
              </div>
              <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                <div>✓ Google Photorealistic 3D Tiles</div>
                <div>✓ Accurate building models</div>
                <div>✓ Real terrain elevation</div>
                <div>✓ 3D flight path with altitude</div>
                <div>✓ Hover location indicators</div>
              </div>
            </div>

            {/* Navigation Tips */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Navigation:</p>
              <ul className="space-y-0.5">
                <li>• Left click + drag: Rotate</li>
                <li>• Right click + drag: Zoom</li>
                <li>• Middle click + drag: Pan</li>
                <li>• Scroll: Zoom in/out</li>
              </ul>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg text-xs z-40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>CesiumJS + Google 3D Tiles</span>
            </div>
          </div>

          {/* Flight Info HUD */}
          {positions[currentPositionIndex] && isPlaying && (
            <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur text-white p-4 rounded-lg shadow-xl z-40">
              <div className="text-xs uppercase tracking-wider mb-2 text-green-400">
                Flight Telemetry
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-xs text-gray-400">Altitude MSL:</span>
                  <div className="text-lg font-mono font-bold">
                    {positions[currentPositionIndex].altitude_feet.toLocaleString()} ft
                  </div>
                </div>
                {positions[currentPositionIndex].altitude_agl_feet && (
                  <div>
                    <span className="text-xs text-gray-400">Altitude AGL:</span>
                    <div className="text-lg font-mono font-bold">
                      {Math.round(positions[currentPositionIndex].altitude_agl_feet!)} ft
                    </div>
                  </div>
                )}
                {positions[currentPositionIndex].track_degrees !== undefined && (
                  <div>
                    <span className="text-xs text-gray-400">Heading:</span>
                    <div className="text-lg font-mono font-bold">
                      {Math.round(positions[currentPositionIndex].track_degrees!)}°
                    </div>
                  </div>
                )}
                {positions[currentPositionIndex].ground_speed_knots !== undefined && (
                  <div>
                    <span className="text-xs text-gray-400">Speed:</span>
                    <div className="text-lg font-mono font-bold">
                      {Math.round(positions[currentPositionIndex].ground_speed_knots!)} kts
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlightVisualization3DCesium;
