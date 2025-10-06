import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

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

interface FlightVisualization3DCesiumNPMProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export const FlightVisualization3DCesiumNPM: React.FC<FlightVisualization3DCesiumNPMProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
}) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const aircraftEntityRef = useRef<Cesium.Entity | null>(null);

  useEffect(() => {
    if (!cesiumContainerRef.current || positions.length === 0) return;

    const initCesium = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Set Cesium Ion default access token (you can get a free one from cesium.com)
        // This is a demo token - replace with your own for production
        Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_API_KEY;

        // Create the Cesium Viewer
        const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          terrainProvider: undefined,
          imageryProvider: false,
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
          creditContainer: document.createElement('div'),
          shadows: true,
          terrainShadows: Cesium.ShadowMode.ENABLED
        });

        viewerRef.current = viewer;

        // Configure scene
        viewer.scene.globe.show = false;
        viewer.scene.skyBox.show = true;
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = false;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0001;

        // Add Google Photorealistic 3D Tiles
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_TILES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            throw new Error('Google Maps API key not configured');
          }

          const tileset = await Cesium.Cesium3DTileset.fromUrl(
            `https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`,
            {
              showCreditsOnScreen: true,
              maximumScreenSpaceError: 2,
              maximumMemoryUsage: 512,
              skipLevelOfDetail: false,
              preferLeaves: true
            }
          );

          viewer.scene.primitives.add(tileset);

          // Adjust tileset height if needed (Phoenix elevation adjustment)
          tileset.readyPromise.then(() => {
            const heightOffset = 0; // Adjust if buildings appear floating/sunken
            if (heightOffset !== 0) {
              const cartographic = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center);
              const surface = Cesium.Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                cartographic.height + heightOffset
              );
              const translation = Cesium.Cartesian3.subtract(surface, tileset.boundingSphere.center, new Cesium.Cartesian3());
              tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
            }
          });

        } catch (tileError) {
          console.warn('Could not load Google 3D tiles, using default terrain:', tileError);
          // Fall back to Cesium World Terrain
          viewer.terrainProvider = Cesium.createWorldTerrain();
          viewer.scene.globe.show = true;
        }

        // Convert positions to Cesium format
        const cartesianPositions = positions.map(pos => {
          return Cesium.Cartesian3.fromDegrees(
            pos.longitude,
            pos.latitude,
            pos.altitude_feet * 0.3048 // Convert feet to meters
          );
        });

        // Create the flight path polyline with gradient
        const flightPath = viewer.entities.add({
          name: 'Flight Path',
          polyline: {
            positions: cartesianPositions,
            width: 5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: Cesium.Color.RED.withAlpha(0.8),
              taperPower: 0.5
            }),
            clampToGround: false,
            show: true,
            shadows: Cesium.ShadowMode.ENABLED
          }
        });

        // Add altitude wall (vertical lines from ground to flight path)
        for (let i = 0; i < positions.length; i += 50) { // Every 50th position to avoid clutter
          const pos = positions[i];
          const groundHeight = (pos.ground_elevation_feet || 1100) * 0.3048;
          const flightHeight = pos.altitude_feet * 0.3048;

          viewer.entities.add({
            name: `Altitude Line ${i}`,
            polyline: {
              positions: [
                Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, groundHeight),
                Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, flightHeight)
              ],
              width: 1,
              material: Cesium.Color.CYAN.withAlpha(0.3),
              show: true
            }
          });
        }

        // Add start marker with label
        const startEntity = viewer.entities.add({
          name: 'Start',
          position: cartesianPositions[0],
          point: {
            pixelSize: 14,
            color: Cesium.Color.GREEN,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: 'START\n' + new Date(positions[0].timestamp).toLocaleTimeString(),
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -25),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // Add end marker with label
        const endPos = positions[positions.length - 1];
        viewer.entities.add({
          name: 'End',
          position: cartesianPositions[cartesianPositions.length - 1],
          point: {
            pixelSize: 14,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: 'END\n' + new Date(endPos.timestamp).toLocaleTimeString(),
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -25),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // Add hover location markers with circles
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
                outlineColor: Cesium.Color.ORANGE.withAlpha(0.8),
                outlineWidth: 2
              }
            });

            // Add hover marker
            viewer.entities.add({
              name: `Hover Point ${idx}`,
              position: hoverPosition,
              point: {
                pixelSize: 12,
                color: Cesium.Color.ORANGE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              },
              label: {
                text: `HOVER ${idx + 1}\n${Math.round(pos.hover_duration_seconds || 0)}s`,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }
            });
          }
        });

        // Add helicopter entity that moves during playback
        const helicopterEntity = viewer.entities.add({
          name: 'Helicopter',
          position: cartesianPositions[0],
          model: {
            uri: '/helicopter.glb', // You can add a 3D model
            minimumPixelSize: 64,
            maximumScale: 200,
            scale: 50,
            silhouetteColor: Cesium.Color.RED,
            silhouetteSize: 2,
            heightReference: Cesium.HeightReference.NONE,
            shadows: Cesium.ShadowMode.ENABLED
          },
          // Fallback billboard if model doesn't load
          billboard: {
            image: 'data:image/svg+xml;base64,' + btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="red">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            `),
            scale: 1.0,
            heightReference: Cesium.HeightReference.NONE,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER
          }
        });
        aircraftEntityRef.current = helicopterEntity;

        // Set initial view
        viewer.zoomTo(flightPath, new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_FOUR, 5000));

        // Animation function
        const animateFlight = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }

          setIsAnimating(true);
          let index = 0;
          const stepSize = Math.max(1, Math.floor(playbackSpeed));

          animationRef.current = window.setInterval(() => {
            if (index >= positions.length) {
              index = 0; // Loop
            }

            const currentPos = positions[index];
            const cartesianPos = Cesium.Cartesian3.fromDegrees(
              currentPos.longitude,
              currentPos.latitude,
              currentPos.altitude_feet * 0.3048
            );

            // Update helicopter position
            if (helicopterEntity) {
              helicopterEntity.position = new Cesium.ConstantPositionProperty(cartesianPos);

              // Update orientation based on heading
              if (currentPos.track_degrees !== undefined) {
                const heading = Cesium.Math.toRadians(currentPos.track_degrees);
                const pitch = 0;
                const roll = 0;
                const orientation = Cesium.Transforms.headingPitchRollQuaternion(
                  cartesianPos,
                  new Cesium.HeadingPitchRoll(heading, pitch, roll)
                );
                helicopterEntity.orientation = new Cesium.ConstantProperty(orientation);
              }
            }

            // Follow helicopter with camera
            const heading = Cesium.Math.toRadians(currentPos.track_degrees || 0);
            const pitch = Cesium.Math.toRadians(-25);
            const range = 800 + (currentPos.ground_speed_knots || 50) * 5;

            viewer.camera.lookAt(
              cartesianPos,
              new Cesium.HeadingPitchRange(heading, pitch, range)
            );

            index += stepSize;
          }, 1000 / playbackSpeed);
        };

        // Store functions on viewer
        (viewer as any).animateFlight = animateFlight;
        (viewer as any).resetView = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
            setIsAnimating(false);
          }
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          viewer.zoomTo(flightPath, new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_FOUR, 5000));
        };

        setIsLoading(false);

      } catch (err) {
        console.error('Error initializing Cesium:', err);
        setError(`Failed to load 3D visualization: ${err.message}`);
        setIsLoading(false);
      }
    };

    initCesium();

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [positions]);

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

    // Update helicopter position
    if (aircraftEntityRef.current) {
      aircraftEntityRef.current.position = new Cesium.ConstantPositionProperty(cartesianPos);
    }

    // Update camera
    const heading = Cesium.Math.toRadians(currentPos.track_degrees || 0);
    const pitch = Cesium.Math.toRadians(-30);
    const range = 1500;

    viewerRef.current.camera.lookAt(
      cartesianPos,
      new Cesium.HeadingPitchRange(heading, pitch, range)
    );
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
    if (viewerRef.current) {
      viewerRef.current.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
  };

  const handleResetView = () => {
    if ((viewerRef.current as any)?.resetView) {
      (viewerRef.current as any).resetView();
    }
  };

  if (error) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
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
        ref={cesiumContainerRef}
        className="w-full h-[600px] bg-gray-900 rounded-lg cesium-container"
        style={{ position: 'relative' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading CesiumJS with Google Photorealistic 3D Tiles...</div>
              <div className="text-sm text-gray-400 mt-2">
                This provides the most accurate 3D visualization
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
                CesiumJS Photorealistic 3D
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
                  🚁 Start Pilot View
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

            {/* Features */}
            <div className="space-y-1.5 text-xs border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                3D Features:
              </div>
              <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                <div>✓ Google Photorealistic Buildings</div>
                <div>✓ Accurate Terrain Elevation</div>
                <div>✓ 3D Flight Path Visualization</div>
                <div>✓ Altitude Above Ground</div>
                <div>✓ Hover Location Indicators</div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Navigation:</p>
              <ul className="space-y-0.5">
                <li>• Left drag: Rotate view</li>
                <li>• Right drag: Zoom</li>
                <li>• Middle drag: Pan</li>
                <li>• Scroll: Zoom in/out</li>
              </ul>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg text-xs z-40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Google 3D Tiles Active</span>
            </div>
          </div>

          {/* Flight Telemetry HUD */}
          {positions[currentPositionIndex] && isPlaying && (
            <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur text-white p-4 rounded-lg shadow-xl z-40">
              <div className="text-xs uppercase tracking-wider mb-2 text-green-400">
                Live Telemetry
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-xs text-gray-400">Alt MSL:</span>
                  <div className="text-lg font-mono font-bold">
                    {positions[currentPositionIndex].altitude_feet.toLocaleString()}ft
                  </div>
                </div>
                {positions[currentPositionIndex].altitude_agl_feet && (
                  <div>
                    <span className="text-xs text-gray-400">Alt AGL:</span>
                    <div className="text-lg font-mono font-bold">
                      {Math.round(positions[currentPositionIndex].altitude_agl_feet!)}ft
                    </div>
                  </div>
                )}
                {positions[currentPositionIndex].ground_speed_knots !== undefined && (
                  <div>
                    <span className="text-xs text-gray-400">Speed:</span>
                    <div className="text-lg font-mono font-bold">
                      {Math.round(positions[currentPositionIndex].ground_speed_knots!)}kts
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlightVisualization3DCesiumNPM;
