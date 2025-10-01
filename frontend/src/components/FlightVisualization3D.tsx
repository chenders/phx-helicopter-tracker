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

interface FlightVisualization3DProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export const FlightVisualization3D: React.FC<FlightVisualization3DProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const helicopterMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'visualization', 'marker']
    });

    loader.load().then(async () => {
      // Create map with 3D capabilities
      const map = new google.maps.Map(mapRef.current!, {
        center: {
          lat: positions[0]?.latitude || 33.4484,
          lng: positions[0]?.longitude || -112.0740
        },
        zoom: 15,
        tilt: 60, // Enable 3D tilt
        heading: positions[0]?.track_degrees || 0,
        mapId: '3d_helicopter_map', // Required for advanced markers
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        // Enable 3D controls
        fullscreenControl: true,
        streetViewControl: false,
        rotateControl: true,
        tiltControl: true
      });

      // Add flight path
      const pathCoordinates = positions.map(pos => ({
        lat: pos.latitude,
        lng: pos.longitude
      }));

      const flightPolyline = new google.maps.Polyline({
        path: pathCoordinates,
        strokeColor: '#FF0000',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        geodesic: true,
        map: map
      });
      polylineRef.current = flightPolyline;

      // Add start marker
      const startMarker = new google.maps.Marker({
        position: { lat: positions[0].latitude, lng: positions[0].longitude },
        map: map,
        title: 'Start',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });
      markersRef.current.push(startMarker);

      // Add end marker
      const endMarker = new google.maps.Marker({
        position: {
          lat: positions[positions.length - 1].latitude,
          lng: positions[positions.length - 1].longitude
        },
        map: map,
        title: 'End',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });
      markersRef.current.push(endMarker);

      // Add hover points
      const hoverPositions = positions.filter(pos => pos.is_hovering);
      hoverPositions.forEach((pos) => {
        // Add circle for hover area
        new google.maps.Circle({
          center: { lat: pos.latitude, lng: pos.longitude },
          radius: 150,
          fillColor: '#FF0000',
          fillOpacity: 0.2,
          strokeColor: '#FF0000',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          map: map
        });

        // Add marker for hover point
        const marker = new google.maps.Marker({
          position: { lat: pos.latitude, lng: pos.longitude },
          map: map,
          title: `Hovering for ${pos.hover_duration_seconds}s`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#DC2626',
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 1.5
          }
        });
        markersRef.current.push(marker);
      });

      // Add search context if provided
      if (searchContext) {
        // Search location marker
        const searchMarker = new google.maps.Marker({
          position: { lat: searchContext.lat, lng: searchContext.lng },
          map: map,
          title: 'Search Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#1E40AF',
            strokeWeight: 2
          }
        });
        markersRef.current.push(searchMarker);

        // Search radius circle
        new google.maps.Circle({
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
      const bounds = new google.maps.LatLngBounds();
      positions.forEach(pos => {
        bounds.extend({ lat: pos.latitude, lng: pos.longitude });
      });
      map.fitBounds(bounds);

      setMapInstance(map);
    }).catch(err => {
      console.error('Error loading Google Maps:', err);
    });

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (helicopterMarkerRef.current) {
        helicopterMarkerRef.current.setMap(null);
        helicopterMarkerRef.current = null;
      }
    };
  }, [positions, searchContext]);

  // Update camera and helicopter position when playing
  useEffect(() => {
    if (!mapInstance || !isPlaying || positions.length === 0) return;

    const currentPos = positions[currentPositionIndex];
    if (!currentPos) return;

    // Update or create helicopter marker
    if (helicopterMarkerRef.current) {
      helicopterMarkerRef.current.setPosition({
        lat: currentPos.latitude,
        lng: currentPos.longitude
      });
    } else {
      helicopterMarkerRef.current = new google.maps.Marker({
        position: { lat: currentPos.latitude, lng: currentPos.longitude },
        map: mapInstance,
        title: 'Current Position',
        icon: {
          path: 'M -12,0 L 12,0 M 0,-12 L 0,12 M 0,-6 Q -3,-6 -3,-3 L -3,3 Q -3,6 0,6 Q 3,6 3,3 L 3,-3 Q 3,-6 0,-6 Z M -1,6 L -1,10 L 1,10 L 1,6 M -3,10 L 3,10',
          scale: 2,
          fillColor: '#10B981',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 1.5,
          rotation: currentPos.track_degrees || 0,
          anchor: new google.maps.Point(0, 0)
        }
      });
    }

    // Smoothly pan to current position
    mapInstance.panTo({
      lat: currentPos.latitude,
      lng: currentPos.longitude
    });

    // Update heading for pilot view
    if (currentPos.track_degrees !== undefined) {
      mapInstance.setHeading(currentPos.track_degrees);
    }

    // Dynamic tilt based on altitude (lower altitude = more tilt)
    const altitudeFactor = Math.min(currentPos.altitude_feet / 5000, 1);
    const tilt = 45 + (35 * (1 - altitudeFactor)); // 45-80 degrees
    mapInstance.setTilt(tilt);

  }, [currentPositionIndex, isPlaying, mapInstance, positions]);

  const animatePilotView = () => {
    if (!mapInstance || positions.length === 0) return;

    // Clear any existing animation
    if ((window as any).flightAnimation) {
      clearInterval((window as any).flightAnimation);
    }

    let index = 0;
    const animationInterval = setInterval(() => {
      if (index >= positions.length) {
        clearInterval(animationInterval);
        return;
      }

      const pos = positions[index];

      // Smooth camera movement
      mapInstance.panTo({
        lat: pos.latitude,
        lng: pos.longitude
      });

      // Update heading
      if (pos.track_degrees !== undefined) {
        mapInstance.setHeading(pos.track_degrees);
      }

      // Dynamic tilt based on altitude
      const altitudeFactor = Math.min(pos.altitude_feet / 5000, 1);
      const tilt = 45 + (35 * (1 - altitudeFactor));
      mapInstance.setTilt(tilt);

      // Dynamic zoom based on speed
      if (pos.ground_speed_knots !== undefined) {
        const speedFactor = Math.min(pos.ground_speed_knots / 150, 1);
        const zoom = 15 + (2 * speedFactor);
        mapInstance.setZoom(zoom);
      }

      index++;
    }, 100);

    (window as any).flightAnimation = animationInterval;
  };

  const resetView = () => {
    if (!mapInstance || positions.length === 0) return;

    // Clear animation if running
    if ((window as any).flightAnimation) {
      clearInterval((window as any).flightAnimation);
    }

    // Reset to overview
    const bounds = new google.maps.LatLngBounds();
    positions.forEach(pos => {
      bounds.extend({ lat: pos.latitude, lng: pos.longitude });
    });
    mapInstance.fitBounds(bounds);
    mapInstance.setTilt(60);
    mapInstance.setHeading(0);
  };

  return (
    <div className="relative w-full h-[500px]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* 3D Controls */}
      <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-3 rounded-lg shadow-lg">
        <h3 className="font-semibold mb-2 text-sm text-gray-900 dark:text-white">3D View Controls</h3>

        <div className="space-y-2">
          <button
            onClick={animatePilotView}
            className="w-full bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Pilot View Tour
          </button>
          <button
            onClick={resetView}
            className="w-full bg-gray-500 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Reset View
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">Flight Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-700 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">Hover Points</span>
          </div>
          {searchContext && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">Search Location</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">Navigation:</p>
          <ul className="space-y-0.5">
            <li>• Right-click + drag to rotate</li>
            <li>• Scroll to zoom</li>
            <li>• Ctrl + drag to tilt</li>
          </ul>
        </div>
      </div>

      {/* Flight Info Overlay */}
      {positions[currentPositionIndex] && isPlaying && (
        <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur text-white p-3 rounded-lg">
          <div className="text-xs uppercase tracking-wider mb-1 text-gray-300">Live Position</div>
          <div className="space-y-1">
            <div className="text-lg font-mono">
              {positions[currentPositionIndex].altitude_feet.toLocaleString()} ft
            </div>
            {positions[currentPositionIndex].track_degrees !== undefined && (
              <div className="text-sm font-mono">
                HDG: {Math.round(positions[currentPositionIndex].track_degrees!)}°
              </div>
            )}
            {positions[currentPositionIndex].ground_speed_knots !== undefined && (
              <div className="text-sm font-mono">
                SPD: {Math.round(positions[currentPositionIndex].ground_speed_knots!)} kts
              </div>
            )}
            <div className="text-xs text-gray-400">
              {new Date(positions[currentPositionIndex].timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightVisualization3D;