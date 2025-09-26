import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GoogleMap, Polyline, MarkerF, InfoWindow, Circle } from '@react-google-maps/api'
import {
  ArrowLeft,
  Plane,
  Clock,
  MapPin,
  AlertTriangle,
  Radio,
  Play,
  Pause,
  Download,
  Activity,
  Eye,
  Home,
  Building2,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import axios from '@/lib/axios'
import { formatLocalTime, formatRelativeTime } from '../utils/dateUtils'

interface FlightDetails {
  id: number
  aircraft_id: string
  flight_id: string
  callsign: string
  departure_time: string
  arrival_time: string
  flight_duration_minutes: number
  departure_airport: string
  arrival_airport: string
  max_altitude_feet: number
  min_altitude_feet: number
  avg_altitude_feet: number
  estimated_cost: number
  fuel_consumed_gallons: number
  hover_locations: any[]
  low_altitude_segments: any[]
  surveillance_types: string[]
  pattern_notes: string
  surveillance_likelihood: number
  privacy_concern_level: string
  legal_notes: string
}

interface FlightPosition {
  id: number
  timestamp: string
  latitude: number
  longitude: number
  altitude_feet: number
  ground_speed_knots: number
  track_degrees: number
  vertical_rate: number
  is_hovering: boolean
  hover_duration_seconds: number
  is_circling: boolean
  circle_radius_feet: number
  neighborhood: string
  address_nearby: string
  land_use_type: string
  over_private_property: boolean
  altitude_privacy_concern: boolean
}

interface RadioArchive {
  filename: string
  size_mb: number
  created_at: string
  has_transcription: boolean
  timeRange?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
}

export function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>()
  const navigate = useNavigate()

  const [flight, setFlight] = useState<FlightDetails | null>(null)
  const [positions, setPositions] = useState<FlightPosition[]>([])
  const [radioFiles, setRadioFiles] = useState<RadioArchive[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<FlightPosition | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (flightId) {
      loadFlightDetails()
    }
  }, [flightId])

  useEffect(() => {
    // Animation for flight playback
    if (isPlaying && positions.length > 0) {
      const animate = () => {
        setCurrentPositionIndex(prev => {
          if (prev >= positions.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, positions])

  const loadFlightDetails = async () => {
    try {
      setLoading(true)

      // Load flight details
      const flightResponse = await axios.get(`/api/v1/flights/${flightId}`)
      setFlight(flightResponse.data)

      // Load positions
      const positionsResponse = await axios.get(`/api/v1/flights/${flightId}/positions`)
      setPositions(positionsResponse.data)

      // Load radio archives for the time period
      if (flightResponse.data.departure_time && flightResponse.data.arrival_time) {
        const radioResponse = await axios.get('/api/v1/radio/archives', {
          params: {
            start_time: flightResponse.data.departure_time,
            end_time: flightResponse.data.arrival_time,
          }
        })
        setRadioFiles(radioResponse.data.archives || [])
      }
    } catch (error) {
      console.error('Failed to load flight details:', error)
    } finally {
      setLoading(false)
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

  const getFlightPath = () => {
    return positions.map(pos => ({
      lat: pos.latitude,
      lng: pos.longitude
    }))
  }

  const getMapBounds = () => {
    if (positions.length === 0) return null
    const bounds = new window.google.maps.LatLngBounds()
    positions.forEach(pos => {
      bounds.extend({ lat: pos.latitude, lng: pos.longitude })
    })
    return bounds
  }

  const getHoverLocations = () => {
    return positions.filter(pos => pos.is_hovering)
  }

  const getLowAltitudeSegments = () => {
    return positions.filter(pos => pos.altitude_feet < 500 && pos.over_private_property)
  }

  const downloadFlightData = () => {
    const data = {
      flight,
      positions,
      analysis: {
        hover_locations: getHoverLocations(),
        low_altitude_segments: getLowAltitudeSegments(),
        total_distance_km: calculateTotalDistance(),
        average_speed_knots: calculateAverageSpeed(),
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flight_${flightId}_data.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const calculateTotalDistance = () => {
    let distance = 0
    for (let i = 1; i < positions.length; i++) {
      const lat1 = positions[i - 1].latitude * Math.PI / 180
      const lat2 = positions[i].latitude * Math.PI / 180
      const dLat = lat2 - lat1
      const dLon = (positions[i].longitude - positions[i - 1].longitude) * Math.PI / 180

      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      distance += 6371 * c // Earth radius in km
    }
    return distance.toFixed(2)
  }

  const calculateAverageSpeed = () => {
    const speeds = positions.map(p => p.ground_speed_knots).filter(s => s > 0)
    if (speeds.length === 0) return 0
    return (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading flight details...</div>
      </div>
    )
  }

  if (!flight) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Flight not found</p>
        <button
          onClick={() => navigate('/search')}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Back to Search
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <button
            onClick={downloadFlightData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Download className="h-4 w-4" />
            Download Data
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Plane className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Flight {flight.flight_id || `#${flight.id}`}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {flight.aircraft_id} • {flight.callsign || 'No Callsign'}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {flight.flight_duration_minutes} min
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Distance</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {calculateTotalDistance()} km
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Speed</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {calculateAverageSpeed()} kts
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Est. Cost</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              ${flight.estimated_cost?.toLocaleString() || 'N/A'}
            </div>
          </div>
        </div>

        {/* Surveillance Alert */}
        {flight.surveillance_likelihood > 0.5 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <div className="font-medium text-red-900 dark:text-red-200">
                  High Surveillance Likelihood ({(flight.surveillance_likelihood * 100).toFixed(0)}%)
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {flight.pattern_notes}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Flight Path
          </h2>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'} Animation
          </button>
        </div>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={12}
          center={positions[0] ? { lat: positions[0].latitude, lng: positions[0].longitude } : { lat: 33.4484, lng: -112.0740 }}
          onLoad={(map) => {
            const bounds = getMapBounds()
            if (bounds) {
              map.fitBounds(bounds)
            }
          }}
        >
          {/* Flight path */}
          <Polyline
            path={getFlightPath()}
            options={{
              strokeColor: flight.surveillance_likelihood > 0.5 ? '#ff0000' : '#00ff00',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />

          {/* Start marker */}
          {positions[0] && (
            <MarkerF
              position={{ lat: positions[0].latitude, lng: positions[0].longitude }}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
              }}
              title="Departure"
            />
          )}

          {/* End marker */}
          {positions[positions.length - 1] && (
            <MarkerF
              position={{ lat: positions[positions.length - 1].latitude, lng: positions[positions.length - 1].longitude }}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
              }}
              title="Arrival"
            />
          )}

          {/* Current position during animation */}
          {isPlaying && positions[currentPositionIndex] && (
            <MarkerF
              position={{ lat: positions[currentPositionIndex].latitude, lng: positions[currentPositionIndex].longitude }}
              icon={{
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 6,
                rotation: positions[currentPositionIndex].track_degrees,
                fillColor: '#4299e1',
                fillOpacity: 0.8,
                strokeColor: '#2b6cb1',
                strokeWeight: 2,
              }}
            />
          )}

          {/* Hover locations */}
          {getHoverLocations().map((pos, idx) => (
            <Circle
              key={`hover-${idx}`}
              center={{ lat: pos.latitude, lng: pos.longitude }}
              radius={100}
              options={{
                fillColor: '#ff0000',
                fillOpacity: 0.3,
                strokeColor: '#ff0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
              onClick={() => setSelectedPosition(pos)}
            />
          ))}

          {/* Info window for selected position */}
          {selectedPosition && (
            <InfoWindow
              position={{ lat: selectedPosition.latitude, lng: selectedPosition.longitude }}
              onCloseClick={() => setSelectedPosition(null)}
            >
              <div className="p-2">
                <div className="font-medium">{formatLocalTime(selectedPosition.timestamp)}</div>
                <div className="text-sm">Altitude: {selectedPosition.altitude_feet} ft</div>
                <div className="text-sm">Speed: {selectedPosition.ground_speed_knots} kts</div>
                {selectedPosition.is_hovering && (
                  <div className="text-sm text-red-600">Hovering: {selectedPosition.hover_duration_seconds}s</div>
                )}
                {selectedPosition.neighborhood && (
                  <div className="text-sm">Area: {selectedPosition.neighborhood}</div>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Timeline and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flight Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Flight Timeline
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Departure</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatLocalTime(flight.departure_time)}
                </div>
                <div className="text-sm text-gray-500">
                  {flight.departure_airport || 'Unknown Airport'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Flight Time</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {flight.flight_duration_minutes} minutes
                </div>
                <div className="text-sm text-gray-500">
                  {positions.length} position reports
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Arrival</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatLocalTime(flight.arrival_time)}
                </div>
                <div className="text-sm text-gray-500">
                  {flight.arrival_airport || 'Unknown Airport'}
                </div>
              </div>
            </div>
          </div>

          {/* Altitude Profile */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Altitude Profile
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Maximum</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {flight.max_altitude_feet} ft
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Average</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {flight.avg_altitude_feet} ft
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Minimum</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {flight.min_altitude_feet} ft
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Surveillance Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Surveillance Analysis
          </h2>

          {/* Surveillance Types */}
          {flight.surveillance_types && flight.surveillance_types.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detected Patterns
              </div>
              <div className="flex flex-wrap gap-2">
                {flight.surveillance_types.map((type, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hover Locations */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Eye className="h-4 w-4" />
              Hover Locations
            </div>
            <div className="text-gray-900 dark:text-white">
              {getHoverLocations().length} locations
            </div>
            {getHoverLocations().length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total hover time: {getHoverLocations().reduce((sum, pos) => sum + pos.hover_duration_seconds, 0)} seconds
              </div>
            )}
          </div>

          {/* Low Altitude Segments */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Home className="h-4 w-4" />
              Low Altitude Over Residential
            </div>
            <div className="text-gray-900 dark:text-white">
              {getLowAltitudeSegments().length} segments
            </div>
            {getLowAltitudeSegments().length > 0 && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                Privacy concern: High
              </div>
            )}
          </div>

          {/* Legal Notes */}
          {flight.legal_notes && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                Legal Notes
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                {flight.legal_notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Radio Communications */}
      {radioFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Radio Communications During Flight
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {radioFiles.map((file) => (
              <div
                key={file.filename}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
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
                    onClick={() => navigate(`/radio?file=${file.filename}&time=${flight.departure_time}`)}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}