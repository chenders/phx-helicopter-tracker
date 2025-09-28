import React, { useState, useEffect, useCallback, useRef } from 'react'
import { GoogleMap, MarkerF, Circle, Polyline, Autocomplete } from '@react-google-maps/api'
import { Search, Calendar, MapPin, Plane, Clock, Radio, ChevronRight, Play, Pause, Volume2 } from 'lucide-react'
import axios from '@/lib/axios'
import { useNavigate } from 'react-router-dom'
import { formatLocalTime } from '../utils/dateUtils'

interface FlightResult {
  id: number
  aircraft_id: string
  registration: string
  callsign: string
  departure_time: string
  arrival_time: string
  duration_minutes: number
  max_altitude: number
  min_altitude: number
  positions_count: number
  hover_locations: any[]
  surveillance_score: number
  distance_from_search: number // Distance in meters from search location
  closest_position: {
    latitude: number
    longitude: number
    timestamp: string
    altitude: number
  }
}

interface SearchFilters {
  start_time: string
  end_time: string
  aircraft_registration?: string
  search_address?: string
  search_coordinates?: {
    lat: number
    lng: number
  }
  search_radius: number // in miles
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

const defaultCenter = {
  lat: 33.4484,
  lng: -112.0740, // Phoenix
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

// Helper function to get local timezone or Mountain Time as fallback
const getLocalTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/Phoenix' // Mountain Time (Phoenix doesn't observe DST)
  }
}

// Helper to format datetime-local input value in local timezone
const getLocalDateTimeString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function FlightSearchPage() {
  const navigate = useNavigate()
  const [timezone] = useState(getLocalTimezone())

  // Initialize with local times
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const now = new Date()
    const oneHourAgo = new Date(Date.now() - 3600000)

    return {
      start_time: getLocalDateTimeString(oneHourAgo),
      end_time: getLocalDateTimeString(now),
      search_radius: 0.6, // 0.6 miles default
    }
  })

  const [searchResults, setSearchResults] = useState<FlightResult[]>([])
  const [selectedFlight, setSelectedFlight] = useState<FlightResult | null>(null)
  const [flightPath, setFlightPath] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [addressInput, setAddressInput] = useState('')
  const [aircraftList, setAircraftList] = useState<string[]>([])
  const [radioFiles, setRadioFiles] = useState<any[]>([])
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Fetch aircraft list on mount
  useEffect(() => {
    fetchAircraftList()
  }, [])

  // Auto-adjust map view when search location or radius changes
  useEffect(() => {
    if (mapRef.current && filters.search_coordinates) {
      const bounds = new window.google.maps.LatLngBounds()
      const center = new window.google.maps.LatLng(
        filters.search_coordinates.lat,
        filters.search_coordinates.lng
      )

      // Calculate bounds based on radius
      const radiusInMeters = filters.search_radius * 1609.34 // Convert miles to meters
      const radiusInDegrees = radiusInMeters / 111320 // Convert meters to degrees (approximate)

      bounds.extend({
        lat: filters.search_coordinates.lat - radiusInDegrees,
        lng: filters.search_coordinates.lng - radiusInDegrees
      })
      bounds.extend({
        lat: filters.search_coordinates.lat + radiusInDegrees,
        lng: filters.search_coordinates.lng + radiusInDegrees
      })

      mapRef.current.fitBounds(bounds)

      // Adjust zoom based on radius (in miles)
      // Smaller radius = higher zoom
      if (filters.search_radius <= 0.3) {
        mapRef.current.setZoom(16)
      } else if (filters.search_radius <= 0.6) {
        mapRef.current.setZoom(15)
      } else if (filters.search_radius <= 1.2) {
        mapRef.current.setZoom(14)
      } else if (filters.search_radius <= 2) {
        mapRef.current.setZoom(13)
      } else {
        mapRef.current.setZoom(12)
      }

      mapRef.current.setCenter(center)
    }
  }, [filters.search_coordinates, filters.search_radius])

  const fetchAircraftList = async () => {
    try {
      const response = await axios.get('/api/v1/aircraft')
      const phoenixAircraft = response.data
        .filter((a: any) => a.is_phoenix_pd)
        .map((a: any) => a.registration)
      setAircraftList(phoenixAircraft)
    } catch (error) {
      console.error('Failed to fetch aircraft:', error)
    }
  }

  const onPlaceSelected = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()

      if (place.geometry?.location) {
        const coords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
        setFilters(prev => ({
          ...prev,
          search_coordinates: coords,
          search_address: place.formatted_address || place.name || ''
        }))
        setMapCenter(coords)
        setAddressInput(place.formatted_address || place.name || '')
      }
    }
  }, [])

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete

    // Set options to bias toward Phoenix area
    autocomplete.setOptions({
      bounds: new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(33.2, -112.4), // SW Phoenix area
        new window.google.maps.LatLng(33.7, -111.7)  // NE Phoenix area
      ),
      componentRestrictions: { country: 'us' },
      fields: ['geometry', 'formatted_address', 'name']
    })
  }, [])

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const coords = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      }
      setFilters(prev => ({ ...prev, search_coordinates: coords }))
    }
  }, [])

  const searchFlights = async () => {
    setLoading(true)
    try {
      // Convert local datetime strings to ISO format for API
      const startDate = new Date(filters.start_time)
      const endDate = new Date(filters.end_time)

      const params = {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        ...(filters.aircraft_registration && { aircraft_registration: filters.aircraft_registration }),
        ...(filters.search_coordinates && {
          latitude: filters.search_coordinates.lat,
          longitude: filters.search_coordinates.lng,
          radius: filters.search_radius * 1609.34, // Convert miles to meters for API
        }),
      }

      const response = await axios.get('/api/v1/flights/search', { params })
      setSearchResults(response.data.flights || [])

      // If location search, sort by distance
      if (filters.search_coordinates) {
        setSearchResults(prev => [...prev].sort((a, b) => a.distance_from_search - b.distance_from_search))
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const loadFlightDetails = async (flight: FlightResult) => {
    setSelectedFlight(flight)

    // Load flight path
    try {
      const response = await axios.get(`/api/v1/flights/${flight.id}/positions`)
      const positions = response.data.map((pos: any) => ({
        lat: pos.latitude,
        lng: pos.longitude,
        altitude: pos.altitude_feet,
        timestamp: pos.timestamp,
        is_hovering: pos.is_hovering,
      }))
      setFlightPath(positions)

      // Center map on flight path
      if (positions.length > 0) {
        const bounds = new window.google.maps.LatLngBounds()
        positions.forEach((pos: any) => bounds.extend(pos))
        // We'll handle bounds in the map component
      }
    } catch (error) {
      console.error('Failed to load flight path:', error)
    }

    // Load radio files for the time period
    try {
      const response = await axios.get('/api/v1/radio/archives', {
        params: {
          start_time: flight.departure_time,
          end_time: flight.arrival_time,
        }
      })
      setRadioFiles(response.data.archives || [])
    } catch (error) {
      console.error('Failed to load radio archives:', error)
    }
  }

  const playRadioFile = (filename: string) => {
    if (playingAudio === filename && audioRef.current) {
      audioRef.current.pause()
      setPlayingAudio(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(`/api/v1/radio/archives/${filename}/audio`)
      audioRef.current = audio
      audio.play()
      setPlayingAudio(filename)

      audio.addEventListener('ended', () => {
        setPlayingAudio(null)
      })
    }
  }

  const navigateToFlightDetail = (flightId: number) => {
    navigate(`/flight/${flightId}`)
  }

  // Format time for display
  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const duration = (endDate.getTime() - startDate.getTime()) / 60000 // minutes

    return {
      start: formatLocalTime(start),
      end: formatLocalTime(end),
      duration: Math.round(duration)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Flight Search
        </h1>

        {/* Search Filters */}
        <div className="space-y-4">
          {/* Date/Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({timezone.includes('America') ? timezone.split('/')[1] : timezone})
                </span>
              </label>
              <input
                type="datetime-local"
                value={filters.start_time}
                onChange={(e) => setFilters(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({timezone.includes('America') ? timezone.split('/')[1] : timezone})
                </span>
              </label>
              <input
                type="datetime-local"
                value={filters.end_time}
                onChange={(e) => setFilters(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Aircraft Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aircraft (Optional)
            </label>
            <select
              value={filters.aircraft_registration || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, aircraft_registration: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Phoenix PD Helicopters</option>
              {aircraftList.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Location Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location (Optional - Click map or enter address)
            </label>
            <div className="flex gap-2">
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceSelected}
                className="flex-1"
              >
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Start typing an address..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </Autocomplete>
              <button
                onClick={() => {
                  if (filters.search_coordinates) {
                    // Clear location search
                    setFilters(prev => ({
                      ...prev,
                      search_coordinates: undefined,
                      search_address: undefined
                    }))
                    setAddressInput('')
                    setMapCenter(defaultCenter)
                    if (mapRef.current) {
                      mapRef.current.setCenter(defaultCenter)
                      mapRef.current.setZoom(12)
                    }
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  filters.search_coordinates
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
                title={filters.search_coordinates ? 'Clear location' : 'Search by location'}
              >
                <MapPin className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search Radius */}
          {filters.search_coordinates && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Radius: {filters.search_radius} mi
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={filters.search_radius}
                onChange={(e) => setFilters(prev => ({ ...prev, search_radius: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
          )}

          {/* Search Button */}
          <button
            onClick={searchFlights}
            disabled={loading}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            {loading ? 'Searching...' : 'Search Flights'}
          </button>
        </div>
      </div>

      {/* Map for location selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Click to Set Search Location
        </h2>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={12}
          onClick={handleMapClick}
          onLoad={(map) => {
            mapRef.current = map
          }}
          options={{
            styles: darkMapStyles,
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {/* Search location marker */}
          {filters.search_coordinates && (
            <>
              <MarkerF
                position={filters.search_coordinates}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
              <Circle
                center={filters.search_coordinates}
                radius={filters.search_radius * 1609.34} // Convert to meters for map
                options={{
                  fillColor: '#4299e1',
                  fillOpacity: 0.2,
                  strokeColor: '#2b6cb1',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
            </>
          )}

          {/* Selected flight path */}
          {flightPath.length > 0 && (
            <Polyline
              path={flightPath}
              options={{
                strokeColor: selectedFlight?.surveillance_score > 0.5 ? '#ff0000' : '#00ff00',
                strokeOpacity: 0.8,
                strokeWeight: 3,
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Results List */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-h-[600px] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Found {searchResults.length} Flights
            </h2>
            <div className="space-y-2">
              {searchResults.map((flight) => {
                const timeInfo = formatTimeRange(flight.departure_time, flight.arrival_time)
                return (
                  <div
                    key={flight.id}
                    onClick={() => loadFlightDetails(flight)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFlight?.id === flight.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          {flight.registration}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeInfo.start}
                          </div>
                          <div className="text-xs">
                            Duration: {timeInfo.duration} min
                          </div>
                          {filters.search_coordinates && (
                            <div className="text-xs mt-1">
                              Distance: {(flight.distance_from_search * 0.000621371).toFixed(2)} mi
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    {flight.surveillance_score > 0.5 && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        Surveillance Score: {(flight.surveillance_score * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Flight Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedFlight ? (
              <>
                {/* Flight Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Flight Details - {selectedFlight.registration}
                    </h3>
                    <button
                      onClick={() => navigateToFlightDetail(selectedFlight.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      View Full Details
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Callsign</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedFlight.callsign || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedFlight.duration_minutes} min
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Altitude Range</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedFlight.min_altitude} - {selectedFlight.max_altitude} ft
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Positions</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedFlight.positions_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Hover Locations</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedFlight.hover_locations?.length || 0}
                      </div>
                    </div>
                    {filters.search_coordinates && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Closest Approach</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {(selectedFlight.distance_from_search * 0.000621371).toFixed(2)} mi
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedFlight.closest_position && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Closest Position to Search Location
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        Time: {formatLocalTime(selectedFlight.closest_position.timestamp)}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        Altitude: {selectedFlight.closest_position.altitude} ft
                      </div>
                    </div>
                  )}
                </div>

                {/* Radio Archives */}
                {radioFiles.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Radio className="h-5 w-5" />
                      Radio Communications
                    </h3>
                    <div className="space-y-2">
                      {radioFiles.map((file) => (
                        <div
                          key={file.filename}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => playRadioFile(file.filename)}
                              className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                            >
                              {playingAudio === file.filename ? (
                                <Pause className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              ) : (
                                <Play className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              )}
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {file.timeRange || file.filename}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {file.size_mb.toFixed(1)} MB
                                {file.has_transcription && ' • Transcribed'}
                              </div>
                            </div>
                          </div>
                          {file.has_transcription && (
                            <button
                              onClick={() => navigate(`/radio?file=${file.filename}`)}
                              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              View Transcript
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
                Select a flight from the results to view details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && searchResults.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Set your search criteria above to find flights
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Tip: Click on the map to search for flights near a specific location
          </p>
        </div>
      )}
    </div>
  )
}