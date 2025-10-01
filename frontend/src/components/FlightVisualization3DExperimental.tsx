import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
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
}

interface FlightVisualization3DExperimentalProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export const FlightVisualization3DExperimental: React.FC<FlightVisualization3DExperimentalProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map3D, setMap3D] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!containerRef.current || positions.length === 0) return;

    const loadMap3D = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load the beta version with maps3d library
        if (!window.google?.maps) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_TILES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&v=beta&libraries=maps3d`;
          script.async = true;
          script.defer = true;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // Wait for Google Maps to be fully loaded
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (window.google?.maps?.importLibrary) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 100);
          });
        }

        // Import the 3D libraries
        let Map3DElement, Polyline3DElement, Marker3DElement, AltitudeMode;

        try {
          const maps3d = await window.google.maps.importLibrary("maps3d");
          Map3DElement = maps3d.Map3DElement;
          Polyline3DElement = maps3d.Polyline3DElement;
          Marker3DElement = maps3d.Marker3DElement;
          AltitudeMode = maps3d.AltitudeMode;
        } catch (importError) {
          console.error('Maps3D library not available:', importError);
          throw new Error('The experimental 3D Maps API is not available. This feature requires the beta version of Google Maps JavaScript API with the maps3d library.');
        }

        // Calculate center from positions
        const centerLat = positions[0].latitude;
        const centerLng = positions[0].longitude;
        const centerAlt = positions[0].altitude_feet * 0.3048; // Convert to meters

        // Create the 3D map with proper mode setting
        const mapConfig = {
          center: {
            lat: centerLat,
            lng: centerLng,
            altitude: centerAlt
          },
          range: 3000, // View distance in meters
          tilt: 65, // Tilt angle
          heading: positions[0].track_degrees || 0
        };

        // Add mode if supported (required as of Feb 2025)
        if (window.google.maps.MapMode) {
          mapConfig.mode = window.google.maps.MapMode.SATELLITE || "SATELLITE";
        }

        const map3DElement = new Map3DElement(mapConfig);

        // Set size
        map3DElement.style.width = '100%';
        map3DElement.style.height = '600px';

        // Clear container and append map
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(map3DElement);

        // Add flight path as 3D polyline
        const flightCoordinates = positions.map(pos => ({
          lat: pos.latitude,
          lng: pos.longitude,
          altitude: pos.altitude_feet * 0.3048 // Convert feet to meters
        }));

        const flightPath = new Polyline3DElement({
          coordinates: flightCoordinates,
          strokeColor: '#FF0000',
          strokeWidth: 4,
          altitudeMode: AltitudeMode.ABSOLUTE,
          drawsOccludedSegments: true,
          geodesic: false
        });

        map3DElement.appendChild(flightPath);

        // Add start marker
        const startMarker = new Marker3DElement({
          position: {
            lat: positions[0].latitude,
            lng: positions[0].longitude,
            altitude: positions[0].altitude_feet * 0.3048
          },
          altitudeMode: AltitudeMode.ABSOLUTE,
          extruded: true,
          label: 'START'
        });
        map3DElement.appendChild(startMarker);

        // Add end marker
        const endPos = positions[positions.length - 1];
        const endMarker = new Marker3DElement({
          position: {
            lat: endPos.latitude,
            lng: endPos.longitude,
            altitude: endPos.altitude_feet * 0.3048
          },
          altitudeMode: AltitudeMode.ABSOLUTE,
          extruded: true,
          label: 'END'
        });
        map3DElement.appendChild(endMarker);

        // Add hover markers
        positions
          .filter(pos => pos.is_hovering)
          .forEach((pos, idx) => {
            const hoverMarker = new Marker3DElement({
              position: {
                lat: pos.latitude,
                lng: pos.longitude,
                altitude: pos.altitude_feet * 0.3048
              },
              altitudeMode: AltitudeMode.ABSOLUTE,
              extruded: true,
              label: `HOVER ${idx + 1}`
            });
            map3DElement.appendChild(hoverMarker);
          });

        // Add animation function
        map3DElement.animateFlight = () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }

          setIsAnimating(true);
          let index = 0;
          const stepSize = Math.max(1, Math.floor(playbackSpeed));

          const animate = () => {
            if (index >= positions.length) {
              setIsAnimating(false);
              return;
            }

            const pos = positions[index];

            // Update camera position
            map3DElement.center = {
              lat: pos.latitude,
              lng: pos.longitude,
              altitude: pos.altitude_feet * 0.3048
            };

            // Update heading based on track
            if (pos.track_degrees !== undefined) {
              map3DElement.heading = pos.track_degrees;
            }

            // Adjust range based on speed
            const speedFactor = pos.ground_speed_knots ?
              Math.min(pos.ground_speed_knots / 100, 2) : 1;
            map3DElement.range = 1500 + (1000 * speedFactor);

            // Adjust tilt based on altitude
            const altFactor = Math.min(pos.altitude_feet / 3000, 1);
            map3DElement.tilt = 60 + (15 * (1 - altFactor));

            index += stepSize;

            // Schedule next frame
            animationRef.current = requestAnimationFrame(() => {
              setTimeout(animate, 1000 / playbackSpeed);
            });
          };

          animate();
        };

        // Store reset function
        map3DElement.resetView = () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            setIsAnimating(false);
          }

          // Reset to overview
          const bounds = positions.reduce((acc, pos) => {
            acc.minLat = Math.min(acc.minLat, pos.latitude);
            acc.maxLat = Math.max(acc.maxLat, pos.latitude);
            acc.minLng = Math.min(acc.minLng, pos.longitude);
            acc.maxLng = Math.max(acc.maxLng, pos.longitude);
            return acc;
          }, {
            minLat: positions[0].latitude,
            maxLat: positions[0].latitude,
            minLng: positions[0].longitude,
            maxLng: positions[0].longitude
          });

          const centerLat = (bounds.minLat + bounds.maxLat) / 2;
          const centerLng = (bounds.minLng + bounds.maxLng) / 2;

          map3DElement.center = {
            lat: centerLat,
            lng: centerLng,
            altitude: 1500 * 0.3048 // 1500 feet in meters
          };
          map3DElement.range = 5000;
          map3DElement.tilt = 45;
          map3DElement.heading = 0;
        };

        setMap3D(map3DElement);
        setIsLoading(false);

      } catch (err) {
        console.error('Error loading 3D map:', err);
        setError(`Failed to load 3D map: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadMap3D();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positions]);

  // Update view when playing
  useEffect(() => {
    if (!map3D || !isPlaying || positions.length === 0) return;

    const currentPos = positions[currentPositionIndex];
    if (!currentPos) return;

    // Smoothly update camera
    map3D.center = {
      lat: currentPos.latitude,
      lng: currentPos.longitude,
      altitude: currentPos.altitude_feet * 0.3048
    };

    if (currentPos.track_degrees !== undefined) {
      map3D.heading = currentPos.track_degrees;
    }
  }, [currentPositionIndex, isPlaying, map3D, positions]);

  const handleStartAnimation = () => {
    if (map3D?.animateFlight) {
      map3D.animateFlight();
    }
  };

  const handleStopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
    }
  };

  const handleResetView = () => {
    if (map3D?.resetView) {
      map3D.resetView();
    }
  };

  if (error) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center text-white">
          <div className="text-red-400 mb-2">⚠️ Error Loading 3D Map</div>
          <div className="text-sm text-gray-400">{error}</div>
          <div className="mt-4 text-xs text-gray-500">
            Make sure you're using a compatible browser with WebGL support
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full h-[600px] bg-gray-900 rounded-lg">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading Photorealistic 3D Map...</div>
              <div className="text-sm text-gray-400 mt-2">Requires WebGL support</div>
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <>
          {/* 3D Controls */}
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg shadow-xl max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                Experimental 3D View (Beta)
              </h3>
            </div>

            <div className="space-y-2 mb-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Playback Speed
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm"
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
                🔄 Reset to Overview
              </button>
            </div>

            {/* Navigation Tips */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">3D Navigation:</p>
              <ul className="space-y-0.5">
                <li>• Click + drag to rotate</li>
                <li>• Scroll to zoom</li>
                <li>• Shift + drag to pan</li>
                <li>• Alt + drag to tilt</li>
              </ul>
            </div>

            {/* Beta Notice */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-amber-600 dark:text-amber-400">
                <strong>Beta Feature:</strong> Using experimental Map3DElement API with photorealistic 3D tiles.
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Photorealistic 3D Active</span>
            </div>
          </div>

          {/* Flight Info HUD */}
          {positions[currentPositionIndex] && isPlaying && (
            <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur text-white p-4 rounded-lg shadow-xl">
              <div className="text-xs uppercase tracking-wider mb-2 text-green-400">
                Flight Telemetry
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-xs text-gray-400">Altitude:</span>
                  <div className="text-lg font-mono font-bold">
                    {positions[currentPositionIndex].altitude_feet.toLocaleString()} ft
                  </div>
                </div>
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
                <div>
                  <span className="text-xs text-gray-400">Time:</span>
                  <div className="text-sm font-mono">
                    {new Date(positions[currentPositionIndex].timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlightVisualization3DExperimental;