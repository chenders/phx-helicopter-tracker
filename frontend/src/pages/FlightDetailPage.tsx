import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
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
  TrendingDown,
  Mountain,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import axios from '@/lib/axios'
import { formatLocalTime, formatRelativeTime } from '../utils/dateUtils'
import FlightVisualization3DCesium, { HudData, getCardinalDirection, formatTime } from '../components/FlightVisualization3DCesiumFixed'

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
  max_altitude_feet: number | null
  min_altitude_feet: number | null
  avg_altitude_feet: number | null
  max_altitude_agl_feet: number | null
  min_altitude_agl_feet: number | null
  avg_altitude_agl_feet: number | null
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
  altitude_agl_feet?: number
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

interface RadioSegment {
  segment_id: number
  timestamp: string
  start_time: number
  end_time: number
  text: string
  urgency_score: number | null
  tail_numbers: string[] | null
  locations: string[] | null
  incident_codes: string[] | null
  audio_file: {
    filename: string
    recording_start: string
    duration_seconds: number
    audio_url: string
    segment_start: number
    segment_end: number
  }
}

interface HoverLocation {
  latitude: number
  longitude: number
  duration_minutes: number
  start_time: string
  end_time: string
  position_count: number
}

interface FlightPatterns {
  surveillance_types: string[]
  hover_locations: HoverLocation[]
  total_hover_time_minutes: number
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

// Dark mode map styles for better visibility
// Helicopter icon function - same as used in LiveTrackingPage
const getHelicopterIcon = (heading: number = 0, isPlaying: boolean = false) => {
  // Create a detailed helicopter shape using SVG path
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
      fillColor: isPlaying ? '#10b981' : '#6b7280', // Green when playing, gray when stopped
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      rotation: heading || 0, // Rotate based on heading
      anchor: new window.google.maps.Point(0, 0),
    }
  }

  return null
}

// Mobile device detection utility
const isMobileDevice = (): boolean => {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return isTouchDevice && isSmallScreen;
};

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

export function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get search context from URL parameters
  const searchContext = {
    lat: searchParams.get('searchLat') ? parseFloat(searchParams.get('searchLat')!) : null,
    lng: searchParams.get('searchLng') ? parseFloat(searchParams.get('searchLng')!) : null,
    radius: searchParams.get('searchRadius') ? parseFloat(searchParams.get('searchRadius')!) : null,
    closestDistance: searchParams.get('closestDistance') ? parseFloat(searchParams.get('closestDistance')!) : null,
    closestTime: searchParams.get('closestTime') || null,
    closestSpeed: searchParams.get('closestSpeed') ? parseFloat(searchParams.get('closestSpeed')!) : null,
    closestAltitude: searchParams.get('closestAltitude') ? parseFloat(searchParams.get('closestAltitude')!) : null,
    closestAltitudeAGL: searchParams.get('closestAltitudeAGL') ? parseFloat(searchParams.get('closestAltitudeAGL')!) : null,
    closestBearing: searchParams.get('closestBearing') ? parseFloat(searchParams.get('closestBearing')!) : null,
    isHovering: searchParams.get('isHovering') === 'true',
    hoverDuration: searchParams.get('hoverDuration') ? parseInt(searchParams.get('hoverDuration')!) : null,
  }

  const [flight, setFlight] = useState<FlightDetails | null>(null)
  const [positions, setPositions] = useState<FlightPosition[]>([])
  const [radioFiles, setRadioFiles] = useState<RadioArchive[]>([])
  const [radioSegments, setRadioSegments] = useState<RadioSegment[]>([])
  const [currentRadioSegment, setCurrentRadioSegment] = useState<RadioSegment | null>(null)
  const [patterns, setPatterns] = useState<FlightPatterns | null>(null)
  const [calculatedClosest, setCalculatedClosest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<FlightPosition | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [use3DView, setUse3DView] = useState(!isMobileDevice()) // Default to 2D on mobile, 3D on desktop
  const [playbackSpeed, setPlaybackSpeed] = useState(0.5) // Start at 0.5x speed
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false) // Collapsed by default
  const [is3DAnimating, setIs3DAnimating] = useState(false) // Track 3D animation state
  const [hudData, setHudData] = useState<HudData | null>(null) // HUD data from 3D visualization
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const accumulatedTimeRef = useRef<number>(0)
  const startAnimationRef = useRef<(() => void) | null>(null)
  const stopAnimationRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false;

    if (flightId) {
      const fetchData = async () => {
        if (!cancelled) {
          await loadFlightDetails();
        }
      };
      fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [flightId])

  // Calculate closest position if we have search context but no closest data
  useEffect(() => {
    if (searchContext.lat && searchContext.lng && positions.length > 0 && !searchContext.closestDistance) {
      const closest = findClosestPosition()
      if (closest) {
        setCalculatedClosest(closest)
      }
    }
  }, [positions, searchContext.lat, searchContext.lng])

  useEffect(() => {
    // Animation for flight playback with proper time-based interpolation
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

          // Calculate how much real time should pass between positions
          // Assuming positions are recorded at regular intervals
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

          // Pan map to keep aircraft in view
          if (mapRef.current && positions[targetIndex] && targetIndex !== prev) {
            const currentPos = {
              lat: positions[targetIndex].latitude,
              lng: positions[targetIndex].longitude
            }
            mapRef.current.panTo(currentPos)
          }

          return targetIndex
        })

        if (isPlaying) {
          animationRef.current = requestAnimationFrame(animate)
        }
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
  }, [isPlaying, positions, playbackSpeed])

  // Keep current position in view during playback (2D mode)
  useEffect(() => {
    if (!use3DView && isPlaying && mapRef.current && positions[currentPositionIndex]) {
      const currentPos = positions[currentPositionIndex]

      // Check if the current position is within the map bounds
      const bounds = mapRef.current.getBounds()
      if (bounds) {
        const posLatLng = new google.maps.LatLng(currentPos.latitude, currentPos.longitude)

        // If position is outside bounds, pan to it
        if (!bounds.contains(posLatLng)) {
          mapRef.current.panTo({
            lat: currentPos.latitude,
            lng: currentPos.longitude
          })
        }
      }
    }
  }, [currentPositionIndex, isPlaying, use3DView, positions])

  // Track current radio segment based on flight timestamp
  useEffect(() => {
    if (positions[currentPositionIndex] && radioSegments.length > 0) {
      const currentFlightTime = new Date(positions[currentPositionIndex].timestamp).getTime()

      // Find the radio segment that matches this timestamp
      const matchingSegment = radioSegments.find(segment => {
        const segmentTime = new Date(segment.timestamp).getTime()
        // Match if flight time is within 30 seconds of segment time
        return Math.abs(currentFlightTime - segmentTime) < 30000
      })

      if (matchingSegment && matchingSegment.segment_id !== currentRadioSegment?.segment_id) {
        setCurrentRadioSegment(matchingSegment)
        console.log('Radio segment active:', matchingSegment.text.substring(0, 50))
      }
    }
  }, [currentPositionIndex, positions, radioSegments])

  const loadFlightDetails = async () => {
    try {
      setLoading(true)

      // Load flight details
      const flightResponse = await axios.get(`/api/v1/flights/logs/${flightId}`)
      setFlight(flightResponse.data)

      // Load positions
      const positionsResponse = await axios.get(`/api/v1/flights/${flightId}/positions`)
      setPositions(positionsResponse.data)

      // Load abnormal patterns
      const patternsResponse = await axios.get(`/api/v1/flights/${flightId}/patterns`)
      setPatterns(patternsResponse.data)

      // Load radio segments for the flight time period
      if (flightResponse.data.departure_time && flightResponse.data.arrival_time) {
        try {
          const radioResponse = await axios.get('/api/v1/radio-analysis/segments/during-flight', {
            params: {
              start_time: flightResponse.data.departure_time,
              end_time: flightResponse.data.arrival_time,
            }
          })
          setRadioSegments(radioResponse.data.segments || [])
          console.log(`Loaded ${radioResponse.data.segments?.length || 0} radio segments for flight`)
        } catch (error) {
          console.error('Failed to load radio segments:', error)
          setRadioSegments([])
        }
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

  const getCompassDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    const index = Math.round(degrees / 22.5) % 16
    return directions[index]
  }

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Find closest position to search location
  const findClosestPosition = () => {
    if (!searchContext.lat || !searchContext.lng || positions.length === 0) {
      return null
    }

    let closestPos = null
    let minDistance = Infinity

    positions.forEach(pos => {
      if (pos.latitude && pos.longitude) {
        const distance = calculateDistance(
          searchContext.lat!,
          searchContext.lng!,
          pos.latitude,
          pos.longitude
        )
        if (distance < minDistance) {
          minDistance = distance
          closestPos = {
            ...pos,
            distance: distance
          }
        }
      }
    })

    return closestPos
  }

  // Calculate closest position when positions load but URL params missing
  useEffect(() => {
    if (searchContext.lat && searchContext.lng && positions.length > 0 && !searchContext.closestDistance) {
      const closest = findClosestPosition()
      if (closest) {
        setCalculatedClosest(closest)
      }
    }
  }, [positions, searchContext.lat, searchContext.lng, searchContext.closestDistance])

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

  const exportToKML = () => {
    if (!flight || positions.length === 0) return

    // Generate KML content
    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>Flight ${flight.callsign || flight.aircraft_id} - ${formatLocalTime(flight.departure_time)}</name>
    <description>
      Aircraft: ${flight.aircraft_id}
      Callsign: ${flight.callsign || 'N/A'}
      Duration: ${flight.flight_duration_minutes} minutes
      Date: ${formatLocalTime(flight.departure_time)}
      Surveillance Likelihood: ${flight.surveillance_likelihood}%
      Pattern Notes: ${flight.pattern_notes || 'None'}
    </description>

    <!-- Define styles -->
    <Style id="flightPath">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>

    <Style id="startPoint">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="endPoint">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <Style id="hoverPoint">
      <IconStyle>
        <color>ff00ffff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
        </Icon>
      </IconStyle>
    </Style>

    <!-- Flight path as LineString with altitude -->
    <Placemark>
      <name>Flight Path</name>
      <styleUrl>#flightPath</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
${positions.map(p => `          ${p.longitude},${p.latitude},${p.altitude_feet * 0.3048}`).join('\n')}
        </coordinates>
      </LineString>
    </Placemark>

    <!-- Start point -->
    <Placemark>
      <name>Start</name>
      <description>
        Time: ${formatLocalTime(positions[0].timestamp)}
        Altitude: ${positions[0].altitude_feet} ft
        Location: ${positions[0].neighborhood || positions[0].address_nearby || 'Unknown'}
      </description>
      <styleUrl>#startPoint</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${positions[0].longitude},${positions[0].latitude},${positions[0].altitude_feet * 0.3048}</coordinates>
      </Point>
    </Placemark>

    <!-- End point -->
    <Placemark>
      <name>End</name>
      <description>
        Time: ${formatLocalTime(positions[positions.length - 1].timestamp)}
        Altitude: ${positions[positions.length - 1].altitude_feet} ft
        Location: ${positions[positions.length - 1].neighborhood || positions[positions.length - 1].address_nearby || 'Unknown'}
      </description>
      <styleUrl>#endPoint</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${positions[positions.length - 1].longitude},${positions[positions.length - 1].latitude},${positions[positions.length - 1].altitude_feet * 0.3048}</coordinates>
      </Point>
    </Placemark>

    <!-- Hover locations -->
    ${getHoverLocations().map((pos, idx) => `
    <Placemark>
      <name>Hover Location ${idx + 1}</name>
      <description>
        Time: ${formatLocalTime(pos.timestamp)}
        Duration: ${pos.hover_duration_seconds} seconds
        Altitude: ${pos.altitude_feet} ft
        Location: ${pos.neighborhood || pos.address_nearby || 'Unknown'}
        ${pos.over_private_property ? 'Over private property' : ''}
      </description>
      <styleUrl>#hoverPoint</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${pos.longitude},${pos.latitude},${pos.altitude_feet * 0.3048}</coordinates>
      </Point>
    </Placemark>`).join('')}

    <!-- Add a tour for Google Earth Pro -->
    <gx:Tour>
      <name>Flight Playback</name>
      <gx:Playlist>
        ${positions.map((p, idx) => {
          const duration = idx > 0
            ? (new Date(p.timestamp).getTime() - new Date(positions[idx - 1].timestamp).getTime()) / 1000
            : 2
          return `
        <gx:FlyTo>
          <gx:duration>${Math.min(duration, 10)}</gx:duration>
          <Camera>
            <longitude>${p.longitude}</longitude>
            <latitude>${p.latitude}</latitude>
            <altitude>${p.altitude_feet * 0.3048 + 100}</altitude>
            <heading>${p.track_degrees}</heading>
            <tilt>75</tilt>
            <roll>0</roll>
            <altitudeMode>absolute</altitudeMode>
          </Camera>
        </gx:FlyTo>`
        }).join('')}
      </gx:Playlist>
    </gx:Tour>
  </Document>
</kml>`

    // Create and download the KML file
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flight_${flight.callsign || flight.aircraft_id}_${flightId}.kml`
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
    // Convert km to miles
    return (distance * 0.621371).toFixed(2)
  }

  const calculateAverageSpeed = () => {
    const speeds = positions.map(p => p.ground_speed_knots).filter(s => s > 0)
    if (speeds.length === 0) return '0'
    return (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(2)
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
          <div className="flex items-center gap-3 flex-wrap">
            {/* Radio Segments Indicator */}
            {radioSegments.length > 0 && (
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/30 px-3 py-2 rounded-lg">
                <Radio className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  {radioSegments.length} Radio Transmissions
                </span>
              </div>
            )}

            <button
              onClick={() => {
                if (is3DAnimating) {
                  // Pause animation
                  if (stopAnimationRef.current) {
                    stopAnimationRef.current();
                  }
                } else {
                  // Scroll to map section - align top of map with top of viewport
                  const mapSection = document.querySelector('[data-map-section]');
                  if (mapSection) {
                    mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  // Start animation after a brief delay to allow scroll
                  setTimeout(() => {
                    if (startAnimationRef.current) {
                      console.log('Calling start animation via ref');
                      startAnimationRef.current();
                    } else {
                      console.warn('Start animation function not available yet');
                    }
                  }, 800);
                }
              }}
              className="relative flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl font-bold transition-all"
              title={is3DAnimating ? "Pause animation" : "Start 3D flight animation"}
            >
              {!is3DAnimating && (
                <span className="absolute inset-0 rounded-lg animate-pulse border-2 border-emerald-400"></span>
              )}
              {is3DAnimating ? (
                <Pause className="h-4 w-4 relative z-10" />
              ) : (
                <Play className="h-4 w-4 relative z-10" />
              )}
              <span className="relative z-10">{is3DAnimating ? 'Pause' : 'Start Animation'}</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 shadow">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Speed:
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="flex items-center justify-between w-full mb-4 group"
        >
          <div className="flex items-center gap-4">
            <Plane className="h-8 w-8 text-purple-600" />
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Flight {flight.flight_id || `#${flight.id}`}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {flight.aircraft_id} • {flight.callsign || 'No Callsign'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(flight.departure_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} • Start: {new Date(flight.departure_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
          {isDetailsExpanded ? (
            <ChevronUp className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          ) : (
            <ChevronDown className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          )}
        </button>


        {/* Collapsible Content */}
        {isDetailsExpanded && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {typeof flight.flight_duration_minutes === 'number'
                ? flight.flight_duration_minutes.toFixed(2)
                : flight.flight_duration_minutes} min
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Distance</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {calculateTotalDistance()} mi
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Speed</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {(parseFloat(calculateAverageSpeed()) * 1.15078).toFixed(2)} mph
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                ({calculateAverageSpeed()} kts)
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Est. Cost</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              ${flight.estimated_cost?.toLocaleString() || 'N/A'}
            </div>
          </div>
        </div>

        {/* Closest Approach Details (when coming from search) */}
        {searchContext.lat && searchContext.lng && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Closest Approach to Search Location
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300">Distance:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {searchContext.closestDistance ? (
                    searchContext.closestDistance * 0.000621371 < 0.5 ?
                      `${Math.round(searchContext.closestDistance * 3.28084)} ft` :
                      `${(searchContext.closestDistance * 0.000621371).toFixed(2)} mi`
                  ) : calculatedClosest ? (
                    calculatedClosest.distance * 0.000621371 < 0.5 ?
                      `${Math.round(calculatedClosest.distance * 3.28084)} ft` :
                      `${(calculatedClosest.distance * 0.000621371).toFixed(2)} mi`
                  ) : 'Calculating...'}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Speed:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {searchContext.closestSpeed ?
                    `${Math.round(searchContext.closestSpeed * 1.15078)} mph (${Math.round(searchContext.closestSpeed)} kts)` :
                    calculatedClosest?.ground_speed_knots ?
                      `${Math.round(calculatedClosest.ground_speed_knots * 1.15078)} mph (${Math.round(calculatedClosest.ground_speed_knots)} kts)` :
                      'N/A'}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Altitude:</span>
                <div>
                  {(searchContext.closestAltitudeAGL || calculatedClosest?.altitude_agl_feet) ? (
                    <>
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        {(searchContext.closestAltitudeAGL || calculatedClosest.altitude_agl_feet).toLocaleString()} ft AGL
                        <span className="text-xs font-normal text-blue-700 dark:text-blue-300 ml-1">
                          (Above Ground Level)
                        </span>
                      </div>
                      {(searchContext.closestAltitude || calculatedClosest?.altitude_feet) && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          {(searchContext.closestAltitude || calculatedClosest.altitude_feet).toLocaleString()} ft MSL
                          <span className="text-xs text-blue-500 dark:text-blue-300 ml-1">
                            (Mean Sea Level)
                          </span>
                        </div>
                      )}
                    </>
                  ) : (searchContext.closestAltitude || calculatedClosest?.altitude_feet) ? (
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {(searchContext.closestAltitude || calculatedClosest.altitude_feet).toLocaleString()} ft MSL
                      <span className="text-xs font-normal text-blue-700 dark:text-blue-300 ml-1">
                        (Mean Sea Level)
                      </span>
                    </div>
                  ) : (
                    <div className="font-medium text-blue-900 dark:text-blue-100">N/A</div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Heading:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {searchContext.closestBearing ?
                    `${Math.round(searchContext.closestBearing)}°` :
                    calculatedClosest?.track_degrees ?
                      `${Math.round(calculatedClosest.track_degrees)}°` :
                      'N/A'}
                  {(searchContext.closestBearing || calculatedClosest?.track_degrees) && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {getCompassDirection(searchContext.closestBearing || calculatedClosest.track_degrees)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {searchContext.closestTime && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                Time: {formatLocalTime(searchContext.closestTime)}
                {searchContext.isHovering && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded">
                    Hovering for {searchContext.hoverDuration}s
                  </span>
                )}
              </div>
            )}

            {/* Total Time in Search Radius */}
            {searchContext.radius && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    ⏱ Total Time in Search Radius:
                  </span>
                  <span className="text-base font-bold font-mono text-red-700 dark:text-red-400">
                    {(() => {
                      // Calculate total time in radius from positions using actual timestamps
                      if (!positions || positions.length === 0) return '0:00';
                      let timeInRadius = 0;
                      const searchRadiusMiles = searchContext.radius / 1609.34;
                      const R = 3959; // Earth's radius in miles

                      let prevTimestamp: Date | null = null;

                      positions.forEach((pos: any) => {
                        const lat1 = searchContext.lat * Math.PI / 180;
                        const lat2 = pos.latitude * Math.PI / 180;
                        const dLat = (pos.latitude - searchContext.lat) * Math.PI / 180;
                        const dLng = (pos.longitude - searchContext.lng) * Math.PI / 180;

                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                 Math.cos(lat1) * Math.cos(lat2) *
                                 Math.sin(dLng / 2) * Math.sin(dLng / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = R * c;

                        if (distance <= searchRadiusMiles) {
                          if (prevTimestamp) {
                            const currentTimestamp = new Date(pos.timestamp);
                            const timeDiff = (currentTimestamp.getTime() - prevTimestamp.getTime()) / 1000; // Convert to seconds
                            timeInRadius += timeDiff;
                          }
                          prevTimestamp = new Date(pos.timestamp);
                        } else {
                          prevTimestamp = null; // Reset when out of radius
                        }
                      });

                      const mins = Math.floor(timeInRadius / 60);
                      const secs = Math.floor(timeInRadius % 60);
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    })()}
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Total surveillance time within {(searchContext.radius / 1609.34).toFixed(2)} mile radius
                </div>
              </div>
            )}
          </div>
        )}

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
          </>
        )}
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4" data-map-section>
        {/* Mobile 3D Warning */}
        {isMobileDevice() && use3DView && (
          <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Mobile Performance Warning:</strong> 3D view is resource-intensive and may cause slowness or crashes on mobile devices.
                Consider switching to 2D view for better performance.
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Flight Path
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUse3DView(!use3DView)}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                use3DView
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Mountain className="h-4 w-4" />
              {use3DView ? '3D View' : 'Standard View'}
            </button>
            {!use3DView && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!isPlaying && positions.length > 0) {
                      // Only reset accumulated time, keep current position
                      accumulatedTimeRef.current = 0
                      // If we're at the end, restart from beginning
                      if (currentPositionIndex >= positions.length - 1) {
                        setCurrentPositionIndex(0)
                        // Pan to the starting position without changing zoom
                        if (mapRef.current && positions[0]) {
                          mapRef.current.panTo({
                            lat: positions[0].latitude,
                            lng: positions[0].longitude
                          })
                        }
                      }
                    }
                    setIsPlaying(!isPlaying)
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                  <option value={20}>20x</option>
                  <option value={50}>50x</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Radio Communication Display - Show when radio segment is active */}
        {currentRadioSegment && (isPlaying || is3DAnimating) && (
          <div className="mb-4 bg-black/90 backdrop-blur border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Radio className="h-6 w-6 text-green-400 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-green-300 bg-green-900/30 px-2 py-1 rounded">
                    RADIO TRANSMISSION
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(currentRadioSegment.timestamp).toLocaleTimeString()}
                  </span>
                  {currentRadioSegment.urgency_score && currentRadioSegment.urgency_score > 0.5 && (
                    <span className="text-xs font-semibold text-red-400 bg-red-900/30 px-2 py-1 rounded animate-pulse">
                      HIGH URGENCY
                    </span>
                  )}
                </div>
                <div className="text-green-100 font-mono text-sm leading-relaxed">
                  {currentRadioSegment.text}
                </div>
                {(currentRadioSegment.tail_numbers || currentRadioSegment.locations || currentRadioSegment.incident_codes) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentRadioSegment.tail_numbers?.map((tail, idx) => (
                      <span key={`tail-${idx}`} className="text-xs px-2 py-1 bg-yellow-900/40 text-yellow-200 rounded border border-yellow-500/30">
                        ✈️ {tail}
                      </span>
                    ))}
                    {currentRadioSegment.locations?.map((loc, idx) => (
                      <span key={`loc-${idx}`} className="text-xs px-2 py-1 bg-blue-900/40 text-blue-200 rounded border border-blue-500/30">
                        📍 {loc}
                      </span>
                    ))}
                    {currentRadioSegment.incident_codes?.map((code, idx) => (
                      <span key={`code-${idx}`} className="text-xs px-2 py-1 bg-red-900/40 text-red-200 rounded border border-red-500/30">
                        🚨 {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HUD Display - Only show when 3D view is active and animating */}
        {use3DView && hudData && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Speed */}
            <div className="bg-black/70 backdrop-blur text-green-400 px-4 py-2 rounded-lg font-mono text-sm border border-green-500/30">
              <div className="text-xs text-green-300/70 mb-1">GROUND SPEED</div>
              <div className="text-2xl font-bold">
                {Math.round(hudData.speed * 1.15078)} <span className="text-base">mph</span>
                <span className="text-sm text-green-300/70 block">({Math.round(hudData.speed)}kts)</span>
              </div>
            </div>

            {/* Altitude AGL */}
            <div className="bg-black/70 backdrop-blur text-yellow-400 px-4 py-2 rounded-lg font-mono text-sm border border-yellow-500/30">
              <div className="text-xs text-yellow-300/70 mb-1">ALTITUDE AGL</div>
              <div className="text-2xl font-bold">
                {hudData.altitudeAGL > 0 ? Math.round(hudData.altitudeAGL) : Math.round(hudData.altitude)} <span className="text-base">ft</span>
              </div>
            </div>

            {/* Heading */}
            <div className="bg-black/70 backdrop-blur text-purple-400 px-4 py-2 rounded-lg font-mono text-sm border border-purple-500/30">
              <div className="text-xs text-purple-300/70 mb-1">HEADING</div>
              <div className="text-2xl font-bold">
                {Math.round((hudData.heading + 360) % 360)}° <span className="text-base">{getCardinalDirection(hudData.heading)}</span>
              </div>
            </div>

            {/* Distance from Search Location */}
            {searchContext.lat && searchContext.lng && hudData.distanceFromSearch >= 0 && (
              <div className={`bg-black/70 backdrop-blur px-4 py-2 rounded-lg font-mono text-sm border ${
                hudData.distanceFromSearch <= ((searchContext.radius || 1000) / 1609.34)
                  ? 'text-red-400 border-red-500/50 animate-pulse'
                  : 'text-orange-400 border-orange-500/30'
              }`}>
                <div className={`text-xs mb-1 flex items-center gap-2 ${
                  hudData.distanceFromSearch <= ((searchContext.radius || 1000) / 1609.34)
                    ? 'text-red-300/70'
                    : 'text-orange-300/70'
                }`}>
                  {hudData.distanceFromSearch <= ((searchContext.radius || 1000) / 1609.34) && (
                    <span className="text-red-500 text-lg">⚠</span>
                  )}
                  DISTANCE FROM SEARCH
                </div>
                <div className="text-2xl font-bold">
                  {hudData.distanceFromSearch < 0.1 ?
                    <>{Math.round(hudData.distanceFromSearch * 5280)} <span className="text-base">ft</span></> :
                    <>{hudData.distanceFromSearch.toFixed(2)} <span className="text-base">mi</span></>
                  }
                  {hudData.distanceFromSearch <= ((searchContext.radius || 1000) / 1609.34) && (
                    <div className="text-sm mt-1 text-red-300">WITHIN SEARCH RADIUS</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {use3DView ? (
          <FlightVisualization3DCesium
            positions={positions}
            currentPositionIndex={currentPositionIndex}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onStartAnimationRef={startAnimationRef}
            onStopAnimationRef={stopAnimationRef}
            onAnimationStateChange={setIs3DAnimating}
            onHudDataChange={setHudData}
            searchContext={searchContext.lat && searchContext.lng ? {
              lat: searchContext.lat,
              lng: searchContext.lng,
              radius: searchContext.radius || 1000
            } : undefined}
            hoverLocations={patterns?.hover_locations || []}
          />
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={12}
          center={positions[0] ? { lat: positions[0].latitude, lng: positions[0].longitude } : { lat: 33.4484, lng: -112.0740 }}
          onLoad={(map) => {
            mapRef.current = map

            // Add native polyline for flight path
            if (positions.length > 0) {
              console.log('2D View: Creating flight path with', positions.length, 'positions');
              const pathCoordinates = positions.map(p => ({
                lat: p.latitude,
                lng: p.longitude
              }))

              // Create the polyline
              const flightPath = new google.maps.Polyline({
                path: pathCoordinates,
                geodesic: true,
                strokeColor: '#EF4444',
                strokeOpacity: 1.0,
                strokeWeight: 4,
                map: map
              })

              console.log('2D View: Flight path created');

              // Store reference for cleanup
              ;(window as any).flightPath2D = flightPath
            }

            const bounds = getMapBounds()
            if (bounds && !isPlaying) {
              map.fitBounds(bounds)
            }
          }}
          options={{
            styles: darkMapStyles,
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {/* Flight path */}
          <Polyline
            path={getFlightPath()}
            options={{
              strokeColor: '#EF4444', // Red like in search page
              strokeOpacity: 1.0,
              strokeWeight: 4,
              geodesic: true,
              zIndex: 100
            }}
          />

          {/* Start marker */}
          {positions[0] && (
            <MarkerF
              position={{ lat: positions[0].latitude, lng: positions[0].longitude }}
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
              position={{ lat: positions[positions.length - 1].latitude, lng: positions[positions.length - 1].longitude }}
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

          {/* Current position during animation - using helicopter icon */}
          {isPlaying && positions[currentPositionIndex] && (
            <MarkerF
              position={{ lat: positions[currentPositionIndex].latitude, lng: positions[currentPositionIndex].longitude }}
              icon={getHelicopterIcon(positions[currentPositionIndex].track_degrees, true)}
              title="Current Position"
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
                <div className="text-sm">
                  Speed: {(selectedPosition.ground_speed_knots * 1.15078).toFixed(2)} mph
                  <span className="text-gray-500 ml-1">({selectedPosition.ground_speed_knots.toFixed(2)} kts)</span>
                </div>
                {selectedPosition.is_hovering && (
                  <div className="text-sm text-red-600">Hovering: {selectedPosition.hover_duration_seconds}s</div>
                )}
                {selectedPosition.neighborhood && (
                  <div className="text-sm">Area: {selectedPosition.neighborhood}</div>
                )}
              </div>
            </InfoWindow>
          )}

          {/* Search context visualization - if came from search page */}
          {searchContext.lat && searchContext.lng && searchContext.radius && (
            <>
              {/* Search radius circle */}
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

              {/* Blue search point marker */}
              <MarkerF
                position={{ lat: searchContext.lat, lng: searchContext.lng }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
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
        </GoogleMap>
        )}
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
            <div className="space-y-3">
              {/* MSL Altitudes if available */}
              {(flight.max_altitude_feet !== null || flight.avg_altitude_feet !== null || flight.min_altitude_feet !== null) && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">MSL (Mean Sea Level)</div>
                  <div className="space-y-1 pl-2">
                    {flight.max_altitude_feet !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Maximum</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {flight.max_altitude_feet.toLocaleString()} ft
                        </span>
                      </div>
                    )}
                    {flight.avg_altitude_feet !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Average</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Math.round(flight.avg_altitude_feet).toLocaleString()} ft
                        </span>
                      </div>
                    )}
                    {flight.min_altitude_feet !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Minimum</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {flight.min_altitude_feet.toLocaleString()} ft
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AGL Altitudes if available */}
              {(flight.max_altitude_agl_feet !== null || flight.avg_altitude_agl_feet !== null || flight.min_altitude_agl_feet !== null) && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">AGL (Above Ground Level)</div>
                  <div className="space-y-1 pl-2">
                    {flight.max_altitude_agl_feet !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Maximum</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {flight.max_altitude_agl_feet.toLocaleString()} ft
                        </span>
                      </div>
                    )}
                    {flight.avg_altitude_agl_feet !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Average</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Math.round(flight.avg_altitude_agl_feet).toLocaleString()} ft
                        </span>
                      </div>
                    )}
                    {flight.min_altitude_agl_feet !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Minimum</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {flight.min_altitude_agl_feet.toLocaleString()} ft
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Download Data Button */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={downloadFlightData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Flight Data
            </button>
          </div>
        </div>

        {/* Surveillance Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Surveillance Analysis
          </h2>

          {/* Surveillance Types - from pattern detection */}
          {patterns && patterns.surveillance_types && patterns.surveillance_types.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detected Patterns
              </div>
              <div className="flex flex-wrap gap-2">
                {patterns.surveillance_types.map((type, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm"
                  >
                    {type.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hover Locations - from pattern detection */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Eye className="h-4 w-4" />
              Hover Locations (Pattern Detection)
            </div>
            <div className="text-gray-900 dark:text-white">
              {patterns?.hover_locations.length || 0} locations
            </div>
            {patterns && patterns.hover_locations.length > 0 && (
              <>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total hover time: {patterns.total_hover_time_minutes.toFixed(1)} minutes
                </div>
                <div className="mt-2 space-y-2">
                  {patterns.hover_locations.map((hover, idx) => (
                    <div key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      <div className="font-medium">Location {idx + 1}</div>
                      <div>Coordinates: {hover.latitude.toFixed(4)}, {hover.longitude.toFixed(4)}</div>
                      <div>Duration: {hover.duration_minutes.toFixed(1)} minutes ({hover.position_count} positions)</div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {new Date(hover.start_time).toLocaleTimeString()} - {new Date(hover.end_time).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Low Altitude Segments - from position flags */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Home className="h-4 w-4" />
              Low Altitude Over Residential (Position Flags)
            </div>
            <div className="text-gray-900 dark:text-white">
              {getLowAltitudeSegments().length} segments
            </div>
            {getLowAltitudeSegments().length > 0 ? (
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                Privacy concern: High
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Note: Position-level flags may not be populated. See hover locations above for actual pattern detection.
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