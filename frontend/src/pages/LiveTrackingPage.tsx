import React, { useEffect, useState, useCallback } from 'react'
// TODO: Migrate to AdvancedMarkerElement when @react-google-maps/api supports it
// For now, using deprecated Marker which is still supported and will receive 12+ months notice before removal
import { GoogleMap, LoadScript, MarkerF, InfoWindow, HeatmapLayer, Polygon, Polyline } from '@react-google-maps/api'
import { useRealtimeFlights } from '../hooks/useRealtimeFlights'
import { useWebSocket } from '../hooks/useWebSocket'
import { useSurveillanceAlerts } from '../hooks/useSurveillanceAlerts'
import { formatLocalTime, formatRelativeTime } from '../utils/dateUtils'

interface FlightData {
  id: string
  aircraft_registration: string
  latitude: number
  longitude: number
  altitude: number
  speed: number
  heading: number
  is_surveillance: boolean
  surveillance_score: number
  last_seen: string
  flight_path: Array<{lat: number, lng: number}>
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
}

const phoenixCenter = {
  lat: 33.4484,
  lng: -112.0740,
}

// Dark mode map styles for better visibility
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

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: true,
  clickableIcons: false,
  disableDoubleClickZoom: false,
  gestureHandling: 'greedy',
  styles: darkMapStyles, // Apply dark mode styles
}

const libraries: ("visualization")[] = ["visualization"]

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper function to calculate total flight path distance
const calculateFlightDistance = (path: Array<{lat: number, lng: number}>): number => {
  if (path.length < 2) return 0
  
  let totalDistance = 0
  for (let i = 1; i < path.length; i++) {
    totalDistance += calculateDistance(
      path[i - 1].lat, path[i - 1].lng,
      path[i].lat, path[i].lng
    )
  }
  return totalDistance
}

export function LiveTrackingPage() {
  const [selectedFlight, setSelectedFlight] = useState<FlightData | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [alertFilter, setAlertFilter] = useState('all') // all, surveillance, violations
  const [mapCenter, setMapCenter] = useState(phoenixCenter)
  const [mapZoom, setMapZoom] = useState(11)
  const [showFlightPath, setShowFlightPath] = useState(true) // Show flight paths by default
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  
  // Temporarily suppress Google Maps Marker deprecation warning
  // TODO: Remove when migrated to AdvancedMarkerElement
  useEffect(() => {
    const originalWarn = console.warn
    console.warn = (...args) => {
      if (args[0]?.includes?.('google.maps.Marker is deprecated')) {
        return
      }
      originalWarn.apply(console, args)
    }
    return () => {
      console.warn = originalWarn
    }
  }, [])
  
  const { data: realtimeFlights, isLoading } = useRealtimeFlights()
  const { lastMessage, connectionStatus } = useWebSocket()
  const { data: alerts } = useSurveillanceAlerts()

  // Map API response to FlightData format
  const mappedFlights = realtimeFlights?.map((flight: any, index: number) => {
    // Calculate normalized surveillance score (0-1)
    let score = 0
    if (flight.is_hovering) score += 0.3
    if (flight.is_circling) score += 0.3
    if (flight.privacy_concern) score += 0.3
    if (flight.over_residential) score += 0.2
    score = Math.min(score, 1.0) // Cap at 1.0
    
    // Extract flight path from raw_data if available
    // Ensure flight path is in the correct format for Google Maps (lat/lng only)
    const rawPath = flight.raw_data?.flight_path || []
    const flightPath = rawPath.map((point: any) => ({
      lat: point.lat,
      lng: point.lng
    }))
    
    const mappedFlight = {
      id: flight.aircraft_registration,  // Use registration as consistent ID
      aircraft_registration: flight.aircraft_registration,
      latitude: flight.latitude,
      longitude: flight.longitude,
      altitude: flight.altitude_feet || 0,
      speed: flight.ground_speed_knots ? Math.round(flight.ground_speed_knots * 1.15078) : 0, // Convert knots to mph
      heading: flight.track_degrees || 0,
      is_surveillance: flight.is_hovering || flight.is_circling || flight.over_residential,
      surveillance_score: score,
      last_seen: flight.timestamp,
      flight_path: flightPath
    }
    
    return mappedFlight
  }) || []

  // Convert flight data to heatmap points (only create when Google Maps is loaded)
  const heatmapData = (isMapLoaded && typeof window !== 'undefined' && window.google?.maps?.LatLng) 
    ? mappedFlights?.map((flight: FlightData) => ({
        location: new window.google.maps.LatLng(flight.latitude, flight.longitude),
        weight: flight.surveillance_score * 10
      })) || []
    : []

  const filteredFlights = mappedFlights?.filter((flight: FlightData) => {
    if (alertFilter === 'surveillance') return flight.is_surveillance
    if (alertFilter === 'violations') return flight.surveillance_score > 0.7
    return true
  }) || []

  // Only auto-center map on initial load, not on every update
  const [hasInitialized, setHasInitialized] = useState(false)
  
  useEffect(() => {
    // Only center the map once when we first get flight data
    if (!hasInitialized && filteredFlights && filteredFlights.length > 0) {
      setHasInitialized(true)
      
      if (filteredFlights.length === 1) {
        // Single helicopter: center on it with moderate zoom
        const flight = filteredFlights[0]
        setMapCenter({ lat: flight.latitude, lng: flight.longitude })
        setMapZoom(12)
      } else {
        // Multiple helicopters: show all Phoenix area
        setMapCenter(phoenixCenter)
        setMapZoom(11)
      }
    }
  }, [filteredFlights, hasInitialized])

  const getHelicopterIcon = (flight: FlightData, isSelected: boolean = false) => {
    const surveillanceScore = flight.surveillance_score || 0
    
    // Determine color based on surveillance score
    let fillColor = '#10b981' // Green for normal
    if (surveillanceScore > 0.8) {
      fillColor = '#ef4444' // Red for high surveillance
    } else if (surveillanceScore > 0.5) {
      fillColor = '#f97316' // Orange for medium surveillance
    }
    
    // Create a more detailed helicopter shape using SVG path
    // The helicopter points upward (north) by default and will be rotated
    // This shape includes: main rotor blades (cross), body, tail boom, and tail rotor
    const helicopterPath = [
      // Main rotor blades (horizontal and vertical lines forming a cross)
      'M -12,0 L 12,0',  // Horizontal rotor blade
      'M 0,-12 L 0,12',   // Vertical rotor blade
      // Helicopter body (rounded fuselage)
      'M 0,-6',           // Start at top center
      'Q -3,-6 -3,-3',    // Curve to left side
      'L -3,3',           // Left side down
      'Q -3,6 0,6',       // Curve to bottom center
      'Q 3,6 3,3',        // Curve to right bottom
      'L 3,-3',           // Right side up
      'Q 3,-6 0,-6',      // Curve back to top
      'Z',                // Close the body
      // Tail boom
      'M -1,6 L -1,10 L 1,10 L 1,6',  // Tail boom extending down
      // Tail rotor
      'M -3,10 L 3,10'    // Small horizontal tail rotor
    ].join(' ')
    
    if (typeof window !== 'undefined' && window.google?.maps) {
      return {
        path: helicopterPath,
        scale: 2.5,  // Larger scale for better visibility
        fillColor: fillColor,
        fillOpacity: 0.8,
        strokeColor: isSelected ? '#ffff00' : '#ffffff',
        strokeWeight: isSelected ? 2.5 : 1.5,
        rotation: flight.heading || 0, // Rotate based on heading
        anchor: new window.google.maps.Point(0, 0),
      }
    }
    
    // Fallback for when Google Maps isn't loaded yet
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Flight Tracking</h1>
            <p className="text-gray-600">
              Real-time Phoenix PD helicopter surveillance monitoring with constitutional violation detection
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              {connectionStatus === 'connected' ? 'Live Data Connected' : 'Connection Lost'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">View:</label>
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Flights</option>
              <option value="surveillance">Surveillance Only</option>
              <option value="violations">Constitutional Violations</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="heatmap"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="heatmap" className="text-sm font-medium text-black dark:text-white">
              Surveillance Heatmap
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="flightPath"
              checked={showFlightPath}
              onChange={(e) => setShowFlightPath(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="flightPath" className="text-sm font-medium text-black dark:text-white">
              Flight Paths
            </label>
          </div>
          
          <button
            onClick={() => {
              // Reset to Phoenix center
              setMapCenter(phoenixCenter)
              setMapZoom(11)
            }}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reset View
          </button>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              <span className="text-black dark:text-white">Normal Flight</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
              <span className="text-black dark:text-white">Potential Surveillance</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-black dark:text-white">Constitutional Violation</span>
            </div>
            {showFlightPath && (
              <div className="flex items-center" key="flight-path-legend">
                <div className="w-8 h-0.5 bg-blue-500 mr-1"></div>
                <span className="text-black dark:text-white text-xs">Flight Paths</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
          libraries={libraries}
          onLoad={() => setIsMapLoaded(true)}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={mapOptions}
            onLoad={() => setIsMapLoaded(true)}
            onClick={() => {
              // Prevent map clicks from affecting selection
              // Only helicopter markers should be clickable
            }}
          >
            {/* Flight Markers with helicopter icons */}
            {isMapLoaded && filteredFlights && filteredFlights.length > 0 && filteredFlights.map((flight: FlightData) => {
              const icon = getHelicopterIcon(flight, selectedFlight?.id === flight.id)
              
              // Use MarkerF (functional component) with custom icon
              return (
                <MarkerF
                  key={`helicopter-${flight.id}`}
                  position={{ lat: flight.latitude, lng: flight.longitude }}
                  icon={icon || undefined}
                  onClick={() => setSelectedFlight(flight)}
                  title={flight.aircraft_registration}
                />
              )
            })}

            {/* Flight Paths - Show paths when enabled or for selected aircraft */}
            {isMapLoaded && filteredFlights.map((flight: FlightData) => {
              const isSelected = selectedFlight?.id === flight.id
              
              // Show path if enabled globally or if this aircraft is selected
              if (!showFlightPath && !isSelected) return null
              
              // Make sure we have a valid path
              if (!flight.flight_path || flight.flight_path.length < 2) return null
              
              const surveillanceScore = flight.surveillance_score || 0
              
              // Use bright colors for flight paths - high contrast against dark map
              let pathColor = '#00ffff' // Bright cyan for default
              if (surveillanceScore > 0.8) {
                pathColor = '#ff0000' // Bright red for high surveillance
              } else if (surveillanceScore > 0.5) {
                pathColor = '#ffa500' // Bright orange for medium surveillance
              }
              
              return (
                <React.Fragment key={`flight-path-${flight.id}`}>
                  {/* Main path line - continuous line showing flight history */}
                  <Polyline
                    key={`path-line-${flight.id}-${flight.flight_path.length}`}
                    path={flight.flight_path}
                    options={{
                      strokeColor: pathColor,
                      strokeOpacity: isSelected ? 1.0 : 0.8,
                      strokeWeight: isSelected ? 5 : 4,
                      zIndex: 98, // Below dots and helicopter
                      geodesic: true,
                      clickable: false,
                      icons: [], // Ensure no icons that might break the line
                      visible: true
                    }}
                  />
                  
                  {/* Only show dots at sparse intervals for visual clarity */}
                  {isSelected && window.google?.maps?.SymbolPath && 
                    flight.flight_path.filter((_, idx: number) => idx % 5 === 0).map((pos: any, idx: number) => (
                      <MarkerF
                        key={`dot-${flight.id}-${idx}`}
                        position={pos}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 2,
                          fillColor: pathColor,
                          fillOpacity: 0.6,
                          strokeColor: '#ffffff',
                          strokeWeight: 1,
                        }}
                        zIndex={99} // Below helicopter
                      />
                    ))
                  }
                </React.Fragment>
              )
            })}

            {/* Info Windows */}
            {selectedFlight && isMapLoaded && window.google?.maps?.Size && (
              <InfoWindow
                key={`info-${selectedFlight.id}`}
                position={{ 
                  lat: selectedFlight.latitude + 0.002, // Offset slightly north to avoid covering marker
                  lng: selectedFlight.longitude 
                }}
                onCloseClick={() => setSelectedFlight(null)}
                options={{
                  pixelOffset: new window.google.maps.Size(0, -10)
                }}
              >
                <div className="p-3 min-w-[280px] bg-white">
                  <h3 className="font-bold text-lg mb-2 text-blue-800">{selectedFlight.aircraft_registration}</h3>
                  <div className="space-y-2">
                    {/* Flight Status */}
                    <div className="bg-gray-100 border border-gray-200 rounded p-2">
                      <div className="font-semibold text-sm text-gray-800 mb-1">Flight Status</div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <div>Altitude: <span className="font-medium text-black">{selectedFlight.altitude ? selectedFlight.altitude.toLocaleString() : 'N/A'} ft</span></div>
                        <div>Speed: <span className="font-medium text-black">{selectedFlight.speed || 'N/A'} mph</span></div>
                        <div>Heading: <span className="font-medium text-black">{selectedFlight.heading || 'N/A'}°</span></div>
                        <div>Last Update: <span className="font-medium text-black">{formatRelativeTime(selectedFlight.last_seen)}</span></div>
                      </div>
                    </div>

                    {/* Surveillance Information */}
                    <div className={`border rounded p-2 ${(selectedFlight.surveillance_score || 0) > 0.5 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="font-semibold text-sm text-gray-800 mb-1">Surveillance Analysis</div>
                      <div className="text-sm text-gray-700">
                        <div>Score: <span className={`font-bold ${(selectedFlight.surveillance_score || 0) > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedFlight.surveillance_score ? (selectedFlight.surveillance_score * 100).toFixed(1) : '0.0'}%
                        </span></div>
                        {selectedFlight.is_surveillance && (
                          <div className="text-red-600 font-medium mt-1 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span>
                            Surveillance Activity Detected
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Flight Path Information */}
                    {selectedFlight.flight_path && selectedFlight.flight_path.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <div className="font-semibold text-sm text-gray-800 mb-1">Flight Path Analysis</div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div>Path Points: <span className="font-medium text-black">{selectedFlight.flight_path.length}</span></div>
                          <div>Path Length: <span className="font-medium text-black">
                            {selectedFlight.flight_path.length > 1 ? `~${calculateFlightDistance(selectedFlight.flight_path).toFixed(1)} miles` : 'N/A'}
                          </span></div>
                          <div className="text-xs text-gray-600 mt-1">
                            Flight path shown in {(selectedFlight.surveillance_score || 0) > 0.5 ? 'red/orange' : 'cyan'} based on surveillance activity
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Estimated Costs */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className="font-semibold text-sm text-gray-800 mb-1">Estimated Costs</div>
                      <div className="text-sm text-gray-700">
                        <div>Hourly Rate: <span className="font-bold text-yellow-700">~$2,160/hour</span></div>
                        <div className="text-xs text-gray-600 mt-1">
                          Based on Phoenix PD operational cost estimates
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Heatmap */}
            {showHeatmap && heatmapData.length > 0 && (
              <HeatmapLayer
                key="heatmap-layer"
                data={heatmapData}
                options={{
                  radius: 50,
                  opacity: 0.6,
                }}
              />
            )}
          </GoogleMap>
        </LoadScript>
      </div>

      {/* Flight Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Flights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Active Phoenix PD Aircraft</h2>
          {filteredFlights.length > 0 ? (
            <div className="space-y-3">
              {filteredFlights.map((flight: FlightData) => (
                <div
                  key={flight.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFlight?.id === flight.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                  }`}
                  onClick={() => setSelectedFlight(flight)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{flight.aircraft_registration}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {flight.altitude || 0} ft • {flight.speed || 0} mph
                      </div>
                      {flight.is_surveillance && (
                        <div className="text-xs text-orange-600 mt-1">
                          Surveillance Score: {flight.surveillance_score ? (flight.surveillance_score * 100).toFixed(1) : '0.0'}%
                        </div>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      (flight.surveillance_score || 0) > 0.8 ? 'bg-red-500' :
                      (flight.surveillance_score || 0) > 0.5 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading flight data...</p>
              ) : (
                <>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No active Phoenix PD helicopters detected</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Phoenix PD helicopters will appear here when they are actively flying
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Surveillance Alerts</h2>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert: any, index: number) => (
                <div key={alert.alert_id || alert.id || `alert-${index}`} className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
                  <div className="font-medium text-red-800">{alert.alert_type}</div>
                  <div className="text-sm text-red-600">{alert.description}</div>
                  <div className="text-xs text-red-500 mt-1">
                    {formatLocalTime(alert.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No recent surveillance alerts</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Alerts will appear here when suspicious flight patterns are detected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Updates */}
      {lastMessage && (
        <div key="realtime-update" className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="text-sm text-blue-700">
            <strong>Real-time Update:</strong> {JSON.stringify(lastMessage)}
          </div>
        </div>
      )}
    </div>
  )
}