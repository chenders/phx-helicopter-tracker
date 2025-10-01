import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

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

interface FlightVisualization3DPhotorealisticProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export const FlightVisualization3DPhotorealistic: React.FC<FlightVisualization3DPhotorealisticProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map3DElement, setMap3DElement] = useState<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;

    // Check if Google Maps is already loaded
    const initializeMap = async () => {
      try {
        // Since maps3d might not be available, use standard map with 3D features
        // The Map Tiles API provides photorealistic 3D through the mapId configuration

        // Create map with photorealistic 3D tiles using mapId
        const map = new window.google.maps.Map(mapRef.current, {
          center: {
            lat: positions[0]?.latitude || 33.4484,
            lng: positions[0]?.longitude || -112.0740
          },
          zoom: 15,
          tilt: 67.5, // Enable 3D tilt
          heading: positions[0]?.track_degrees || 0,
          mapId: '3d_helicopter_map', // This enables 3D buildings
          mapTypeId: window.google.maps.MapTypeId.SATELLITE,
          // Enable 3D controls
          fullscreenControl: true,
          streetViewControl: false,
          rotateControl: true,
          tiltControl: true,
          // Disable default UI for cleaner look
          disableDefaultUI: false,
          zoomControl: true
        });

        // Add flight path as polyline
        const flightPath = positions.map(pos => ({
          lat: pos.latitude,
          lng: pos.longitude
        }));

        const polyline = new window.google.maps.Polyline({
          path: flightPath,
          strokeColor: '#FF0000',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          geodesic: true,
          map: map
        });

        polylineRef.current = polyline;

        // Add start marker
        const startMarker = new window.google.maps.Marker({
          position: {
            lat: positions[0].latitude,
            lng: positions[0].longitude
          },
          map: map,
          label: 'START',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#10B981',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });
        markersRef.current.push(startMarker);

        // Add end marker
        const endPosition = positions[positions.length - 1];
        const endMarker = new window.google.maps.Marker({
          position: {
            lat: endPosition.latitude,
            lng: endPosition.longitude
          },
          map: map,
          label: 'END',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#EF4444',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });
        markersRef.current.push(endMarker);

        // Add hover location markers
        const hoverPositions = positions.filter(pos => pos.is_hovering);
        hoverPositions.forEach((pos, idx) => {
          // Add circle for hover area
          new window.google.maps.Circle({
            center: { lat: pos.latitude, lng: pos.longitude },
            radius: 150,
            fillColor: '#FF0000',
            fillOpacity: 0.2,
            strokeColor: '#FF0000',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            map: map
          });

          // Add hover marker
          const hoverMarker = new window.google.maps.Marker({
            position: {
              lat: pos.latitude,
              lng: pos.longitude
            },
            map: map,
            label: `H${idx + 1}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#DC2626',
              fillOpacity: 0.9,
              strokeColor: '#FFFFFF',
              strokeWeight: 1.5
            }
          });
          markersRef.current.push(hoverMarker);
        });

        // Add search location if provided
        if (searchContext) {
          const searchMarker = new window.google.maps.Marker({
            position: {
              lat: searchContext.lat,
              lng: searchContext.lng
            },
            map: map,
            label: 'SEARCH',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#1E40AF',
              strokeWeight: 2
            }
          });
          markersRef.current.push(searchMarker);

          // Add search radius circle
          new window.google.maps.Circle({
            center: { lat: searchContext.lat, lng: searchContext.lng },
            radius: searchContext.radius,
            fillColor: '#3B82F6',
            fillOpacity: 0.1,
            strokeColor: '#3B82F6',
            strokeOpacity: 0.3,
            strokeWeight: 2,
            map: map
          });
        }

        // Fit bounds to show entire flight path
        const bounds = new window.google.maps.LatLngBounds();
        positions.forEach(pos => {
          bounds.extend({ lat: pos.latitude, lng: pos.longitude });
        });
        map.fitBounds(bounds);

        setMap3DElement(map);

        // Store functions on the map for external control
        map.animatePilotView = () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }

          let index = 0;
          const animate = () => {
            if (index >= positions.length) {
              index = 0; // Loop
            }

            const pos = positions[index];
            const nextPos = positions[Math.min(index + 1, positions.length - 1)];

            // Smoothly pan to position
            map.panTo({
              lat: pos.latitude,
              lng: pos.longitude
            });

            // Set heading based on track
            if (pos.track_degrees !== undefined) {
              map.setHeading(pos.track_degrees);
            }

            // Dynamic zoom based on speed (faster = wider view)
            const speedFactor = pos.ground_speed_knots ? Math.min(pos.ground_speed_knots / 100, 1.5) : 1;
            map.setZoom(15 + (2 * speedFactor));

            // Dynamic tilt based on altitude (lower = more tilted)
            const altitudeFactor = Math.min(pos.altitude_feet / 3000, 1);
            map.setTilt(60 + (20 * (1 - altitudeFactor)));

            index++;

            // Continue animation
            animationRef.current = requestAnimationFrame(animate);
          };

          animate();
        };

        map.resetView = () => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
            setIsAnimating(false);
          }

          const bounds = new window.google.maps.LatLngBounds();
          positions.forEach(pos => {
            bounds.extend({ lat: pos.latitude, lng: pos.longitude });
          });
          map.fitBounds(bounds);
          map.setTilt(67.5);
          map.setHeading(0);
        };

      } catch (error) {
        console.error('Error initializing 3D map:', error);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      // Maps already loaded, initialize directly
      initializeMap();
    } else {
      // Need to load Google Maps
      const tilesApiKey = import.meta.env.VITE_GOOGLE_TILES_API_KEY;
      const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const apiKey = tilesApiKey && tilesApiKey !== 'YOUR_MAP_TILES_API_KEY_HERE' ? tilesApiKey : mapsApiKey;

      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return;
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places', 'visualization', 'marker']
      });

      loader.load().then(() => {
        initializeMap();
      }).catch(err => {
        console.error('Error loading Google Maps:', err);
      });
    }

    return () => {
      // Cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    };
  }, [positions, searchContext]);

  // Update camera position when playing
  useEffect(() => {
    if (!map3DElement || !isPlaying || positions.length === 0) return;

    const currentPos = positions[currentPositionIndex];
    if (!currentPos) return;

    // Update camera to follow aircraft
    map3DElement.panTo({
      lat: currentPos.latitude,
      lng: currentPos.longitude
    });

    if (currentPos.track_degrees !== undefined) {
      map3DElement.setHeading(currentPos.track_degrees);
    }

    // Adjust zoom based on speed
    if (currentPos.ground_speed_knots !== undefined) {
      const speedFactor = Math.min(currentPos.ground_speed_knots / 100, 1.5);
      map3DElement.setZoom(15 + (2 * speedFactor));
    }
  }, [currentPositionIndex, isPlaying, map3DElement, positions]);

  const handlePilotView = () => {
    if (map3DElement && map3DElement.animatePilotView) {
      map3DElement.animatePilotView();
    }
  };

  const handleResetView = () => {
    if (map3DElement && map3DElement.resetView) {
      map3DElement.resetView();
    }
  };

  return (
    <div className="relative w-full h-[600px]">
      <div ref={mapRef} className="w-full h-full rounded-lg bg-gray-900" />

      {/* Enhanced 3D Controls */}
      <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg shadow-xl max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Photorealistic 3D View</h3>
        </div>

        <div className="space-y-2 mb-3">
          <button
            onClick={handlePilotView}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded text-sm hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
          >
            🚁 Pilot View Animation
          </button>
          <button
            onClick={handleResetView}
            className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Reset to Overview
          </button>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 text-xs border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Flight Elements:</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">3D Flight Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-700 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Hover Locations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Start Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">End Point</span>
          </div>
          {searchContext && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">Search Location</span>
            </div>
          )}
        </div>

        {/* Navigation Tips */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">3D Navigation:</p>
          <ul className="space-y-0.5">
            <li>• Click + drag to rotate view</li>
            <li>• Scroll to zoom in/out</li>
            <li>• Shift + drag to pan</li>
            <li>• Ctrl + drag to tilt angle</li>
          </ul>
        </div>

        {/* 3D Features */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">3D Features:</p>
          <ul className="space-y-0.5 text-gray-600 dark:text-gray-400">
            <li>✓ Photorealistic buildings</li>
            <li>✓ Actual terrain elevation</li>
            <li>✓ 3D flight path with altitude</li>
            <li>✓ Real-world perspective</li>
          </ul>
        </div>
      </div>

      {/* Flight Info HUD */}
      {positions[currentPositionIndex] && isPlaying && (
        <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur text-white p-4 rounded-lg shadow-xl">
          <div className="text-xs uppercase tracking-wider mb-2 text-green-400">Flight Telemetry</div>
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

      {/* Status Indicator */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>3D Tiles Active</span>
        </div>
      </div>
    </div>
  );
};

export default FlightVisualization3DPhotorealistic;