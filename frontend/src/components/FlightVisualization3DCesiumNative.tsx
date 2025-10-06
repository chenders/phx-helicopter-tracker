import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';

// Set the default Cesium Ion token
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_API_KEY;

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

interface FlightVisualization3DCesiumNativeProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export const FlightVisualization3DCesiumNative: React.FC<FlightVisualization3DCesiumNativeProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const helicopterRef = useRef<Cesium.Entity | null>(null);

  // Clean up function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
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

    const initCesium = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up any existing viewer first
        cleanup();

        // Create the Cesium Viewer
        const viewer = new Cesium.Viewer(containerRef.current!, {
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
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          shadows: false,
          shouldAnimate: true,
          useBrowserRecommendedResolution: true,
          automaticallyTrackDataSourceClocks: false
        });

        if (!mountedRef.current) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        // Hide credits
        (viewer as any).cesiumWidget.creditContainer.style.display = 'none';

        // Configure scene - keep globe visible initially as fallback
        viewer.scene.globe.show = true;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.skyBox.show = true;
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = false;

        // Add Google Photorealistic 3D Tiles
        let tilesLoaded = false;
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_TILES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            throw new Error('Google Maps API key not configured');
          }

          const tileset = await Cesium.Cesium3DTileset.fromUrl(
            `https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`,
            {
              maximumScreenSpaceError: 2,
              maximumMemoryUsage: 512,
              skipLevelOfDetail: false,
              immediatelyLoadDesiredLevelOfDetail: true,
              loadSiblings: true,
              cullWithChildrenBounds: false
            }
          );

          if (mountedRef.current) {
            viewer.scene.primitives.add(tileset);

            // Wait for initial tiles to load
            await tileset.readyPromise;

            // Hide the globe once 3D tiles are loaded successfully
            viewer.scene.globe.show = false;
            tilesLoaded = true;
          }
        } catch (tileError) {
          console.warn('Could not load Google 3D tiles, using default terrain:', tileError);
          // Use Cesium World Terrain if available, otherwise ellipsoid
          try {
            viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
          } catch {
            // Fallback to ellipsoid if terrain not available
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
          }
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
              taperPower: 0.5,
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

        // Add hover markers
        positions.forEach((pos, idx) => {
          if (pos.is_hovering) {
            const hoverPosition = Cesium.Cartesian3.fromDegrees(
              pos.longitude,
              pos.latitude,
              pos.altitude_feet * 0.3048
            );

            // Add hover circle on ground
            viewer.entities.add({
              name: `Hover Area ${idx}`,
              position: hoverPosition,
              ellipse: {
                semiMinorAxis: 150,
                semiMajorAxis: 150,
                height: (pos.ground_elevation_feet || 1100) * 0.3048,
                material: Cesium.Color.ORANGE.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.ORANGE.withAlpha(0.8)
              }
            });

            // Add hover marker
            viewer.entities.add({
              name: `Hover Point ${idx}`,
              position: hoverPosition,
              point: {
                pixelSize: 10,
                color: Cesium.Color.ORANGE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              },
              label: {
                text: `HOVER ${idx + 1}`,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -15),
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }
            });
          }
        });

        // Create an invisible entity for camera tracking (no visual marker)
        const helicopter = viewer.entities.add({
          name: 'Helicopter',
          position: cartesianPositions[0],
          // No visual representation - we're inside the helicopter!
          show: false
        });
        helicopterRef.current = helicopter;

        // Start with first-person pilot view
        const startPos = positions[0];
        // Ensure minimum altitude above ground
        const minAltitude = Math.max(startPos.altitude_feet, 500);
        const startCartesian = Cesium.Cartesian3.fromDegrees(
          startPos.longitude,
          startPos.latitude,
          minAltitude * 0.3048
        );

        // Set initial first-person view with proper pitch
        const heading = Cesium.Math.toRadians(startPos.track_degrees || 0);
        const pitchAngle = -15; // 15 degrees below horizon, typical pilot view

        // Use setView with a small delay to ensure scene is ready
        viewer.scene.globe.show = true; // Ensure globe is visible initially

        setTimeout(() => {
          if (!mountedRef.current) return;

          viewer.camera.setView({
            destination: startCartesian,
            orientation: {
              heading: heading,
              pitch: Cesium.Math.toRadians(pitchAngle),
              roll: 0
            }
          });

          // Force a render to ensure everything is loaded
          viewer.scene.requestRender();
        }, 100);

        // Animation function
        const animateFlight = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }

          setIsAnimating(true);
          let index = 0;
          const stepSize = Math.max(1, Math.floor(playbackSpeed));

          animationRef.current = window.setInterval(() => {
            if (!mountedRef.current || index >= positions.length) {
              if (animationRef.current) {
                clearInterval(animationRef.current);
                setIsAnimating(false);
              }
              return;
            }

            const currentPos = positions[index];
            const cartesianPos = Cesium.Cartesian3.fromDegrees(
              currentPos.longitude,
              currentPos.latitude,
              currentPos.altitude_feet * 0.3048
            );

            // Update helicopter position
            if (helicopter) {
              helicopter.position = new Cesium.ConstantPositionProperty(cartesianPos);
            }

            // Set camera to first-person pilot view
            const heading = Cesium.Math.toRadians(currentPos.track_degrees || 0);
            const pitchAngle = -15; // degrees below horizon

            // Position camera at helicopter with proper orientation
            viewer.camera.setView({
              destination: cartesianPos,
              orientation: {
                heading: heading,
                pitch: Cesium.Math.toRadians(pitchAngle),
                roll: 0
              }
            });

            index += stepSize;
          }, 1000 / playbackSpeed);
        };

        // Store functions
        (viewer as any).animateFlight = animateFlight;
        (viewer as any).resetView = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
            setIsAnimating(false);
          }
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          viewer.zoomTo(flightPath, new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 5000));
        };

        setIsLoading(false);

      } catch (err: any) {
        console.error('Error loading Cesium:', err);
        if (mountedRef.current) {
          setError(`Failed to load 3D visualization: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    initCesium();

    return cleanup;
  }, [positions, cleanup]);

  // Update view when playing
  useEffect(() => {
    if (!viewerRef.current || !isPlaying || positions.length === 0) return;

    const currentPos = positions[currentPositionIndex];
    if (!currentPos) return;

    const cartesianPos = Cesium.Cartesian3.fromDegrees(
      currentPos.longitude,
      currentPos.latitude,
      currentPos.altitude_feet * 0.3048
    );

    // Update helicopter position if exists
    if (helicopterRef.current) {
      helicopterRef.current.position = new Cesium.ConstantPositionProperty(cartesianPos);
    }

    // Update camera
    const heading = Cesium.Math.toRadians(currentPos.track_degrees || 0);
    const pitch = Cesium.Math.toRadians(-15);

    viewerRef.current.camera.setView({
      destination: cartesianPos,
      orientation: {
        heading: heading,
        pitch: pitch,
        roll: 0
      }
    });
  }, [currentPositionIndex, isPlaying, positions]);

  const handleStartAnimation = () => {
    if ((viewerRef.current as any)?.animateFlight) {
      (viewerRef.current as any).animateFlight();
    }
  };

  const handleStopAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      setIsAnimating(false);
    }
  };

  const handleResetView = () => {
    if ((viewerRef.current as any)?.resetView) {
      (viewerRef.current as any).resetView();
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
        className="w-full h-[400px] bg-gray-900 rounded-lg cesium-viewer"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading CesiumJS 3D View...</div>
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
              <span>CesiumJS (NPM)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FlightVisualization3DCesiumNative;
