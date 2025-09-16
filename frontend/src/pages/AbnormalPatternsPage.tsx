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
    sky_art_segments?: Array<{
      start_index: number;
      end_index: number;
      start_position: {
        latitude: number;
        longitude: number;
        timestamp?: string;
      };
      end_position: {
        latitude: number;
        longitude: number;
        timestamp?: string;
      };
      length: number;
      avg_complexity: number;
      max_complexity: number;
      positions: Array<{
        latitude: number;
        longitude: number;
        timestamp?: string;
      }>;
    }>;
    total_sky_art_positions?: number;
    num_sky_art_segments?: number;
    position_confidence?: number[];
    avg_confidence?: number;
    max_confidence?: number;
    high_confidence_positions?: number;
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
  sky_art: '#FF0000',              // Red for deliberate sky art (like ALEX)
  sky_writing: '#FF0000',          // Red (legacy, for backward compatibility)
  intensive_surveillance: '#9400D3', // Violet for intensive surveillance patterns
  excessive_hovering: '#FFA500',   // Orange for hovering
  repetitive_circling: '#FFD700',  // Gold for circling (more visible than yellow)
  abnormal_path: '#FF1493',        // Pink for other abnormal paths
  default: '#0000FF'               // Blue for default
};

const PHOENIX_CENTER = { lat: 33.4484, lng: -112.0740 };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px',
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
  const [filterAircraft, setFilterAircraft] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('confidence_desc');
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    setIsGoogleMapsLoaded(true);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fetch list of aircraft
  const { data: aircraft } = useQuery<any[]>({
    queryKey: ['phoenixAircraft'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/abnormal-patterns/aircraft');
      return response.data;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  // Fetch list of abnormal patterns
  const { data: patterns, isLoading: patternsLoading } = useQuery<AbnormalPattern[]>({
    queryKey: ['abnormalPatterns', filterType, filterReviewed, filterAircraft],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('pattern_type', filterType);
      if (filterReviewed !== 'all') params.append('reviewed', filterReviewed);
      if (filterAircraft !== 'all') params.append('aircraft_id', filterAircraft);
      params.append('days_back', '30');
      
      const response = await axios.get(`/api/v1/abnormal-patterns?${params}`);
      return response.data;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: false, // Don't retry on error
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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 30 * 60 * 1000, // Cache pattern details for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: false,
  });

  // Sort patterns based on selected sorting option
  const sortedPatterns = React.useMemo(() => {
    if (!patterns) return [];
    
    const sorted = [...patterns];
    switch (sortBy) {
      case 'confidence_desc':
        sorted.sort((a, b) => b.confidence_score - a.confidence_score);
        break;
      case 'confidence_asc':
        sorted.sort((a, b) => a.confidence_score - b.confidence_score);
        break;
      case 'date_desc':
        sorted.sort((a, b) => {
          // Use flight_date for sorting (when the flight happened)
          const dateA = new Date(a.flight_date || a.detected_at).getTime();
          const dateB = new Date(b.flight_date || b.detected_at).getTime();
          return dateB - dateA;
        });
        break;
      case 'date_asc':
        sorted.sort((a, b) => {
          // Use flight_date for sorting (when the flight happened)
          const dateA = new Date(a.flight_date || a.detected_at).getTime();
          const dateB = new Date(b.flight_date || b.detected_at).getTime();
          return dateA - dateB;
        });
        break;
      default:
        // Default to confidence descending
        sorted.sort((a, b) => b.confidence_score - a.confidence_score);
    }
    return sorted;
  }, [patterns, sortBy]);

  // Calculate paginated patterns
  const totalPages = sortedPatterns ? Math.ceil(sortedPatterns.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatterns = sortedPatterns?.slice(startIndex, endIndex) || [];

  // Auto-select first pattern on current page if none selected
  useEffect(() => {
    if (paginatedPatterns && paginatedPatterns.length > 0 && !selectedPattern) {
      setSelectedPattern(paginatedPatterns[0].id);
    }
  }, [paginatedPatterns, selectedPattern]);

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterReviewed, filterAircraft, sortBy]);

  // Center and zoom map to fit the selected pattern (focus on sky art segments if present)
  useEffect(() => {
    if (patternDetail && patternDetail.positions.length > 0 && map && isGoogleMapsLoaded && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // If there are sky art segments, focus on them instead of the full path
      if (patternDetail.metadata?.sky_art_segments && patternDetail.metadata.sky_art_segments.length > 0) {
        // Add all sky art segment positions to bounds
        patternDetail.metadata.sky_art_segments.forEach(segment => {
          segment.positions.forEach(pos => {
            bounds.extend(new window.google.maps.LatLng(pos.latitude, pos.longitude));
          });
        });
        
        // If there are multiple segments, make sure we can see all of them
        // Add a bit more padding for sky art segments to see the pattern clearly
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latPadding = Math.abs(ne.lat() - sw.lat()) * 0.3;  // More padding for sky art
        const lngPadding = Math.abs(ne.lng() - sw.lng()) * 0.3;
        
        bounds.extend(new window.google.maps.LatLng(ne.lat() + latPadding, ne.lng() + lngPadding));
        bounds.extend(new window.google.maps.LatLng(sw.lat() - latPadding, sw.lng() - lngPadding));
        
        // Fit the map to the sky art segments
        map.fitBounds(bounds);
        
        // For sky art, allow closer zoom to see the pattern detail
        setTimeout(() => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 16) {
            map.setZoom(16);  // Allow zoom level 16 for sky art
          }
        }, 300);
      } else {
        // No sky art segments, show the full flight path
        patternDetail.positions.forEach(pos => {
          bounds.extend(new window.google.maps.LatLng(pos.lat, pos.lng));
        });
        
        // Add padding around the bounds
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latPadding = Math.abs(ne.lat() - sw.lat()) * 0.2;
        const lngPadding = Math.abs(ne.lng() - sw.lng()) * 0.2;
        
        bounds.extend(new window.google.maps.LatLng(ne.lat() + latPadding, ne.lng() + lngPadding));
        bounds.extend(new window.google.maps.LatLng(sw.lat() - latPadding, sw.lng() - lngPadding));
        
        // Fit the map to the bounds
        map.fitBounds(bounds);
        
        // Set maximum zoom level
        setTimeout(() => {
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom > 15) {
            map.setZoom(15);
          }
        }, 300);
      }
    }
  }, [patternDetail, map, isGoogleMapsLoaded]);

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'sky_art':
        return '🎨';  // Art palette for deliberate sky art
      case 'sky_writing':
        return '✏️';  // Pencil (legacy)
      case 'intensive_surveillance':
        return '🔍';  // Magnifying glass for intensive searching
      case 'excessive_hovering':
        return '⏸️';  // Pause for hovering
      case 'repetitive_circling':
        return '🔄';  // Circling arrows
      default:
        return '⚠️';  // Warning for unknown
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score > 0.8) return 'text-red-600 dark:text-red-400';
    if (score > 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };
  
  // Get color for path segment based on confidence (for heat map)
  const getPathColorByConfidence = (confidence: number): string => {
    // Create a gradient from blue (low confidence) to red (high confidence)
    if (confidence >= 0.9) return '#FF0000';      // Bright red
    if (confidence >= 0.8) return '#FF3300';      // Red-orange
    if (confidence >= 0.7) return '#FF6600';      // Orange-red
    if (confidence >= 0.6) return '#FF9900';      // Orange
    if (confidence >= 0.5) return '#FFCC00';      // Yellow-orange
    if (confidence >= 0.4) return '#FFFF00';      // Yellow
    if (confidence >= 0.3) return '#99FF00';      // Yellow-green
    if (confidence >= 0.2) return '#33FF00';      // Green
    if (confidence >= 0.1) return '#00FF99';      // Cyan-green
    if (confidence >= 0.05) return '#0099FF';     // Light blue
    return '#666666';                             // Gray for very low confidence
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Abnormal Flight Pattern Detection
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Detected patterns including potential sky-writing, excessive hovering, and unusual flight paths
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Pattern List */}
        <div className="w-96 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col h-full">
          {/* Filters */}
          <div className="p-4 border-b dark:border-gray-700">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Helicopter
                </label>
                <select
                  value={filterAircraft}
                  onChange={(e) => setFilterAircraft(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Helicopters</option>
                  {aircraft?.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.registration} {a.make && a.model ? `(${a.make} ${a.model})` : ''}
                    </option>
                  ))}
                </select>
              </div>
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
                  <option value="sky_art">Sky Art (Deliberate Patterns)</option>
                  <option value="intensive_surveillance">Intensive Surveillance</option>
                  <option value="excessive_hovering">Excessive Hovering</option>
                  <option value="repetitive_circling">Repetitive Circling</option>
                  <option value="abnormal_path">Abnormal Path</option>
                  <option value="sky_writing">Sky Writing (Legacy)</option>
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
            
            {/* Sort Options */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="confidence_desc">Confidence (High to Low)</option>
                <option value="confidence_asc">Confidence (Low to High)</option>
                <option value="date_desc">Flight Date (Newest First)</option>
                <option value="date_asc">Flight Date (Oldest First)</option>
              </select>
            </div>
          </div>

          {/* Pattern List */}
          <div className="flex-1 overflow-y-auto divide-y dark:divide-gray-700 min-h-0">
            {paginatedPatterns && paginatedPatterns.length > 0 ? (
              paginatedPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 ${
                    selectedPattern === pattern.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 shadow-lg' : ''
                  }`}
                  onClick={() => {
                    setSelectedPattern(pattern.id);
                    setSelectedMarker(null); // Reset any open info windows
                  }}
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
                            {(() => {
                              // For sky art patterns, prioritize showing the sky art detection reason
                              if (pattern.pattern_type === 'sky_art') {
                                const skyArtReason = pattern.metadata.reasons.find(reason => 
                                  reason.includes('Sky art pattern detected')
                                );
                                if (skyArtReason) return skyArtReason;
                              }
                              // Otherwise show the first reason
                              return pattern.metadata.reasons[0];
                            })()}
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
                {patterns?.length === 0 ? 
                  'No abnormal patterns found with current filters' : 
                  'No patterns on this page'}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {patterns && patterns.length > 0 && (
            <div className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
                >
                  Previous
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages} ({patterns.length} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Show:
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const newItemsPerPage = parseInt(e.target.value);
                        setItemsPerPage(newItemsPerPage);
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      className="px-2 py-1 text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Map and Details */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
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
                    {patternDetail.metadata.sky_art_segments && patternDetail.metadata.sky_art_segments.length > 0 && (
                      <>
                        <span className="text-yellow-400">Sky Art Segments: {patternDetail.metadata.num_sky_art_segments}</span>
                        <span className="text-yellow-400">Sky Art Positions: {patternDetail.metadata.total_sky_art_positions}</span>
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
          <div className="flex-1 min-h-0 relative">
            {/* Confidence Legend - only show when we have confidence data */}
            {patternDetail?.metadata?.position_confidence && (
              <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Sky Art Confidence
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2" style={{ backgroundColor: '#FF0000' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">90-100% High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2" style={{ backgroundColor: '#FF6600' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">70-89%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2" style={{ backgroundColor: '#FFCC00' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">50-69%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2" style={{ backgroundColor: '#99FF00' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">30-49%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2" style={{ backgroundColor: '#0099FF' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">5-29% Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2" style={{ backgroundColor: '#666666' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">&lt;5% Normal</span>
                  </div>
                </div>
                {patternDetail.metadata.avg_confidence && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Avg: {(patternDetail.metadata.avg_confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      High Conf: {patternDetail.metadata.high_confidence_positions} pts
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <LoadScript 
              googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
              onLoad={() => setIsGoogleMapsLoaded(true)}
            >
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
                    {/* If we have position confidence scores, show heat map */}
                    {patternDetail.metadata?.position_confidence && 
                     patternDetail.metadata.position_confidence.length > 0 ? (
                      <>
                        {/* Draw path segments with confidence-based colors */}
                        {patternDetail.positions.slice(0, -1).map((pos, idx) => {
                          const nextPos = patternDetail.positions[idx + 1];
                          const confidence = patternDetail.metadata.position_confidence[idx] || 0;
                          
                          return (
                            <Polyline
                              key={`segment-${idx}`}
                              path={[
                                { lat: pos.lat, lng: pos.lng },
                                { lat: nextPos.lat, lng: nextPos.lng }
                              ]}
                              options={{
                                strokeColor: getPathColorByConfidence(confidence),
                                strokeWeight: confidence > 0.5 ? 5 : 4,  // Thicker for high confidence
                                strokeOpacity: Math.max(0.4, confidence),  // More opaque for high confidence
                                zIndex: Math.floor(confidence * 10) + 1,  // Higher z-index for high confidence
                              }}
                            />
                          );
                        })}
                      </>
                    ) : (
                      /* No confidence scores, show base flight path */
                      <Polyline
                        path={patternDetail.positions.map(p => ({ lat: p.lat, lng: p.lng }))}
                        options={{
                          strokeColor: '#666666',  // Gray for non-sky-art portions
                          strokeWeight: 3,
                          strokeOpacity: 0.6,
                          zIndex: 1,
                        }}
                      />
                    )}
                    
                    {/* Sky art segments highlighted (if present) */}
                    {patternDetail.metadata?.sky_art_segments?.map((segment, idx) => (
                      <React.Fragment key={`segment-${idx}`}>
                        {/* Glow effect for sky art segment */}
                        <Polyline
                          path={segment.positions.map(p => ({ 
                            lat: p.latitude, 
                            lng: p.longitude 
                          }))}
                          options={{
                            strokeColor: '#FFD700',  // Gold for sky art segments
                            strokeWeight: 12,
                            strokeOpacity: 0.4,
                            zIndex: 2,
                          }}
                        />
                        {/* Main sky art segment path */}
                        <Polyline
                          path={segment.positions.map(p => ({ 
                            lat: p.latitude, 
                            lng: p.longitude 
                          }))}
                          options={{
                            strokeColor: '#FF0000',  // Bright red for sky art
                            strokeWeight: 5,
                            strokeOpacity: 0.9,
                            zIndex: 3,
                            icons: isGoogleMapsLoaded && window.google?.maps ? [{
                              icon: {
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 2,
                                strokeColor: '#FFFF00',
                                strokeWeight: 1,
                                fillColor: '#FFFF00',
                                fillOpacity: 0.8
                              },
                              offset: '0%',
                              repeat: '30px'
                            }] : [],
                          }}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* If no sky art segments, show the full path highlighted */}
                    {(!patternDetail.metadata?.sky_art_segments || patternDetail.metadata.sky_art_segments.length === 0) && (
                      <>
                        {/* Highlighted flight path with animation */}
                        <Polyline
                          path={patternDetail.positions.map(p => ({ lat: p.lat, lng: p.lng }))}
                          options={{
                            strokeColor: PATTERN_COLORS[patternDetail.pattern_type] || PATTERN_COLORS.default,
                            strokeWeight: 4,
                            strokeOpacity: 0.9,
                            zIndex: 2,
                            icons: isGoogleMapsLoaded && window.google?.maps ? [{
                              icon: {
                                path: window.google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                                scale: 2,
                                strokeColor: '#FFFFFF',
                                strokeWeight: 1,
                                fillColor: '#FFFFFF',
                                fillOpacity: 0.8
                              },
                              offset: '100%',
                              repeat: '100px'
                            }] : [],
                          }}
                        />
                        
                        {/* Background glow effect for highlighting */}
                        <Polyline
                          path={patternDetail.positions.map(p => ({ lat: p.lat, lng: p.lng }))}
                          options={{
                            strokeColor: PATTERN_COLORS[patternDetail.pattern_type] || PATTERN_COLORS.default,
                            strokeWeight: 12,
                            strokeOpacity: 0.3,
                            zIndex: 0,
                          }}
                        />
                      </>
                    )}

                    {/* Start marker with pulsing animation */}
                    <MarkerF
                      position={{ lat: patternDetail.positions[0].lat, lng: patternDetail.positions[0].lng }}
                      onClick={() => setSelectedMarker('start')}
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        scaledSize: isGoogleMapsLoaded && window.google?.maps ? new window.google.maps.Size(48, 48) : undefined,
                        anchor: isGoogleMapsLoaded && window.google?.maps ? new window.google.maps.Point(24, 48) : undefined,
                      }}
                      animation={isGoogleMapsLoaded && window.google?.maps ? window.google.maps.Animation.DROP : undefined}
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
                            scaledSize: isGoogleMapsLoaded && window.google?.maps ? new window.google.maps.Size(48, 48) : undefined,
                            anchor: isGoogleMapsLoaded && window.google?.maps ? new window.google.maps.Point(24, 48) : undefined,
                          }}
                          animation={isGoogleMapsLoaded && window.google?.maps ? window.google.maps.Animation.DROP : undefined}
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

