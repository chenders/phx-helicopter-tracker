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

interface FlightVisualization3DDebugProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  searchContext?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export const FlightVisualization3DDebug: React.FC<FlightVisualization3DDebugProps> = ({
  positions,
  currentPositionIndex = 0,
  isPlaying = false,
  searchContext
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.5);
  const animationRef = useRef<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;

    addDebugLog(`🚁 Initializing with ${positions.length} positions`);

    const initializeMap = async () => {
      try {
        addDebugLog('🗺️ Checking Google Maps status...');

        // Debug Google Maps state
        const mapsInfo = {
          googleExists: !!window.google,
          mapsExists: !!window.google?.maps,
          version: (window.google?.maps as any)?.version,
          hasWebGL: !!document.createElement('canvas').getContext('webgl')
        };
        addDebugLog(`📊 Maps Info: ${JSON.stringify(mapsInfo)}`);

        // Check API keys
        const apiKeys = {
          tilesKey: import.meta.env.VITE_GOOGLE_TILES_API_KEY?.substring(0, 10) + '...',
          mapsKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 10) + '...',
          hasTilesKey: !!import.meta.env.VITE_GOOGLE_TILES_API_KEY
        };
        addDebugLog(`🔑 API Keys: ${JSON.stringify(apiKeys)}`);

        // Try to use experimental 3D features
        let mapConfig: any = {
          center: {
            lat: positions[0]?.latitude || 33.4484,
            lng: positions[0]?.longitude || -112.0740
          },
          zoom: 15,
          tilt: 67.5,
          heading: positions[0]?.track_degrees || 0,
          mapTypeId: window.google.maps.MapTypeId.SATELLITE,
          // Controls
          fullscreenControl: true,
          streetViewControl: false,
          rotateControl: true,
          tiltControl: true,
          zoomControl: true
        };

        // Try different approaches for 3D
        const mapIds = ['demo', '3d_helicopter_map', 'satellite-3d'];
        for (const id of mapIds) {
          try {
            mapConfig.mapId = id;
            addDebugLog(`🔧 Trying mapId: ${id}`);
            break;
          } catch (e) {
            addDebugLog(`⚠️ MapId ${id} failed`);
          }
        }

        addDebugLog(`🏗️ Creating map with config: ${JSON.stringify(mapConfig)}`);
        const map = new window.google.maps.Map(mapRef.current, mapConfig);

        // Add event listeners for debugging
        map.addListener('tilesloaded', () => {
          addDebugLog('✅ Tiles loaded');
          const state = {
            zoom: map.getZoom(),
            tilt: map.getTilt(),
            heading: map.getHeading(),
            mapType: map.getMapTypeId()
          };
          addDebugLog(`📍 Map state: ${JSON.stringify(state)}`);
        });

        map.addListener('idle', () => {
          addDebugLog('🎯 Map idle');
        });

        // Add flight path
        const flightPath = new window.google.maps.Polyline({
          path: positions.map(p => ({ lat: p.latitude, lng: p.longitude })),
          strokeColor: '#FF0000',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          geodesic: true,
          map: map
        });
        addDebugLog('✅ Flight path added');

        // Animation function
        map.animatePilotView = (speed: number) => {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }

          setIsAnimating(true);
          let index = 0;
          const interval = Math.max(1000, 3000 / speed); // Slower!

          addDebugLog(`🎬 Animation started: ${speed}x speed, ${interval}ms interval`);

          const animate = () => {
            if (index >= positions.length) {
              addDebugLog('🏁 Animation complete');
              clearInterval(animationRef.current);
              setIsAnimating(false);
              return;
            }

            const pos = positions[index];
            addDebugLog(`📍 Moving to position ${index}: ${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`);

            map.panTo({ lat: pos.latitude, lng: pos.longitude });

            if (pos.track_degrees !== undefined) {
              map.setHeading(pos.track_degrees);
            }

            map.setTilt(67.5);
            map.setZoom(15);

            index += Math.ceil(speed * 2); // Skip more positions at higher speeds
          };

          animationRef.current = setInterval(animate, interval);
          animate();
        };

        setMapInstance(map);
        addDebugLog('✅ Map initialization complete');

      } catch (error) {
        addDebugLog(`❌ Error: ${error}`);
        console.error('Full error:', error);
      }
    };

    // Initialize map
    if (window.google && window.google.maps) {
      addDebugLog('♻️ Using existing Google Maps instance');
      initializeMap();
    } else {
      addDebugLog('📦 Loading Google Maps...');
      const apiKey = import.meta.env.VITE_GOOGLE_TILES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places', 'visualization']
      });

      loader.load().then(() => {
        addDebugLog('✅ Google Maps loaded');
        initializeMap();
      }).catch(err => {
        addDebugLog(`❌ Failed to load Maps: ${err}`);
      });
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [positions]);

  return (
    <div className="relative w-full h-[600px]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Debug Panel */}
      <div className="absolute top-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto">
        <h3 className="font-bold mb-2 text-sm">🐛 Debug Console</h3>
        <div className="text-xs font-mono space-y-1">
          {debugInfo.map((log, i) => (
            <div key={i} className={`
              ${log.includes('❌') ? 'text-red-400' : ''}
              ${log.includes('✅') ? 'text-green-400' : ''}
              ${log.includes('⚠️') ? 'text-yellow-400' : ''}
            `}>
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white/95 p-3 rounded-lg shadow-lg">
        <div className="space-y-2">
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
          >
            <option value={0.25}>0.25x (Very Slow)</option>
            <option value={0.5}>0.5x (Slow)</option>
            <option value={1}>1x (Normal)</option>
            <option value={2}>2x (Fast)</option>
          </select>

          {!isAnimating ? (
            <button
              onClick={() => mapInstance?.animatePilotView?.(playbackSpeed)}
              className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
            >
              Start Animation
            </button>
          ) : (
            <button
              onClick={() => {
                clearInterval(animationRef.current);
                setIsAnimating(false);
                addDebugLog('⏹ Animation stopped');
              }}
              className="w-full bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600"
            >
              Stop Animation
            </button>
          )}

          <button
            onClick={() => {
              addDebugLog('🔍 Checking map state...');
              if (mapInstance) {
                const info = {
                  zoom: mapInstance.getZoom(),
                  tilt: mapInstance.getTilt(),
                  heading: mapInstance.getHeading(),
                  mapType: mapInstance.getMapTypeId(),
                  center: mapInstance.getCenter()?.toJSON()
                };
                addDebugLog(`Map info: ${JSON.stringify(info)}`);
              }
            }}
            className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
          >
            Check Map State
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightVisualization3DDebug;