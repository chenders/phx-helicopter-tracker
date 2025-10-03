import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { GoogleMap, MarkerF, Circle, Polyline, Autocomplete } from '@react-google-maps/api'
import { Search, Calendar, MapPin, Plane, Clock, Radio, ChevronRight, Play, Pause, Volume2, ArrowUpDown, Users } from 'lucide-react'
import axios from '@/lib/axios'
import { useNavigate } from 'react-router-dom'
import { formatLocalTime } from '../utils/dateUtils'

interface FlightResult {
  id: number
  aircraft_id: string
  flight_id?: string
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
  grouped_count?: number
  grouped_flights?: FlightResult[]
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

export function FlightSearchPage() {
  const navigate = useNavigate()
  const [timezone] = useState(getLocalTimezone())

  // Load saved filters from session storage
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const savedFilters = sessionStorage.getItem('flightSearchFilters')
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters)
        // Restore the search coordinates if they exist
        if (parsed.search_coordinates) {
          setTimeout(() => {
            setMapCenter(parsed.search_coordinates)
          }, 100)
        }
        return parsed
      } catch (e) {
        console.error('Error loading saved filters:', e)
      }
    }

    // Default values if no saved filters
    const now = new Date()
    const oneHourAgo = new Date(Date.now() - 3600000)
    return {
      start_time: getLocalDateTimeString(oneHourAgo),
      end_time: getLocalDateTimeString(now),
      search_radius: 0.5, // default 0.5 miles
    }
  })

  const [searchResults, setSearchResults] = useState<FlightResult[]>([])
  const [selectedFlight, setSelectedFlight] = useState<FlightResult | null>(null)
  const [flightPath, setFlightPath] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState(filters.search_coordinates || defaultCenter)
  const [addressInput, setAddressInput] = useState(() => {
    return sessionStorage.getItem('flightSearchAddress') || import.meta.env.VITE_MAIN_SEARCH_ADDRESS || ''
  })
  const [aircraftList, setAircraftList] = useState<string[]>([])
  const [radioFiles, setRadioFiles] = useState<any[]>([])
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'registration'>('date-desc')
  const [groupByFlightId, setGroupByFlightId] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Fetch aircraft list on mount and setup dark theme for autocomplete
  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const response = await axios.get('/api/v1/aircraft/')
        setAircraftList(response.data.aircraft.map((a: any) => a.registration))
      } catch (error) {
        console.error('Error fetching aircraft:', error)
      }
    }
    fetchAircraft()

    // If there's a default address from env and no saved session address, geocode it
    if (import.meta.env.VITE_MAIN_SEARCH_ADDRESS && !sessionStorage.getItem('flightSearchAddress') && window.google) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode(
        { address: import.meta.env.VITE_MAIN_SEARCH_ADDRESS },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location
            const coords = {
              lat: location.lat(),
              lng: location.lng()
            }
            setFilters(prev => ({
              ...prev,
              search_coordinates: coords,
              search_address: results[0].formatted_address
            }))
            setMapCenter(coords)
          }
        }
      )
    }

    // Add dark theme styles for Google autocomplete
    const style = document.createElement('style')
    style.innerHTML = `
      /* Dark theme for Google Autocomplete dropdown */
      .dark .pac-container {
        background-color: rgb(31, 41, 55) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-top: none !important;
        font-family: inherit !important;
      }

      .dark .pac-item {
        background-color: rgb(31, 41, 55) !important;
        color: rgb(243, 244, 246) !important;
        border-top: 1px solid rgb(55, 65, 81) !important;
        padding: 8px 12px !important;
        cursor: pointer !important;
      }

      .dark .pac-item:hover {
        background-color: rgb(55, 65, 81) !important;
      }

      .dark .pac-item-selected,
      .dark .pac-item-selected:hover {
        background-color: rgb(59, 130, 246) !important;
        color: white !important;
      }

      .dark .pac-matched {
        color: rgb(96, 165, 250) !important;
        font-weight: bold !important;
      }

      .dark .pac-item-query {
        color: rgb(209, 213, 219) !important;
      }

      .dark .pac-icon {
        filter: brightness(0.8) !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const coords = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      }
      const coordString = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
      setFilters(prev => ({
        ...prev,
        search_coordinates: coords,
        search_address: coordString
      }))
      setAddressInput(coordString) // Update the input field with coordinates
      setMapCenter(coords)
    }
  }, [])

  const handleRadiusChange = useCallback((newRadius: number) => {
    if (newRadius >= 0.1 && newRadius <= 5) { // 0.1 to 5 miles
      setFilters(prev => ({ ...prev, search_radius: newRadius }))

      if (filters.search_coordinates && mapRef.current) {
        const bounds = new google.maps.LatLngBounds()
        const center = new google.maps.LatLng(
          filters.search_coordinates.lat,
          filters.search_coordinates.lng
        )

        const radiusInMeters = newRadius * 1609.34 // Convert miles to meters
        const radiusInDegrees = radiusInMeters / 111320
        bounds.extend(new google.maps.LatLng(
          filters.search_coordinates.lat - radiusInDegrees,
          filters.search_coordinates.lng - radiusInDegrees
        ))
        bounds.extend(new google.maps.LatLng(
          filters.search_coordinates.lat + radiusInDegrees,
          filters.search_coordinates.lng + radiusInDegrees
        ))

        // Add padding to ensure the search area fits within 95% of the container
        const mapContainer = document.querySelector('[data-id="search-map-panel"]') as HTMLElement
        const padding = mapContainer ? {
          top: mapContainer.offsetHeight * 0.05,
          right: mapContainer.offsetWidth * 0.05,
          bottom: mapContainer.offsetHeight * 0.05,
          left: mapContainer.offsetWidth * 0.05
        } : 50

        mapRef.current.fitBounds(bounds, padding)
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
        const address = place.formatted_address || place.name || ''

        setFilters(prev => ({
          ...prev,
          search_coordinates: coords,
          search_address: address
        }))
        setAddressInput(address) // Auto-fill the input field
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
        params.radius = filters.search_radius * 1609.34 // Convert miles to meters for API
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

          // Add padding to ensure the flight path fits within 95% of the container
          // This gives a nice margin around the flight path
          const mapContainer = document.querySelector('[data-id="search-map-panel"]') as HTMLElement
          const padding = mapContainer ? {
            top: mapContainer.offsetHeight * 0.05,    // 5% padding
            right: mapContainer.offsetWidth * 0.05,   // 5% padding
            bottom: mapContainer.offsetHeight * 0.05, // 5% padding
            left: mapContainer.offsetWidth * 0.05     // 5% padding
          } : 50 // Fallback to 50px padding if container not found

          mapRef.current.fitBounds(bounds, padding)
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

  // Save filters to session storage whenever they change
  useEffect(() => {
    sessionStorage.setItem('flightSearchFilters', JSON.stringify(filters))
  }, [filters])

  // Save address input to session storage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('flightSearchAddress', addressInput)
  }, [addressInput])

  // Sort and group search results
  const processedResults = useMemo(() => {
    let results = [...searchResults]

    // Sort results
    switch (sortBy) {
      case 'date-desc':
        results.sort((a, b) => new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime())
        break
      case 'date-asc':
        results.sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime())
        break
      case 'registration':
        results.sort((a, b) => (a.registration || a.callsign || '').localeCompare(b.registration || b.callsign || ''))
        break
    }

    // Group by flight_id if requested
    if (groupByFlightId && results.length > 0) {
      const grouped = new Map<string, FlightResult[]>()

      results.forEach(flight => {
        const key = flight.flight_id || `single_${flight.id}`
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key)!.push(flight)
      })

      // For grouped flights, only show the most recent one from each group
      results = Array.from(grouped.values()).map(group => {
        if (group.length === 1) return group[0]

        // Sort group by date and return the most recent
        const sorted = group.sort((a, b) =>
          new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime()
        )

        // Add a count property to indicate how many flights are grouped
        return {
          ...sorted[0],
          grouped_count: group.length,
          grouped_flights: group
        }
      })

      // Re-apply the sort to the grouped results
      switch (sortBy) {
        case 'date-desc':
          results.sort((a, b) => new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime())
          break
        case 'date-asc':
          results.sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime())
          break
        case 'registration':
          results.sort((a, b) => (a.registration || a.callsign || '').localeCompare(b.registration || b.callsign || ''))
          break
      }
    }

    return results
  }, [searchResults, sortBy, groupByFlightId])

  return (
    <div className="h-full flex flex-col" data-id="flight-search-container">
      {/* Compact Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-3" data-id="search-filters-section">
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
              data-id="filter-start-time"
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
              data-id="filter-end-time"
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
              data-id="filter-aircraft"
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
                data-id="filter-location"
              />
            </Autocomplete>
          </div>

          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Radius (mi)
            </label>
            <input
              type="number"
              value={filters.search_radius}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              min="0.1"
              max="5"
              step="0.1"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              data-id="filter-radius"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            data-id="search-button"
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

      {/* Main Content - Side by Side - Use calc to get exact available height */}
      <div className="flex gap-3 h-[calc(100vh-12rem)] overflow-hidden" data-id="search-main-content">
        {/* Left Side - Results - Fixed height with internal scrolling */}
        <div className="w-2/5 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col h-full overflow-hidden" data-id="search-results-panel">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {loading ? 'Searching...' : `Results (${searchResults.length})`}
              </h2>
              <div className="flex items-center gap-2">
                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  disabled={loading || searchResults.length === 0}
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="registration">Registration</option>
                </select>

                {/* Group checkbox */}
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={groupByFlightId}
                    onChange={(e) => setGroupByFlightId(e.target.checked)}
                    disabled={loading || searchResults.length === 0}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <Users className="h-3 w-3" />
                  <span>Group</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" data-id="search-results-list">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Searching flights...
              </div>
            ) : processedResults.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {processedResults.map((flight) => (
                  <div
                    key={flight.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedFlight(flight)
                      fetchFlightDetails(flight)
                    }}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all ${
                      selectedFlight?.id === flight.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                    }`}
                    data-id={`search-result-item-${flight.id}`}
                  >
                    {/* Header with Registration and Type */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Plane className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-baseline gap-2">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {flight.registration || flight.callsign}
                              </h3>
                              {flight.grouped_count && flight.grouped_count > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  <Users className="h-3 w-3 mr-0.5" />
                                  {flight.grouped_count}
                                </span>
                              )}
                              {flight.id && (
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  #{flight.id}
                                </span>
                              )}
                            </div>
                            {flight.surveillance_score > 0.7 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                SURVEILLANCE LIKELY
                              </span>
                            ) : flight.surveillance_score > 0.4 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                POSSIBLE SURVEILLANCE
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                ROUTINE PATROL
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    </div>

                    {/* Key Information Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-base font-semibold">
                            {new Date(flight.departure_time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: new Date(flight.departure_time).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-5">
                          {new Date(flight.departure_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-base font-medium">
                            {flight.duration_minutes ? `${Math.round(flight.duration_minutes)} min` : 'In flight'}
                          </span>
                        </div>
                        {flight.arrival_time && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 ml-5">
                            Ended {new Date(flight.arrival_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Distance and Additional Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {flight.distance_from_search !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {(flight.distance_from_search * 0.000621371).toFixed(2)} mi from search
                            </span>
                          </div>
                        )}

                        {flight.positions_count && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {flight.positions_count.toLocaleString()} GPS points
                          </span>
                        )}

                        {flight.hover_locations && flight.hover_locations.length > 0 && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            {flight.hover_locations.length} hover location{flight.hover_locations.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Pass search context and closest position details to detail page
                          const params = new URLSearchParams()
                          if (filters.search_coordinates) {
                            params.set('searchLat', filters.search_coordinates.lat.toString())
                            params.set('searchLng', filters.search_coordinates.lng.toString())
                            params.set('searchRadius', (filters.search_radius * 1609.34).toString()) // Store in meters for consistency

                            // Add closest position details if available
                            if (flight.distance_from_search !== null) {
                              params.set('closestDistance', flight.distance_from_search.toString())
                            }
                            if (flight.closest_position) {
                              params.set('closestTime', flight.closest_position.timestamp)
                              if (flight.closest_position.ground_speed_knots !== null) {
                                params.set('closestSpeed', flight.closest_position.ground_speed_knots.toString())
                              }
                              if (flight.closest_position.altitude_feet !== null) {
                                params.set('closestAltitude', flight.closest_position.altitude_feet.toString())
                              }
                              if (flight.closest_position.altitude_agl_feet !== null) {
                                params.set('closestAltitudeAGL', flight.closest_position.altitude_agl_feet.toString())
                              }
                              if (flight.closest_position.track_degrees !== null) {
                                params.set('closestBearing', flight.closest_position.track_degrees.toString())
                              }
                              if (flight.closest_position.is_hovering) {
                                params.set('isHovering', 'true')
                                if (flight.closest_position.hover_duration_seconds) {
                                  params.set('hoverDuration', flight.closest_position.hover_duration_seconds.toString())
                                }
                              }
                            }
                          }
                          navigate(`/flight/${flight.id}?${params.toString()}`)
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                      >
                        Details
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Surveillance Score Bar (if significant) */}
                    {flight.surveillance_score > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Surveillance Probability
                          </span>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {Math.round((flight.surveillance_score || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              flight.surveillance_score > 0.7 ? 'bg-red-500' :
                              flight.surveillance_score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(flight.surveillance_score || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
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

        {/* Right Side - Map - Fixed height matching results panel */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-3 h-full overflow-hidden" data-id="search-map-panel">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={11}
            onClick={handleMapClick}
            onLoad={map => mapRef.current = map}
            data-id="search-map"
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
                  radius={filters.search_radius * 1609.34} // Convert to meters for map display
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