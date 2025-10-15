import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { GoogleMap, Marker, Polyline, HeatmapLayer, Circle } from '@react-google-maps/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts'
import { useHistoricalData } from '../hooks/useHistoricalData'
import { useAreaAnalysis } from '../hooks/useAreaAnalysis'

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
  const [viewMode, setViewMode] = useState('map') // map, timeline, patterns, area
  const [selectedAircraft, setSelectedAircraft] = useState('all')
  const [showFlightPaths, setShowFlightPaths] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [pathsReady, setPathsReady] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedFlightIds, setSelectedFlightIds] = useState<Set<number>>(new Set())
  const [flightSortBy, setFlightSortBy] = useState<'surveillance' | 'date' | 'duration' | 'neighborhood'>('surveillance')
  const [showOnlySurveillance, setShowOnlySurveillance] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const flightsPerPage = 20

  // Area analysis state
  const [areaCenter, setAreaCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [areaRadius, setAreaRadius] = useState(500) // meters
  const [areaName, setAreaName] = useState('')

  const { data: historicalData, isLoading: dataLoading } = useHistoricalData(timeRange, selectedAircraft)
  const { mutate: analyzeArea, data: areaData, isPending: areaAnalyzing, reset: resetAreaAnalysis } = useAreaAnalysis()

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    console.log('Map loaded and set')
  }, [])

  const onMapUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Flights start unselected by default - user must manually select flights to view
  // (removed auto-select all behavior)

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

  // Filter and sort flights for sidebar
  const filteredFlights = historicalData?.flights_list
    ? historicalData.flights_list
        .filter((f: any) => !showOnlySurveillance || f.is_surveillance)
        .sort((a: any, b: any) => {
          if (flightSortBy === 'surveillance') {
            // First, prioritize actual surveillance flights (is_surveillance = true)
            const aIsSurveillance = a.is_surveillance ? 1 : 0
            const bIsSurveillance = b.is_surveillance ? 1 : 0
            if (aIsSurveillance !== bIsSurveillance) {
              return bIsSurveillance - aIsSurveillance // Surveillance flights first
            }
            // Within each group (surveillance or not), sort by likelihood score
            return (b.surveillance_likelihood || 0) - (a.surveillance_likelihood || 0)
          } else if (flightSortBy === 'date') {
            return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime()
          } else if (flightSortBy === 'duration') {
            return (b.duration_minutes || 0) - (a.duration_minutes || 0)
          } else { // hover_area
            // Sort by first hover area alphabetically, flights with no hover areas go last
            const aHoverArea = a.hover_areas && a.hover_areas.length > 0 ? a.hover_areas[0] : 'ZZZZZ'
            const bHoverArea = b.hover_areas && b.hover_areas.length > 0 ? b.hover_areas[0] : 'ZZZZZ'
            return aHoverArea.localeCompare(bHoverArea)
          }
        })
    : []

  // Pagination
  const totalPages = Math.ceil(filteredFlights.length / flightsPerPage)
  const startIndex = (currentPage - 1) * flightsPerPage
  const endIndex = startIndex + flightsPerPage
  const paginatedFlights = filteredFlights.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [timeRange, selectedAircraft, showOnlySurveillance, flightSortBy])

  // Toggle flight selection
  const toggleFlight = (flightId: number) => {
    setSelectedFlightIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(flightId)) {
        newSet.delete(flightId)
      } else {
        newSet.add(flightId)
      }
      return newSet
    })
  }

  // Select/deselect all flights (all pages)
  const selectAll = () => {
    const allIds = new Set<number>(filteredFlights.map((f: any) => f.id as number))
    setSelectedFlightIds(allIds)
  }

  const deselectAll = () => {
    setSelectedFlightIds(new Set())
  }

  // Select/deselect current page only
  const selectCurrentPage = () => {
    setSelectedFlightIds(prev => {
      const newSet = new Set(prev)
      paginatedFlights.forEach((f: any) => newSet.add(f.id))
      return newSet
    })
  }

  const deselectCurrentPage = () => {
    setSelectedFlightIds(prev => {
      const newSet = new Set(prev)
      paginatedFlights.forEach((f: any) => newSet.delete(f.id))
      return newSet
    })
  }

  // Handle map click for area selection
  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (viewMode === 'area' && e.latLng) {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      setAreaCenter({ lat, lng })

      // Analyze the area automatically
      analyzeArea({
        centerLat: lat,
        centerLon: lng,
        radiusMeters: areaRadius,
        areaName: areaName || `Area at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      })
    }
  }, [viewMode, areaRadius, areaName, analyzeArea])

  // Filter flight paths to only show selected flights
  const visibleFlightPaths = historicalData?.flight_paths?.filter((path: any) =>
    selectedFlightIds.has(path.id)
  ) || []

  // Auto-zoom map to fit selected flight paths
  useEffect(() => {
    if (!map || !visibleFlightPaths || visibleFlightPaths.length === 0) {
      return
    }

    // Create bounds object
    const bounds = new window.google.maps.LatLngBounds()

    // Add all coordinates from visible flight paths to bounds
    let hasCoordinates = false
    visibleFlightPaths.forEach((path: any) => {
      if (path.coordinates && Array.isArray(path.coordinates)) {
        path.coordinates.forEach((coord: any) => {
          if (coord.lat && coord.lng) {
            bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng))
            hasCoordinates = true
          }
        })
      }
    })

    // Only fit bounds if we have coordinates
    if (hasCoordinates) {
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      })
    }
  }, [map, visibleFlightPaths])

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
          based on actual flight tracking data from FlightRadar24 API.
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
              <option value="area">Area Analysis</option>
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
        <div className="flex gap-3">
          {/* Flight Selection Sidebar */}
          {showSidebar && (
            <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 max-h-[800px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Flights</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Hide sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Sidebar Controls */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                  <select
                    value={flightSortBy}
                    onChange={(e) => setFlightSortBy(e.target.value as any)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1"
                  >
                    <option value="surveillance">Surveillance Likelihood</option>
                    <option value="date">Date (Newest First)</option>
                    <option value="duration">Duration</option>
                    <option value="neighborhood">Hover Location</option>
                  </select>
                </div>

                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={showOnlySurveillance}
                    onChange={(e) => setShowOnlySurveillance(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Surveillance Only</span>
                </label>

                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">This Page:</div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectCurrentPage}
                      className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select
                    </button>
                    <button
                      onClick={deselectCurrentPage}
                      className="flex-1 text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Deselect
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">All Pages:</div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="flex-1 text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  {selectedFlightIds.size} of {filteredFlights.length} selected
                </div>
              </div>

              {/* Pagination Info */}
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center mb-2">
                Page {currentPage} of {totalPages} ({startIndex + 1}-{Math.min(endIndex, filteredFlights.length)} of {filteredFlights.length})
              </div>

              {/* Flight List */}
              <div className="space-y-2">
                {paginatedFlights.map((flight: any) => {
                  const isSelected = selectedFlightIds.has(flight.id)
                  const likelihood = flight.surveillance_likelihood || 0
                  const isSurveillance = flight.is_surveillance

                  // Get color based on surveillance likelihood
                  let borderColor = 'border-gray-300 dark:border-gray-600'
                  if (likelihood >= 0.7) borderColor = 'border-red-500'
                  else if (likelihood >= 0.5) borderColor = 'border-orange-500'
                  else if (likelihood >= 0.3) borderColor = 'border-yellow-500'
                  else borderColor = 'border-blue-500'

                  return (
                    <div
                      key={flight.id}
                      onClick={() => toggleFlight(flight.id)}
                      className={`p-2 border-l-4 rounded cursor-pointer transition-all ${borderColor} ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700/50 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {flight.aircraft_registration}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(flight.departure_time).toLocaleDateString()} • {Math.round(flight.duration_minutes || 0)}min
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFlight(flight.id)}
                          className="ml-2 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                        {isSurveillance && (
                          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                            Surveillance
                          </span>
                        )}
                        {flight.hover_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded">
                            {flight.hover_count} hovers
                          </span>
                        )}
                        {flight.has_patterns && flight.patterns && flight.patterns.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {flight.patterns.map((p: string) => p.replace('_', ' ')).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Hover location information */}
                      {flight.hover_areas && flight.hover_areas.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">📍 Hover: </span>
                          <div className="ml-4 mt-0.5 space-y-0.5">
                            {flight.hover_areas.map((area: string, idx: number) => (
                              <div key={idx}>{area}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-1">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Likelihood: {(likelihood * 100).toFixed(0)}%</span>
                          <span>
                            {flight.min_altitude != null && flight.max_altitude != null
                              ? `${Math.round(flight.min_altitude)}-${Math.round(flight.max_altitude)}ft`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Link to flight detail page */}
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          to={`/flight/${flight.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View 3D Flight
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Map Container */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {!showSidebar && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Show Flights
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Historical Flight Paths</h2>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {visibleFlightPaths.length} of {historicalData?.total_flights || 0} flights
                {visibleFlightPaths.length > 0 && (
                  <span className="ml-2">
                    • {visibleFlightPaths.reduce((sum: number, p: any) => sum + (p.coordinates?.length || 0), 0).toLocaleString()} GPS points
                  </span>
                )}
              </div>
            </div>

          <div className="relative">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={phoenixCenter}
              zoom={11}
              options={mapOptions}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
              onClick={onMapClick}
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
              {showFlightPaths && pathsReady && visibleFlightPaths.map((path: any, index: number) => {
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

              {/* Hover Location Markers */}
              {showFlightPaths && pathsReady && visibleFlightPaths.map((path: any) => {
                if (!path.hover_locations || path.hover_locations.length === 0) return null

                return path.hover_locations.map((hover: any, idx: number) => (
                  <Marker
                    key={`hover-${path.flight_id}-${idx}`}
                    position={{ lat: hover.lat, lng: hover.lng }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: '#ff6600',
                      fillOpacity: 0.8,
                      strokeColor: '#ff0000',
                      strokeWeight: 2,
                    }}
                    title={`Hover: ${hover.duration_minutes?.toFixed(1) || 0}min`}
                  />
                ))
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

          {/* Map Legend - positioned below map */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Map Legend</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Flight Path Colors */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Flight Paths (by surveillance likelihood):</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5" style={{ backgroundColor: '#0088ff' }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Low (0-30%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1" style={{ backgroundColor: '#ffaa00' }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Medium (30-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1" style={{ backgroundColor: '#ff6600' }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">High (50-70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1.5" style={{ backgroundColor: '#ff0000' }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Critical (70%+)</span>
                </div>
              </div>

              {/* Hover Markers */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Markers:</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff6600', border: '2px solid #ff0000' }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Hover location</span>
                </div>
              </div>

              {/* Line Thickness Note */}
              <div className="flex items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Line thickness increases with surveillance likelihood
                </div>
              </div>
            </div>
          </div>
          </div>
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

      {viewMode === 'area' && (
        <div className="space-y-3">
          {/* Area Selection Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📍 Geographic Area Analysis</h3>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Click anywhere on the map to analyze helicopter activity in that area.
              You can adjust the radius and area name below before clicking.
            </p>
          </div>

          {/* Area Analysis Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Analysis Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Analysis Radius (meters)
                </label>
                <input
                  type="number"
                  min="100"
                  max="5000"
                  step="100"
                  value={areaRadius}
                  onChange={(e) => setAreaRadius(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {areaRadius}m ≈ {(areaRadius * 3.28084).toFixed(0)} ft
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Area Name (optional)
                </label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g., My Neighborhood"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Map for Area Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {areaCenter ? 'Selected Area' : 'Click Map to Select Area'}
            </h3>
            <div className="relative">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={areaCenter || phoenixCenter}
                zoom={areaCenter ? 15 : 11}
                options={{
                  ...mapOptions,
                  clickableIcons: false,
                }}
                onClick={onMapClick}
              >
                {areaCenter && (
                  <>
                    <Marker position={areaCenter} />
                    <Circle
                      center={areaCenter}
                      radius={areaRadius}
                      options={{
                        fillColor: '#3b82f6',
                        fillOpacity: 0.2,
                        strokeColor: '#3b82f6',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                      }}
                    />
                  </>
                )}
              </GoogleMap>
            </div>
          </div>

          {/* Area Analysis Results */}
          {areaAnalyzing && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Analyzing geographic area...</p>
            </div>
          )}

          {areaData && !areaAnalyzing && (
            <div className="space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="text-2xl mb-1">✈️</div>
                  <div className="text-2xl font-bold text-blue-600">{areaData.total_flights}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Flights</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="text-2xl mb-1">⏱️</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(areaData.total_flight_time_minutes / 60).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Flight Time</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="text-2xl mb-1">⚠️</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {(areaData.surveillance_likelihood * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Surveillance Likelihood</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="text-2xl mb-1">⚖️</div>
                  <div className="text-2xl font-bold text-red-600">
                    {areaData.constitutional_concern_level}/5
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Constitutional Concern</div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    Flight Activity Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">GPS Positions Recorded:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {areaData.total_positions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Unique Aircraft:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {areaData.unique_aircraft}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Hovering Events:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {areaData.hovering_events}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Circling Events:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {areaData.circling_events}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Low Altitude Events:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {areaData.low_altitude_events}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Night Flights:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {areaData.night_flights}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    Altitude Profile
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Average Altitude:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.round(areaData.avg_altitude_feet)} ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Minimum Altitude:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.round(areaData.min_altitude_feet)} ft
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Maximum Altitude:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.round(areaData.max_altitude_feet)} ft
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                      Privacy Analysis
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Privacy Expectation:</span>
                        <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                          areaData.privacy_expectation_level === 'high'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            : areaData.privacy_expectation_level === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        }`}>
                          {areaData.privacy_expectation_level.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Residential Density:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(areaData.residential_density * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Implications */}
              {areaData.constitutional_concern_level >= 3 && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                    ⚠️ Constitutional Concerns Detected
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-200 mb-3">
                    This area shows elevated constitutional concern levels ({areaData.constitutional_concern_level}/5)
                    based on surveillance patterns, privacy expectations, and flight characteristics.
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-200 space-y-1 ml-4">
                    {areaData.hovering_events > 5 && (
                      <li>• {areaData.hovering_events} hovering events (prolonged observation)</li>
                    )}
                    {areaData.low_altitude_events > 10 && (
                      <li>• {areaData.low_altitude_events} low-altitude passes (enhanced surveillance capability)</li>
                    )}
                    {areaData.night_flights > 5 && (
                      <li>• {areaData.night_flights} night flights (heightened privacy invasion)</li>
                    )}
                    {areaData.privacy_expectation_level === 'high' && (
                      <li>• High privacy expectation area (residential neighborhood)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Most Common Aircraft */}
              {areaData.most_common_aircraft && areaData.most_common_aircraft.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                    Most Active Aircraft in This Area
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {areaData.most_common_aircraft.map((aircraft: string) => (
                      <span
                        key={aircraft}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium"
                      >
                        {aircraft}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Historical Data Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Data Sources</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {historicalData?.sources && Object.entries(historicalData.sources).map(([source, count]) => (
                <li key={source}>• {source.replace('_', ' ')}: {count} flights</li>
              ))}
              {(!historicalData?.sources || Object.keys(historicalData.sources).length === 0) && (
                <li>• No source data available</li>
              )}
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
