import React, { useState, useEffect, useRef, useCallback } from 'react'
import { GoogleMap, Polyline, MarkerF, InfoWindow, Circle } from '@react-google-maps/api'
import {
  Play,
  Pause,
  SkipForward,
  Eye,
  Compass,
  Gauge,
  Mountain,
  Camera,
  Maximize2,
  Navigation
} from 'lucide-react'

// Extend window interface for native polyline storage
declare global {
  interface Window {
    flightPathSegments?: google.maps.Polyline[]
  }
}

interface FlightPosition {
  id: number
  timestamp: string
  latitude: number
  longitude: number
  altitude_feet: number
  altitude_agl_feet?: number
  ground_speed_knots: number
  track_degrees: number
  vertical_rate: number
  is_hovering: boolean
  hover_duration_seconds: number
}

interface Flight3DMapViewProps {
  positions: FlightPosition[]
  flight: any
  searchContext?: {
    lat: number
    lng: number
    radius: number
  }
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
}

// Dark mode map styles - matching other pages
const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
]

// Helicopter icon function - optimized for 3D visibility
const getHelicopterIcon = (heading: number = 0, isPlaying: boolean = false) => {
  // Create a larger, more visible helicopter shape pointing north (up) by default
  // This matches Google Maps convention where 0 degrees is north
  const helicopterPath = [
    // Main rotor blades (thicker and more prominent)
    'M -20,0 L 20,0 M 0,-20 L 0,20',  // Cross-shaped rotor blades
    // Helicopter body pointing up (north) by default for correct rotation
    'M 0,-10',           // Nose pointing up (north)
    'Q -6,-10 -6,-5',    // Curve to left side
    'L -6,5',            // Left side down
    'Q -6,10 0,10',      // Curve to tail
    'Q 6,10 6,5',        // Curve to right bottom
    'L 6,-5',            // Right side up
    'Q 6,-10 0,-10',     // Curve back to nose
    'Z',                 // Close the body
    // Tail boom (extending down from body)
    'M -2,10 L -2,18 L 2,18 L 2,10 Z',  // Tail boom
    // Tail rotor (horizontal at the tail)
    'M -5,18 L 5,18'     // Horizontal tail rotor
  ].join(' ')

  // Always return a valid icon object
  return {
    path: helicopterPath,
    scale: 3.5,  // Much larger for better visibility in 3D
    fillColor: isPlaying ? '#ff1744' : '#ffd600', // Bright red when playing, bright yellow when stopped
    fillOpacity: 1.0,  // Full opacity for maximum visibility
    strokeColor: '#000000',  // Black outline for contrast
    strokeWeight: 2.5,  // Thicker outline
    rotation: heading,  // Direct heading value, since shape points north by default
    anchor: typeof window !== 'undefined' && window.google?.maps
      ? new window.google.maps.Point(0, 0)
      : { x: 0, y: 0 } as any,
  }
}

// Altitude color gradient function
const getAltitudeColor = (altitude: number, minAlt: number, maxAlt: number): string => {
  const normalized = (altitude - minAlt) / (maxAlt - minAlt)

  if (normalized < 0.33) {
    // Low altitude - red to orange
    return `hsl(${normalized * 30}, 100%, 50%)`
  } else if (normalized < 0.66) {
    // Medium altitude - orange to yellow
    return `hsl(${30 + (normalized - 0.33) * 30}, 100%, 50%)`
  } else {
    // High altitude - yellow to green
    return `hsl(${60 + (normalized - 0.66) * 60}, 100%, 50%)`
  }
}

export const Flight3DMapView: React.FC<Flight3DMapViewProps> = ({ positions, flight, searchContext }) => {
  const mapRef = useRef<google.maps.Map | null>(null)
  const miniMapRef = useRef<google.maps.Map | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const accumulatedTimeRef = useRef<number>(0)

  const [is3DView, setIs3DView] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(5)
  const [tilt, setTilt] = useState(67.5) // Maximum stable tilt for cockpit view
  const [heading, setHeading] = useState(0)
  const [followMode, setFollowMode] = useState<'fixed' | 'follow' | 'pilot'>('fixed')
  const [showAltitudeProfile, setShowAltitudeProfile] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<FlightPosition | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Calculate altitude range for coloring
  const minAltitude = positions.length > 0 ? Math.min(...positions.map(p => p.altitude_feet)) : 0
  const maxAltitude = positions.length > 0 ? Math.max(...positions.map(p => p.altitude_feet)) : 1000

  // Initialize map view ONLY when component first mounts
  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return

    // Set initial view to first position
    if (positions[0]) {
      mapRef.current.setCenter({
        lat: positions[0].latitude,
        lng: positions[0].longitude
      })
      mapRef.current.setZoom(16)

      if (is3DView) {
        mapRef.current.setTilt(67.5)
        if (positions[0].track_degrees) {
          mapRef.current.setHeading(positions[0].track_degrees)
        }
      }
    }
  }, []) // Empty dependency - only run once on mount

  // Draw/redraw native polyline when positions or map changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || positions.length === 0) {
      console.log('Cannot draw polyline - map:', !!mapRef.current, 'loaded:', mapLoaded, 'positions:', positions.length);
      return;
    }

    console.log('Drawing polyline in useEffect with', positions.length, 'positions');

    // Remove existing polyline if any
    if ((window as any).mainFlightPath) {
      (window as any).mainFlightPath.setMap(null)
      delete (window as any).mainFlightPath
    }

    // Create path coordinates
    const pathCoordinates = positions.map(p => ({
      lat: p.latitude,
      lng: p.longitude
    }))

    // Create new polyline
    const flightPath = new google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#EF4444',
      strokeOpacity: 1.0,
      strokeWeight: 6, // Even thicker for debugging
      map: mapRef.current,
      zIndex: 1000
    })

    console.log('Polyline created in useEffect');

    // Store reference and debug function
    ;(window as any).mainFlightPath = flightPath
    ;(window as any).debugFlightPath = () => {
      const fp = (window as any).mainFlightPath
      if (fp) {
        console.log('Flight path exists');
        console.log('Visible:', fp.getVisible());
        console.log('Map:', fp.getMap());
        console.log('Path length:', fp.getPath().getLength());
        if (fp.getPath().getLength() > 0) {
          console.log('First point:', fp.getPath().getAt(0).lat(), fp.getPath().getAt(0).lng());
          console.log('Last point:', fp.getPath().getAt(fp.getPath().getLength() - 1).lat(), fp.getPath().getAt(fp.getPath().getLength() - 1).lng());
        }
        // Try toggling visibility
        fp.setVisible(!fp.getVisible());
        console.log('Toggled visibility to:', fp.getVisible());
      } else {
        console.log('No flight path found');
      }
    }

    // Cleanup function
    return () => {
      if ((window as any).mainFlightPath) {
        (window as any).mainFlightPath.setMap(null)
        delete (window as any).mainFlightPath
      }
    }
  }, [mapLoaded, positions]) // Redraw when map is loaded or positions change

  // Handle mini-map polyline updates when positions change
  useEffect(() => {
    if (!miniMapRef.current || positions.length === 0) {
      return;
    }

    // Remove existing polyline if it exists
    if ((window as any).miniMapFlightPath) {
      (window as any).miniMapFlightPath.setMap(null);
      delete (window as any).miniMapFlightPath;
    }

    // Create new polyline for mini-map
    const pathCoordinates = positions.map(p => ({
      lat: p.latitude,
      lng: p.longitude
    }));

    const miniMapPath = new google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#22c55e', // Green for mini-map
      strokeOpacity: 1.0,
      strokeWeight: 3,
      map: miniMapRef.current,
      zIndex: 100
    });

    // Store reference for cleanup
    ;(window as any).miniMapFlightPath = miniMapPath;

    // Cleanup function
    return () => {
      if ((window as any).miniMapFlightPath) {
        (window as any).miniMapFlightPath.setMap(null);
        delete (window as any).miniMapFlightPath;
      }
    };
  }, [positions]); // Update when positions change

  // Animation loop with proper time-based interpolation
  useEffect(() => {
    if (isPlaying && positions.length > 0) {
      lastUpdateTimeRef.current = performance.now()
      accumulatedTimeRef.current = 0

      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastUpdateTimeRef.current
        lastUpdateTimeRef.current = currentTime

        // Add the elapsed time multiplied by playback speed
        accumulatedTimeRef.current += deltaTime * playbackSpeed

        setCurrentPositionIndex(prev => {
          if (prev >= positions.length - 1) {
            setIsPlaying(false)
            return prev
          }

          let targetIndex = prev

          // Get timestamps to calculate actual time difference
          while (targetIndex < positions.length - 1) {
            const currentPos = positions[targetIndex]
            const nextPos = positions[targetIndex + 1]

            // Calculate time difference in milliseconds
            const currentTime = new Date(currentPos.timestamp).getTime()
            const nextTime = new Date(nextPos.timestamp).getTime()
            const timeDiff = nextTime - currentTime

            // If we've accumulated enough time to move to the next position
            if (accumulatedTimeRef.current >= timeDiff) {
              accumulatedTimeRef.current -= timeDiff
              targetIndex++
            } else {
              break
            }
          }

          return targetIndex
        })

        if (isPlaying) {
          animationRef.current = requestAnimationFrame(animate)
        }
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, positions, playbackSpeed])

  // Update camera based on follow mode - simple and direct
  useEffect(() => {
    if (!mapRef.current || !positions[currentPositionIndex]) return

    const currentPos = positions[currentPositionIndex]

    if (followMode === 'follow' || followMode === 'pilot') {
      // Always update position in follow/pilot modes
      mapRef.current.panTo({
        lat: currentPos.latitude,
        lng: currentPos.longitude
      })

      if (is3DView) {
        mapRef.current.setHeading(currentPos.track_degrees || 0)
      }

      if (followMode === 'pilot' && mapRef.current.getZoom() !== 18) {
        mapRef.current.setZoom(18)
      }
    } else if (followMode === 'fixed' && isPlaying) {
      // In fixed mode, keep helicopter in view
      const bounds = mapRef.current.getBounds()
      if (bounds) {
        const posLatLng = new google.maps.LatLng(currentPos.latitude, currentPos.longitude)
        if (!bounds.contains(posLatLng)) {
          mapRef.current.panTo({
            lat: currentPos.latitude,
            lng: currentPos.longitude
          })
        }
      }
    }
  }, [currentPositionIndex, followMode, is3DView])

  // Update tilt when it changes - separate to avoid coupling
  useEffect(() => {
    if (mapRef.current && is3DView) {
      // Only update if different from current
      const currentTilt = mapRef.current.getTilt()
      if (currentTilt !== tilt) {
        mapRef.current.setTilt(tilt)
      }
    }
  }, [tilt, is3DView])

  // Toggle 3D view
  const toggle3DView = useCallback(() => {
    setIs3DView(prev => {
      const newIs3DView = !prev
      if (mapRef.current) {
        if (newIs3DView) {
          // Enable 3D view
          mapRef.current.setTilt(67.5)
          setTilt(67.5)
          // Set map type to satellite for better 3D effect
          mapRef.current.setMapTypeId('hybrid')
        } else {
          // Disable 3D view
          mapRef.current.setTilt(0)
          setTilt(0)
          mapRef.current.setMapTypeId('roadmap')
        }
      }
      return newIs3DView
    })
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!mapRef.current) return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'w':
          setTilt(prev => {
            const newTilt = Math.min(prev + 10, 67.5)
            mapRef.current.setTilt(newTilt)
            return newTilt
          })
          break
        case 's':
          setTilt(prev => {
            const newTilt = Math.max(prev - 10, 0)
            mapRef.current.setTilt(newTilt)
            return newTilt
          })
          break
        case 'a':
          mapRef.current.setHeading((mapRef.current.getHeading()! - 10) % 360)
          break
        case 'd':
          mapRef.current.setHeading((mapRef.current.getHeading()! + 10) % 360)
          break
        case '1':
          setPlaybackSpeed(1)
          break
        case '2':
          setPlaybackSpeed(2)
          break
        case '3':
          setPlaybackSpeed(5)
          break
        case '4':
          setPlaybackSpeed(10)
          break
        case 'f':
          setFollowMode(prev => {
            const modes: ('fixed' | 'follow' | 'pilot')[] = ['fixed', 'follow', 'pilot']
            const currentIndex = modes.indexOf(prev)
            return modes[(currentIndex + 1) % modes.length]
          })
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Cleanup all polylines on component unmount
  useEffect(() => {
    return () => {
      // Clean up main flight path
      if ((window as any).mainFlightPath) {
        (window as any).mainFlightPath.setMap(null);
        delete (window as any).mainFlightPath;
      }
      // Clean up mini-map flight path
      if ((window as any).miniMapFlightPath) {
        (window as any).miniMapFlightPath.setMap(null);
        delete (window as any).miniMapFlightPath;
      }
      // Clean up 2D flight path if it exists
      if ((window as any).flightPath2D) {
        (window as any).flightPath2D.setMap(null);
        delete (window as any).flightPath2D;
      }
    };
  }, []);

  // Create segmented path with altitude colors
  const getColoredFlightPath = () => {
    const segments = []
    for (let i = 0; i < positions.length - 1; i++) {
      const color = getAltitudeColor(positions[i].altitude_feet, minAltitude, maxAltitude)
      segments.push({
        path: [
          { lat: positions[i].latitude, lng: positions[i].longitude },
          { lat: positions[i + 1].latitude, lng: positions[i + 1].longitude }
        ],
        color
      })
    }
    return segments
  }

  const currentPosition = positions[currentPositionIndex]

  // Show loading state if no positions yet (must be after hooks for React rules)
  if (!positions || positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-gray-600 dark:text-gray-400">No flight data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Panel - Above the map */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* 3D Toggle */}
          <button
            onClick={toggle3DView}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              is3DView
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Mountain className="h-4 w-4" />
            3D View
          </button>

          {/* View Mode */}
          <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setFollowMode('fixed')}
              className={`px-3 py-1 rounded ${followMode === 'fixed' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
              title="Fixed Camera"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFollowMode('follow')}
              className={`px-3 py-1 rounded ${followMode === 'follow' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
              title="Follow Aircraft"
            >
              <Navigation className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFollowMode('pilot')}
              className={`px-3 py-1 rounded ${followMode === 'pilot' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
              title="Pilot's Eye View"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isPlaying) {
                  accumulatedTimeRef.current = 0
                  // If we're at the end, restart from beginning
                  if (currentPositionIndex >= positions.length - 1) {
                    setCurrentPositionIndex(0)
                  }
                }
                setIsPlaying(!isPlaying)
              }}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>

            {/* Speed Control */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
              <option value={20}>20x</option>
              <option value={50}>50x</option>
            </select>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
              {Math.floor(currentPositionIndex / positions.length * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={positions.length - 1}
              value={currentPositionIndex}
              onChange={(e) => setCurrentPositionIndex(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[80px]">
              {currentPositionIndex + 1} / {positions.length}
            </span>
          </div>
        </div>

        {/* Current Position Stats */}
        {currentPosition && (
          <div className={`grid ${searchContext ? 'grid-cols-5' : 'grid-cols-4'} gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700`}>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Altitude</div>
              {currentPosition.altitude_agl_feet !== null && currentPosition.altitude_agl_feet !== undefined ? (
                <>
                  <div className="font-semibold" style={{ color: getAltitudeColor(currentPosition.altitude_feet, minAltitude, maxAltitude) }}>
                    {currentPosition.altitude_agl_feet.toLocaleString()} ft AGL
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentPosition.altitude_feet.toLocaleString()} ft MSL
                  </div>
                </>
              ) : (
                <div className="font-semibold" style={{ color: getAltitudeColor(currentPosition.altitude_feet, minAltitude, maxAltitude) }}>
                  {currentPosition.altitude_feet.toLocaleString()} ft MSL
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Speed</div>
              <div className="font-semibold">
                {Math.round(currentPosition.ground_speed_knots * 1.15078)} mph
              </div>
              <div className="text-xs text-gray-500">
                {currentPosition.ground_speed_knots} kts
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Heading</div>
              <div className="font-semibold">
                {Math.round(currentPosition.track_degrees)}°
              </div>
              <div className="text-xs text-gray-500">
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(currentPosition.track_degrees / 45) % 8]}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">Vertical</div>
              <div className="font-semibold">
                {currentPosition.vertical_rate > 0 ? '↑' : currentPosition.vertical_rate < 0 ? '↓' : '→'}
                {Math.abs(currentPosition.vertical_rate)} fpm
              </div>
              {currentPosition.is_hovering && (
                <div className="text-xs text-red-500">Hovering</div>
              )}
            </div>
            {searchContext && (
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">Distance</div>
                <div className="font-semibold">
                  {(() => {
                    const R = 3959; // Earth's radius in miles
                    const lat1 = searchContext.lat * Math.PI / 180;
                    const lat2 = currentPosition.latitude * Math.PI / 180;
                    const deltaLat = (currentPosition.latitude - searchContext.lat) * Math.PI / 180;
                    const deltaLon = (currentPosition.longitude - searchContext.lng) * Math.PI / 180;

                    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                             Math.cos(lat1) * Math.cos(lat2) *
                             Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const distance = R * c;

                    return distance.toFixed(2);
                  })()} mi
                </div>
                <div className="text-xs text-gray-500">
                  from location
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Container with overlays */}
      <div className="relative">
        {/* Altitude Legend */}
        {showAltitudeProfile && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
            <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Altitude</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(120, 100%, 50%)' }}></div>
                <span className="text-xs">{maxAltitude.toLocaleString()} ft</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(60, 100%, 50%)' }}></div>
                <span className="text-xs">{Math.round((maxAltitude + minAltitude) / 2).toLocaleString()} ft</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 100%, 50%)' }}></div>
                <span className="text-xs">{minAltitude.toLocaleString()} ft</span>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Keyboard Shortcuts</div>
          <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
            <div>Space: Play/Pause</div>
            <div>W/S: Tilt Up/Down</div>
            <div>A/D: Rotate Left/Right</div>
            <div>F: Change Follow Mode</div>
            <div>1-4: Speed (1x-10x)</div>
          </div>
        </div>

        {/* Google Map Container */}
        <div className="relative">
        <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={positions[0] ? { lat: positions[0].latitude, lng: positions[0].longitude } : { lat: 33.4484, lng: -112.0740 }}
        onLoad={(map) => {
          mapRef.current = map
          setMapLoaded(true)

          // Initialize 3D view if enabled
          if (is3DView) {
            map.setTilt(67.5)
            map.setMapTypeId('hybrid')
          }

          // Add native polyline for flight path
          if (positions.length > 0) {
            console.log('Creating flight path with', positions.length, 'positions');
            const pathCoordinates = positions.map(p => ({
              lat: p.latitude,
              lng: p.longitude
            }))
            console.log('First coordinate:', pathCoordinates[0]);
            console.log('Last coordinate:', pathCoordinates[pathCoordinates.length - 1]);

            // Create the polyline
            const flightPath = new google.maps.Polyline({
              path: pathCoordinates,
              geodesic: true,
              strokeColor: '#EF4444',
              strokeOpacity: 1.0,
              strokeWeight: 4,
              map: map
            })

            console.log('Flight path created:', flightPath);
            console.log('Path visible?', flightPath.getVisible());
            console.log('Path map:', flightPath.getMap());

            // Store reference for cleanup
            ;(window as any).mainFlightPath = flightPath

            // Fit bounds to show entire flight path
            const bounds = new google.maps.LatLngBounds()
            positions.forEach(pos => {
              bounds.extend(new google.maps.LatLng(pos.latitude, pos.longitude))
            })
            map.fitBounds(bounds)
          }
        }}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: darkMapStyles,
        }}
      >
        {/* Flight path is rendered natively in onLoad for reliability */}

        {/* Start marker */}
        {positions[0] && (
          <MarkerF
            position={{
              lat: positions[0].latitude,
              lng: positions[0].longitude
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#10B981', // Green for start
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title="Start"
          />
        )}

        {/* End marker */}
        {positions[positions.length - 1] && (
          <MarkerF
            position={{
              lat: positions[positions.length - 1].latitude,
              lng: positions[positions.length - 1].longitude
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#EF4444', // Red for end
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title="End"
          />
        )}

        {/* Colored flight path segments for altitude visualization - temporarily disabled for debugging */}
        {/* {getColoredFlightPath().map((segment, idx) => (
          <Polyline
            key={`segment-${idx}`}
            path={segment.path}
            options={{
              strokeColor: segment.color,
              strokeOpacity: 1.0,
              strokeWeight: 6,
              geodesic: true,
              zIndex: 100
            }}
          />
        ))} */}

        {/* Show helicopter marker only when NOT in pilot mode */}
        {positions[currentPositionIndex] && followMode !== 'pilot' && (
          <>
            {/* Glowing circle beneath helicopter for visibility */}
            <Circle
              center={{
                lat: positions[currentPositionIndex].latitude,
                lng: positions[currentPositionIndex].longitude
              }}
              radius={30} // 30 meters radius
              options={{
                fillColor: isPlaying ? '#ff1744' : '#ffd600',
                fillOpacity: 0.3,
                strokeColor: isPlaying ? '#ff1744' : '#ffd600',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                zIndex: 1
              }}
            />
            {/* Helicopter marker */}
            <MarkerF
              position={{
                lat: positions[currentPositionIndex].latitude,
                lng: positions[currentPositionIndex].longitude
              }}
              icon={getHelicopterIcon(positions[currentPositionIndex].track_degrees || 0, isPlaying)}
              onClick={() => setSelectedPosition(positions[currentPositionIndex])}
              title="Current Position"
              zIndex={1000} // Ensure helicopter is above everything
            />
          </>
        )}

        {/* Start and end markers */}
        {positions[0] && (
          <MarkerF
            position={{ lat: positions[0].latitude, lng: positions[0].longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#00ff00',
              fillOpacity: 0.8,
              strokeColor: '#008800',
              strokeWeight: 2,
            }}
            title="Departure"
          />
        )}

        {positions[positions.length - 1] && (
          <MarkerF
            position={{
              lat: positions[positions.length - 1].latitude,
              lng: positions[positions.length - 1].longitude
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ff0000',
              fillOpacity: 0.8,
              strokeColor: '#880000',
              strokeWeight: 2,
            }}
            title="Arrival"
          />
        )}

        {/* Hover locations */}
        {positions.filter(p => p.is_hovering && p.hover_duration_seconds > 30).map((pos, idx) => (
          <Circle
            key={`hover-${idx}`}
            center={{ lat: pos.latitude, lng: pos.longitude }}
            radius={150}
            options={{
              fillColor: '#ff0000',
              fillOpacity: 0.2,
              strokeColor: '#ff0000',
              strokeOpacity: 0.6,
              strokeWeight: 2,
            }}
          />
        ))}

        {/* Search context if provided */}
        {searchContext && (
          <>
            <Circle
              center={{ lat: searchContext.lat, lng: searchContext.lng }}
              radius={searchContext.radius}
              options={{
                fillColor: '#3B82F6',
                fillOpacity: 0.1,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.3,
                strokeWeight: 2,
              }}
            />
            <MarkerF
              position={{ lat: searchContext.lat, lng: searchContext.lng }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeColor: '#1E40AF',
                strokeWeight: 2,
              }}
              title="Search Location"
            />
          </>
        )}

        {/* Info window */}
        {selectedPosition && (
          <InfoWindow
            position={{ lat: selectedPosition.latitude, lng: selectedPosition.longitude }}
            onCloseClick={() => setSelectedPosition(null)}
          >
            <div className="p-2">
              <div className="font-medium">{new Date(selectedPosition.timestamp).toLocaleString()}</div>
              <div className="text-sm mt-1 space-y-1">
                <div>Altitude MSL: {selectedPosition.altitude_feet.toLocaleString()} ft</div>
                {selectedPosition.altitude_agl_feet && (
                  <div>Altitude AGL: {selectedPosition.altitude_agl_feet.toLocaleString()} ft</div>
                )}
                <div>Speed: {Math.round(selectedPosition.ground_speed_knots * 1.15078)} mph ({selectedPosition.ground_speed_knots} kts)</div>
                <div>Heading: {Math.round(selectedPosition.track_degrees)}°</div>
                <div>Vertical: {selectedPosition.vertical_rate} fpm</div>
                {searchContext && (
                  <div>Distance from location: {(() => {
                    const R = 3959; // Earth's radius in miles
                    const lat1 = searchContext.lat * Math.PI / 180;
                    const lat2 = selectedPosition.latitude * Math.PI / 180;
                    const deltaLat = (selectedPosition.latitude - searchContext.lat) * Math.PI / 180;
                    const deltaLon = (selectedPosition.longitude - searchContext.lng) * Math.PI / 180;

                    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                             Math.cos(lat1) * Math.cos(lat2) *
                             Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const distance = R * c;

                    return distance.toFixed(2);
                  })()} mi</div>
                )}
                {selectedPosition.is_hovering && (
                  <div className="text-red-600 font-medium">
                    Hovering for {selectedPosition.hover_duration_seconds}s
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Picture-in-Picture Mini Map for Pilot View */}
      {followMode === 'pilot' && positions.length > 0 && (
        <div className="absolute bottom-4 right-4 w-72 h-56 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-2xl z-20">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={(() => {
              // Calculate bounds to determine proper center and zoom
              let minLat = positions[0].latitude
              let maxLat = positions[0].latitude
              let minLng = positions[0].longitude
              let maxLng = positions[0].longitude

              positions.forEach(pos => {
                minLat = Math.min(minLat, pos.latitude)
                maxLat = Math.max(maxLat, pos.latitude)
                minLng = Math.min(minLng, pos.longitude)
                maxLng = Math.max(maxLng, pos.longitude)
              })

              const center = {
                lat: (minLat + maxLat) / 2,
                lng: (minLng + maxLng) / 2
              }

              return center
            })()}
            zoom={10}  // Start zoomed out more
            onLoad={(map) => {
              // Store map reference
              miniMapRef.current = map;

              // Add native polyline for flight path in mini-map
              if (positions.length > 0) {
                const pathCoordinates = positions.map(p => ({
                  lat: p.latitude,
                  lng: p.longitude
                }))

                // Create the polyline for mini-map
                const miniMapPath = new google.maps.Polyline({
                  path: pathCoordinates,
                  geodesic: true,
                  strokeColor: '#22c55e', // Green for mini-map
                  strokeOpacity: 1.0,
                  strokeWeight: 3,
                  map: map,
                  zIndex: 100
                })

                // Store reference for cleanup
                ;(window as any).miniMapFlightPath = miniMapPath

                // Fit bounds to show the entire path
                const bounds = new google.maps.LatLngBounds()
                positions.forEach(pos => {
                  bounds.extend(new google.maps.LatLng(pos.latitude, pos.longitude))
                })
                map.fitBounds(bounds, 50) // 50px padding
              }
            }}
            options={{
              disableDefaultUI: true,
              mapTypeId: 'roadmap',
              styles: darkMapStyles,
              clickableIcons: false,
              gestureHandling: 'none',
              zoomControl: false,
              mapTypeControl: false,
              scaleControl: false,
              streetViewControl: false,
              rotateControl: false,
              fullscreenControl: false
            }}
          >
            {/* Flight path */}
            <Polyline
              path={positions.map(p => ({ lat: p.latitude, lng: p.longitude }))}
              options={{
                strokeColor: '#22c55e',
                strokeOpacity: 1.0,
                strokeWeight: 3,
                geodesic: true,
                zIndex: 100
              }}
            />

            {/* Start position - green circle */}
            {positions[0] && (
              <MarkerF
                position={{ lat: positions[0].latitude, lng: positions[0].longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#22c55e',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                zIndex={2}
              />
            )}

            {/* End position - red circle */}
            {positions[positions.length - 1] && (
              <MarkerF
                position={{
                  lat: positions[positions.length - 1].latitude,
                  lng: positions[positions.length - 1].longitude
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                zIndex={2}
              />
            )}

            {/* Search location marker if available */}
            {searchContext && (
              <MarkerF
                position={{ lat: searchContext.lat, lng: searchContext.lng }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: '#3B82F6',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                title="Search Location"
                zIndex={3}
              />
            )}

            {/* Current position marker - animated pulse effect */}
            {positions[currentPositionIndex] && (
              <>
                {/* Outer pulse ring */}
                <MarkerF
                  position={{
                    lat: positions[currentPositionIndex].latitude,
                    lng: positions[currentPositionIndex].longitude
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#ff1744',
                    fillOpacity: 0.3,
                    strokeColor: '#ff1744',
                    strokeWeight: 1,
                    strokeOpacity: 0.5
                  }}
                  zIndex={4}
                />
                {/* Inner dot */}
                <MarkerF
                  position={{
                    lat: positions[currentPositionIndex].latitude,
                    lng: positions[currentPositionIndex].longitude
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#ff1744',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                  zIndex={5}
                />
              </>
            )}
          </GoogleMap>

          {/* Mini-map controls overlay */}
          <div className="absolute top-2 left-2 flex gap-2">
            <div className="bg-black/70 px-2 py-1 rounded text-xs text-white font-mono">
              OVERVIEW
            </div>
            <button
              onClick={() => {
                console.log('Reset view button clicked')
                if (miniMapRef.current) {
                  const bounds = new google.maps.LatLngBounds()
                  positions.forEach(pos => {
                    bounds.extend(new google.maps.LatLng(pos.latitude, pos.longitude))
                  })
                  miniMapRef.current.fitBounds(bounds, 50)

                  setTimeout(() => {
                    const zoom = miniMapRef.current?.getZoom()
                    console.log('Reset complete. New zoom:', zoom)
                  }, 100)
                }
              }}
              className="bg-black/70 hover:bg-black/90 px-2 py-1 rounded text-xs text-white font-mono"
            >
              RESET VIEW
            </button>
          </div>
        </div>
      )}

      {/* Pilot View HUD Overlay */}
      {followMode === 'pilot' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Crosshair in center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg width="60" height="60" className="opacity-50">
              {/* Horizontal line */}
              <line x1="0" y1="30" x2="20" y2="30" stroke="#00ff00" strokeWidth="2" />
              <line x1="40" y1="30" x2="60" y2="30" stroke="#00ff00" strokeWidth="2" />
              {/* Vertical line */}
              <line x1="30" y1="0" x2="30" y2="20" stroke="#00ff00" strokeWidth="2" />
              <line x1="30" y1="40" x2="30" y2="60" stroke="#00ff00" strokeWidth="2" />
              {/* Center dot */}
              <circle cx="30" cy="30" r="2" fill="#00ff00" />
            </svg>
          </div>

          {/* Pilot Mode Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded">
            <span className="text-green-400 font-mono text-sm">PILOT VIEW</span>
          </div>

          {/* Heading Indicator */}
          {currentPosition && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded">
              <span className="text-green-400 font-mono text-sm">
                HDG {Math.round(currentPosition.track_degrees || 0).toString().padStart(3, '0')}°
              </span>
            </div>
          )}
        </div>
      )}
      </div> {/* Close relative container */}
      </div>
    </div>
  )
}