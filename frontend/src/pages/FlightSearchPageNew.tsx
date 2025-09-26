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
  distance_from_search: number
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
  search_radius: number
}

const defaultCenter = {
  lat: 33.4484,
  lng: -112.0740,
}

// Phoenix area bounds for autocomplete
const phoenixBounds = {
  north: 33.920,
  south: 33.290,
  east: -111.550,
  west: -112.400,
}

// Map theme
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

const getLocalTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/Phoenix'
  }
}

const getLocalDateTimeString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function FlightSearchPageNew() {
  const navigate = useNavigate()
  const [timezone] = useState(getLocalTimezone())

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const now = new Date()
    const oneHourAgo = new Date(Date.now() - 3600000)

    return {
      start_time: getLocalDateTimeString(oneHourAgo),
      end_time: getLocalDateTimeString(now),
      search_radius: 1000,
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
    const fetchAircraft = async () => {
      try {
        const response = await axios.get('/api/v1/aircraft/')
        setAircraftList(response.data.map((a: any) => a.registration))
      } catch (error) {
        console.error('Error fetching aircraft:', error)
      }
    }
    fetchAircraft()
  }, [])

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const coords = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      }
      setFilters(prev => ({
        ...prev,
        search_coordinates: coords,
        search_address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
      }))
      setMapCenter(coords)
    }
  }, [])

  const handleRadiusChange = useCallback((newRadius: number) => {
    if (newRadius >= 100 && newRadius <= 10000) {
      setFilters(prev => ({ ...prev, search_radius: newRadius }))

      if (filters.search_coordinates && mapRef.current) {
        const bounds = new google.maps.LatLngBounds()
        const center = new google.maps.LatLng(
          filters.search_coordinates.lat,
          filters.search_coordinates.lng
        )

        const radiusInDegrees = newRadius / 111320
        bounds.extend(new google.maps.LatLng(
          filters.search_coordinates.lat - radiusInDegrees,
          filters.search_coordinates.lng - radiusInDegrees
        ))
        bounds.extend(new google.maps.LatLng(
          filters.search_coordinates.lat + radiusInDegrees,
          filters.search_coordinates.lng + radiusInDegrees
        ))

        mapRef.current.fitBounds(bounds)
      }
    }
  }, [filters.search_coordinates])

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

        if (mapRef.current) {
          mapRef.current.setCenter(coords)
          mapRef.current.setZoom(14)
        }
      }
    }
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const startTime = new Date(filters.start_time).toISOString()
      const endTime = new Date(filters.end_time).toISOString()

      const params: any = {
        start_time: startTime,
        end_time: endTime,
      }

      if (filters.aircraft_registration) {
        params.aircraft_registration = filters.aircraft_registration
      }

      if (filters.search_coordinates) {
        params.latitude = filters.search_coordinates.lat
        params.longitude = filters.search_coordinates.lng
        params.radius = filters.search_radius
      }

      const response = await axios.get('/api/v1/flights/search', { params })
      setSearchResults(response.data.flights || [])

      if (response.data.flights?.length > 0 && filters.search_coordinates) {
        const firstFlight = response.data.flights[0]
        if (firstFlight.closest_position) {
          setMapCenter({
            lat: firstFlight.closest_position.latitude,
            lng: firstFlight.closest_position.longitude
          })
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFlightDetails = async (flight: FlightResult) => {
    try {
      const response = await axios.get(`/api/v1/flights/${flight.id}/positions`)
      if (response.data) {
        const path = response.data.map((pos: any) => ({
          lat: pos.latitude,
          lng: pos.longitude
        }))
        setFlightPath(path)

        if (path.length > 0 && mapRef.current) {
          const bounds = new google.maps.LatLngBounds()
          path.forEach(point => bounds.extend(point))
          mapRef.current.fitBounds(bounds)
        }
      }
    } catch (error) {
      console.error('Error fetching flight details:', error)
    }
  }

  useEffect(() => {
    if (selectedFlight) {
      fetchFlightDetails(selectedFlight)
    }
  }, [selectedFlight])

  return (
    <div className="h-full flex flex-col">
      {/* Compact Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={filters.start_time}
              onChange={(e) => setFilters(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              value={filters.end_time}
              onChange={(e) => setFilters(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aircraft
            </label>
            <select
              value={filters.aircraft_registration || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, aircraft_registration: e.target.value || undefined }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Helicopters</option>
              {aircraftList.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location (click map or type)
            </label>
            <Autocomplete
              onLoad={ref => autocompleteRef.current = ref}
              onPlaceChanged={onPlaceSelected}
              options={{
                bounds: phoenixBounds,
                componentRestrictions: { country: 'us' },
                types: ['geocode']
              }}
            >
              <input
                type="text"
                placeholder="Address or area"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </Autocomplete>
          </div>

          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Radius
            </label>
            <input
              type="number"
              value={filters.search_radius}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              min="100"
              max="10000"
              step="100"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg flex items-center gap-2"
          >
            {loading ? 'Searching...' : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left Side - Results */}
        <div className="w-2/5 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {loading ? 'Searching...' : `Results (${searchResults.length})`}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Searching flights...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((flight) => (
                  <div
                    key={flight.id}
                    onClick={() => {
                      setSelectedFlight(flight)
                      navigate(`/flight/${flight.id}`)
                    }}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      selectedFlight?.id === flight.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Plane className="h-3 w-3 text-blue-600" />
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {flight.registration}
                          </span>
                          {flight.callsign && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({flight.callsign})
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatLocalTime(flight.departure_time)}
                          </div>

                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {flight.duration_minutes ? `${Math.round(flight.duration_minutes)} min` : 'In flight'}
                          </div>

                          {flight.distance_from_search !== undefined && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {(flight.distance_from_search / 1000).toFixed(1)} km away
                            </div>
                          )}

                          {flight.surveillance_score > 0 && (
                            <div className="mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs">Score:</span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-[80px]">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      flight.surveillance_score > 0.7 ? 'bg-red-500' :
                                      flight.surveillance_score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${(flight.surveillance_score || 0) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs">{Math.round((flight.surveillance_score || 0) * 100)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No flights found
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Try adjusting your search criteria
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Map */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-3">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={11}
            onClick={handleMapClick}
            onLoad={map => mapRef.current = map}
            options={{
              styles: darkMapStyles,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {/* Search area circle */}
            {filters.search_coordinates && (
              <>
                <MarkerF
                  position={filters.search_coordinates}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#3B82F6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                />
                <Circle
                  center={filters.search_coordinates}
                  radius={filters.search_radius}
                  options={{
                    fillColor: '#3B82F6',
                    fillOpacity: 0.2,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
              </>
            )}

            {/* Flight markers */}
            {searchResults.map((flight) =>
              flight.closest_position && (
                <MarkerF
                  key={flight.id}
                  position={{
                    lat: flight.closest_position.latitude,
                    lng: flight.closest_position.longitude
                  }}
                  onClick={() => setSelectedFlight(flight)}
                  icon={{
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: selectedFlight?.id === flight.id ? '#EF4444' : '#10B981',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    rotation: 0,
                  }}
                />
              )
            )}

            {/* Selected flight path */}
            {flightPath.length > 0 && (
              <Polyline
                path={flightPath}
                options={{
                  strokeColor: '#EF4444',
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                }}
              />
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  )
}