import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, Marker, Polyline, HeatmapLayer } from '@react-google-maps/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts'
import { useHistoricalData } from '../hooks/useHistoricalData'

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


export function HistoricalAnalysisPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [viewMode, setViewMode] = useState('map') // map, timeline, patterns
  const [selectedAircraft, setSelectedAircraft] = useState('all')
  const [showFlightPaths, setShowFlightPaths] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [pathsReady, setPathsReady] = useState(false)

  const { data: historicalData, isLoading: dataLoading } = useHistoricalData(timeRange, selectedAircraft)

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    console.log('Map loaded and set')
  }, [])

  const onMapUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Ensure paths are ready after both map and data are loaded
  useEffect(() => {
    if (showFlightPaths && map && historicalData?.flight_paths?.length > 0) {
      console.log('Map and data ready, setting pathsReady to true')
      // Small delay to ensure Google Maps is fully initialized
      const timer = setTimeout(() => {
        setPathsReady(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setPathsReady(false);
    }
  }, [map, historicalData, showFlightPaths])

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {dataLoading ? 'Loading historical flight data...' : 'Loading map...'}
          </p>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Historical Flight Analysis</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Comprehensive analysis of Phoenix PD helicopter surveillance patterns over time,
          imported from FlightRadar24 Gold subscription data and other public sources.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aircraft</label>
            <select
              value={selectedAircraft}
              onChange={(e) => setSelectedAircraft(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            >
              <option value="all">All Aircraft</option>
              <option value="N624FB">N624FB</option>
              <option value="N625FB">N625FB</option>
              <option value="N626FB">N626FB</option>
              <option value="N627FB">N627FB</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
            >
              <option value="map">Map View</option>
              <option value="timeline">Timeline Analysis</option>
              <option value="patterns">Pattern Analysis</option>
            </select>
          </div>
        </div>

        {/* Display Options */}
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Display Options</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showFlightPaths}
                onChange={(e) => setShowFlightPaths(!showFlightPaths)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Flight Paths</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Surveillance Heatmap</span>
            </label>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs ml-auto">
              <div className="font-semibold text-gray-700 dark:text-gray-300 mr-1">Surveillance Likelihood:</div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#0088ff' }}></div>
                <span className="text-gray-700 dark:text-gray-300">Low (0-30%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#ffaa00' }}></div>
                <span className="text-gray-700 dark:text-gray-300">Medium (30-50%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#ff6600' }}></div>
                <span className="text-gray-700 dark:text-gray-300">High (50-70%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#ff0000' }}></div>
                <span className="text-gray-700 dark:text-gray-300">Critical (70%+)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-2xl mb-1">🛩️</div>
          <div className="text-2xl font-bold text-blue-600">
            {historicalData?.total_flights || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Total Flights Analyzed</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-2xl mb-1">👁️</div>
          <div className="text-2xl font-bold text-orange-600">
            {historicalData?.surveillance_flights || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Surveillance Flights</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-2xl font-bold text-red-600">
            {historicalData?.constitutional_violations || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Constitutional Violations</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-2xl mb-1">⏱️</div>
          <div className="text-2xl font-bold text-purple-600">
            {historicalData?.avg_surveillance_duration || 0}min
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Avg. Surveillance Duration</div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'map' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Historical Flight Paths</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {historicalData?.flight_paths?.length || 0} of {historicalData?.total_flights || 0} flights
              {historicalData?.flight_paths && historicalData.flight_paths.length > 0 && (
                <span className="ml-2">
                  • {historicalData.flight_paths.reduce((sum: number, p: any) => sum + (p.coordinates?.length || 0), 0).toLocaleString()} GPS points
                </span>
              )}
            </div>
          </div>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={phoenixCenter}
            zoom={11}
            options={mapOptions}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
          >
              {/* Historical Flight Markers with helicopter icons */}
              {!showFlightPaths && historicalData?.flights?.map((flight: any) => {
                // Custom helicopter path (top-down view)
                const helicopterPath = 'M 0,-10 L -5,-5 L -5,5 L -2,8 L -2,10 L 2,10 L 2,8 L 5,5 L 5,-5 L 0,-10 M -8,0 L 8,0 M 0,-8 L 0,8'

                // Use bright colors for high contrast against dark map
                let fillColor = '#00ffff' // Cyan for normal
                let strokeColor = '#ffffff' // White stroke for visibility
                let scale = 1.0

                if (flight.is_surveillance) {
                  fillColor = '#ff0000' // Bright red for surveillance
                  strokeColor = '#ffff00' // Yellow stroke for extra visibility
                  scale = 1.2
                }

                return (
                  <Marker
                    key={flight.id}
                    position={{ lat: flight.start_lat, lng: flight.start_lng }}
                    icon={{
                      path: helicopterPath,
                      scale: scale,
                      fillColor: fillColor,
                      fillOpacity: 1.0,
                      strokeColor: strokeColor,
                      strokeWeight: 2,
                      rotation: flight.heading || 0,
                      anchor: new window.google.maps.Point(0, 0),
                    }}
                  />
                )
              })}

              {/* Flight Paths with graduated color coding based on surveillance likelihood */}
              {showFlightPaths && pathsReady && historicalData?.flight_paths?.map((path: any, index: number) => {
                // Color gradient based on surveillance_likelihood (0.0 - 1.0)
                const likelihood = path.surveillance_likelihood || 0
                let pathColor = '#0088ff' // Blue for low likelihood (0.0-0.3)
                let strokeWeight = 3
                let strokeOpacity = 0.8

                if (likelihood >= 0.7) {
                  // High surveillance: Red
                  pathColor = '#ff0000'
                  strokeWeight = 5
                  strokeOpacity = 0.95
                } else if (likelihood >= 0.5) {
                  // Medium-high surveillance: Orange-red
                  pathColor = '#ff6600'
                  strokeWeight = 4
                  strokeOpacity = 0.9
                } else if (likelihood >= 0.3) {
                  // Medium surveillance: Yellow-orange
                  pathColor = '#ffaa00'
                  strokeWeight = 4
                  strokeOpacity = 0.85
                } else {
                  // Low surveillance: Blue to cyan gradient
                  const blueValue = Math.floor(136 + (likelihood / 0.3) * 119) // 0x88 to 0xff
                  pathColor = `#00${blueValue.toString(16).padStart(2, '0')}ff`
                  strokeWeight = 3
                  strokeOpacity = 0.75
                }

                return (
                  <Polyline
                    key={`path-${path.flight_id}`}
                    path={path.coordinates}
                    options={{
                      strokeColor: pathColor,
                      strokeOpacity: strokeOpacity,
                      strokeWeight: strokeWeight,
                      geodesic: true,
                      zIndex: Math.floor(likelihood * 1000) + 100, // Higher surveillance on top
                    }}
                  />
                )
              })}

              {/* Heatmap with better visibility */}
              {showHeatmap && historicalData?.heatmap_data && window.google?.maps?.LatLng && (
                <HeatmapLayer
                  data={historicalData.heatmap_data.map((point: any) => ({
                    location: new window.google.maps.LatLng(point.lat, point.lng),
                    weight: point.weight || 1
                  }))}
                  options={{
                    radius: 50,
                    opacity: 0.7,
                    gradient: [
                      'rgba(0, 255, 255, 0)',
                      'rgba(0, 255, 255, 1)',
                      'rgba(0, 191, 255, 1)',
                      'rgba(0, 127, 255, 1)',
                      'rgba(0, 63, 255, 1)',
                      'rgba(0, 0, 255, 1)',
                      'rgba(0, 0, 223, 1)',
                      'rgba(0, 0, 191, 1)',
                      'rgba(0, 0, 159, 1)',
                      'rgba(0, 0, 127, 1)',
                      'rgba(63, 0, 91, 1)',
                      'rgba(127, 0, 63, 1)',
                      'rgba(191, 0, 31, 1)',
                      'rgba(255, 0, 0, 1)'
                    ]
                  }}
                />
              )}
            </GoogleMap>
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Surveillance Activity Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData?.timeline_data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="surveillance_flights" stroke="#dc2626" strokeWidth={2} />
                <Line type="monotone" dataKey="total_flights" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Daily Activity Pattern</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalData?.hourly_pattern || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="surveillance_count" fill="#f59e0b" />
                <Bar dataKey="total_count" fill="#6b7280" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'patterns' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Surveillance Intensity by Area</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historicalData?.area_analysis || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="surveillance_intensity" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Duration vs Altitude Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={historicalData?.duration_altitude_analysis || []}>
                  <CartesianGrid />
                  <XAxis dataKey="altitude" name="Altitude" unit="ft" />
                  <YAxis dataKey="duration" name="Duration" unit="min" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Pattern Analysis Results</h3>
            <div className="space-y-4">
              {historicalData?.pattern_insights?.map((insight: any, index: number) => (
                <div key={index} className={`p-4 border-l-4 rounded ${
                  insight.severity === 'high' ? 'border-red-500 bg-red-50 dark:bg-red-900/30' :
                  insight.severity === 'medium' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                }`}>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{insight.description}</p>
                  {insight.legal_implications && (
                    <div className="text-xs mt-2 font-medium text-gray-600 dark:text-gray-400">
                      Legal Implications: {insight.legal_implications}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Historical Data Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Data Sources</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• FlightRadar24 Gold: {historicalData?.sources?.flightradar24 || 0} flights</li>
              <li>• Public Records: {historicalData?.sources?.public_records || 0} documents</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Time Coverage</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Earliest Flight: {historicalData?.time_range?.start || 'N/A'}</li>
              <li>• Latest Flight: {historicalData?.time_range?.end || 'N/A'}</li>
              <li>• Total Days: {historicalData?.time_range?.total_days || 0}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Legal Readiness</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Court-ready incidents: {historicalData?.legal_readiness?.court_ready || 0}</li>
              <li>• Verified violations: {historicalData?.legal_readiness?.verified || 0}</li>
              <li>• Expert analysis: {historicalData?.legal_readiness?.expert_analyzed || 0}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
