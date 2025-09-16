import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, MarkerF, InfoWindow, Polyline } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from '../lib/axios';

interface AbnormalPattern {
  id: number;
  flight_id: string;
  aircraft_registration: string;
  pattern_type: string;
  confidence_score: number;
  detected_at: string;
  reviewed: string;
  flight_date: string;
  duration_minutes: number;
  metadata: {
    complexity_metrics?: {
      complexity: number;
      efficiency: number;
      sharp_turns: number;
      reversals: number;
    };
    hovering_events?: Array<{
      latitude: number;
      longitude: number;
      duration_minutes: number;
    }>;
    circling_metrics?: {
      circles_detected: number;
      center_lat: number;
      center_lon: number;
    };
    reasons?: string[];
  };
}

interface PatternDetail {
  id: number;
  flight_id: string;
  aircraft_registration: string;
  pattern_type: string;
  confidence_score: number;
  positions: Array<{
    lat: number;
    lng: number;
    alt?: number;
    spd?: number;
    ts?: number;
  }>;
  metadata: any;
}

const PATTERN_COLORS: Record<string, string> = {
  sky_writing: '#FF0000',        // Red for sky-writing (like ALEX)
  excessive_hovering: '#FFA500',  // Orange for hovering
  repetitive_circling: '#FFFF00', // Yellow for circling
  abnormal_path: '#FF1493',       // Pink for other abnormal paths
  default: '#0000FF'              // Blue for default
};

const PHOENIX_CENTER = { lat: 33.4484, lng: -112.0740 };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Dark mode map styles - matching LiveTrackingPage
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
];

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
  gestureHandling: 'greedy' as const,
  styles: darkMapStyles,
};

export const AbnormalPatternsPage: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState(PHOENIX_CENTER);
  const [mapZoom, setMapZoom] = useState(10);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterReviewed, setFilterReviewed] = useState<string>('all');
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fetch list of abnormal patterns
  const { data: patterns, isLoading: patternsLoading } = useQuery<AbnormalPattern[]>({
    queryKey: ['abnormalPatterns', filterType, filterReviewed],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('pattern_type', filterType);
      if (filterReviewed !== 'all') params.append('reviewed', filterReviewed);
      params.append('days_back', '30');
      
      const response = await axios.get(`/api/v1/abnormal-patterns?${params}`);
      return response.data;
    },
  });

  // Fetch detailed pattern data when one is selected
  const { data: patternDetail, isLoading: detailLoading } = useQuery<PatternDetail>({
    queryKey: ['patternDetail', selectedPattern],
    queryFn: async () => {
      if (!selectedPattern) return null;
      const response = await axios.get(`/api/v1/abnormal-patterns/${selectedPattern}`);
      return response.data;
    },
    enabled: !!selectedPattern,
  });

  // Auto-select first pattern if none selected
  useEffect(() => {
    if (patterns && patterns.length > 0 && !selectedPattern) {
      setSelectedPattern(patterns[0].id);
    }
  }, [patterns, selectedPattern]);

  // Center map on selected pattern
  useEffect(() => {
    if (patternDetail && patternDetail.positions.length > 0) {
      const firstPos = patternDetail.positions[0];
      setMapCenter({ lat: firstPos.lat, lng: firstPos.lng });
      setMapZoom(12);
    }
  }, [patternDetail]);

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'sky_writing':
        return '✏️';
      case 'excessive_hovering':
        return '⏸️';
      case 'repetitive_circling':
        return '🔄';
      default:
        return '⚠️';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score > 0.8) return 'text-red-600 dark:text-red-400';
    if (score > 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getReviewBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'false_positive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  if (patternsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading abnormal patterns...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Abnormal Flight Pattern Detection
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Detected patterns including potential sky-writing, excessive hovering, and unusual flight paths
        </p>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar - Pattern List */}
        <div className="w-96 bg-white dark:bg-gray-800 border-r dark:border-gray-700 overflow-y-auto">
          {/* Filters */}
          <div className="p-4 border-b dark:border-gray-700">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pattern Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="sky_writing">Sky Writing</option>
                  <option value="excessive_hovering">Excessive Hovering</option>
                  <option value="repetitive_circling">Repetitive Circling</option>
                  <option value="abnormal_path">Abnormal Path</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Review Status
                </label>
                <select
                  value={filterReviewed}
                  onChange={(e) => setFilterReviewed(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending Review</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="false_positive">False Positive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pattern List */}
          <div className="divide-y dark:divide-gray-700">
            {patterns && patterns.length > 0 ? (
              patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedPattern === pattern.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedPattern(pattern.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getPatternIcon(pattern.pattern_type)}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {pattern.aircraft_registration || 'Unknown Aircraft'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {pattern.pattern_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {pattern.flight_date && format(new Date(pattern.flight_date), 'MMM dd, yyyy h:mm a')}
                        </div>
                        <div className="text-xs">
                          Duration: {pattern.duration_minutes?.toFixed(0)} minutes
                        </div>
                        <div className={`text-sm font-medium ${getConfidenceColor(pattern.confidence_score)}`}>
                          Confidence: {(pattern.confidence_score * 100).toFixed(0)}%
                        </div>
                        {pattern.metadata.reasons && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {pattern.metadata.reasons[0]}
                          </div>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getReviewBadge(pattern.reviewed)}`}>
                          {pattern.reviewed}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No abnormal patterns found with current filters
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Map and Details */}
        <div className="flex-1 flex flex-col">
          {/* Pattern Details Bar */}
          {patternDetail && (
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Flight {patternDetail.flight_id} - {patternDetail.aircraft_registration}
                  </h2>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {patternDetail.metadata.complexity_metrics && (
                      <>
                        <span>Sharp Turns: {patternDetail.metadata.complexity_metrics.sharp_turns}</span>
                        <span>Reversals: {patternDetail.metadata.complexity_metrics.reversals}</span>
                        <span>Efficiency: {(patternDetail.metadata.complexity_metrics.efficiency * 100).toFixed(1)}%</span>
                      </>
                    )}
                    {patternDetail.positions && (
                      <span>Points: {patternDetail.positions.length}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getConfidenceColor(patternDetail.confidence_score)}`}>
                    {(patternDetail.confidence_score * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                </div>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="flex-1">
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={mapZoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
              >
                {/* Selected Pattern Flight Path */}
                {patternDetail && patternDetail.positions && patternDetail.positions.length > 0 && (
                  <>
                    {/* Flight path */}
                    <Polyline
                      path={patternDetail.positions.map(p => ({ lat: p.lat, lng: p.lng }))}
                      options={{
                        strokeColor: PATTERN_COLORS[patternDetail.pattern_type] || PATTERN_COLORS.default,
                        strokeWeight: 3,
                        strokeOpacity: 0.8,
                      }}
                    />

                    {/* Start marker */}
                    <MarkerF
                      position={{ lat: patternDetail.positions[0].lat, lng: patternDetail.positions[0].lng }}
                      onClick={() => setSelectedMarker('start')}
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                      }}
                    />
                    {selectedMarker === 'start' && (
                      <InfoWindow
                        position={{ lat: patternDetail.positions[0].lat, lng: patternDetail.positions[0].lng }}
                        onCloseClick={() => setSelectedMarker(null)}
                      >
                        <div className="p-2">
                          <strong>Flight Start</strong><br />
                          Aircraft: {patternDetail.aircraft_registration}<br />
                          Pattern: {patternDetail.pattern_type}
                        </div>
                      </InfoWindow>
                    )}

                    {/* End marker */}
                    {patternDetail.positions.length > 1 && (
                      <>
                        <MarkerF
                          position={{
                            lat: patternDetail.positions[patternDetail.positions.length - 1].lat,
                            lng: patternDetail.positions[patternDetail.positions.length - 1].lng
                          }}
                          onClick={() => setSelectedMarker('end')}
                          icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          }}
                        />
                        {selectedMarker === 'end' && (
                          <InfoWindow
                            position={{
                              lat: patternDetail.positions[patternDetail.positions.length - 1].lat,
                              lng: patternDetail.positions[patternDetail.positions.length - 1].lng
                            }}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div className="p-2">
                              <strong>Flight End</strong><br />
                              Total Points: {patternDetail.positions.length}
                            </div>
                          </InfoWindow>
                        )}
                      </>
                    )}

                    {/* Hovering locations */}
                    {patternDetail.metadata.hovering_events?.map((hover, idx) => (
                      <React.Fragment key={`hover-${idx}`}>
                        <MarkerF
                          position={{ lat: hover.latitude, lng: hover.longitude }}
                          onClick={() => setSelectedMarker(`hover-${idx}`)}
                          icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                          }}
                        />
                        {selectedMarker === `hover-${idx}` && (
                          <InfoWindow
                            position={{ lat: hover.latitude, lng: hover.longitude }}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div className="p-2">
                              Hovering: {hover.duration_minutes.toFixed(1)} minutes
                            </div>
                          </InfoWindow>
                        )}
                      </React.Fragment>
                    ))}
                  </>
                )}
              </GoogleMap>
            </LoadScript>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbnormalPatternsPage;