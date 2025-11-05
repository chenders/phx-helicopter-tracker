/**
 * Flight Visualization Type Definitions
 *
 * Extracted from FlightVisualization3DCesiumFixed.tsx for better organization
 * and reusability across components.
 */

/**
 * Individual flight position point with GPS coordinates and metadata
 */
export interface FlightPosition {
  latitude: number;
  longitude: number;
  altitude_feet: number;
  timestamp: string;
  is_hovering?: boolean;
  hover_duration_seconds?: number;
  track_degrees?: number;
  ground_speed_knots?: number;
  ground_elevation_feet?: number;
  altitude_agl_feet?: number;
}

/**
 * HUD (Heads-Up Display) data for flight visualization
 */
export interface HudData {
  speed: number;
  altitude: number;
  heading: number;
  groundElevation: number;
  altitudeAGL: number;
  distanceFromSearch: number;
  timeRemaining: number;
  timeToSearchRadius: number;
  isWithinSearchRadius: boolean;
}

/**
 * Hover location data for flight pattern analysis
 */
export interface HoverLocationData {
  latitude: number;
  longitude: number;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  position_count?: number;
}

/**
 * Search context for proximity-based flight analysis
 */
export interface SearchContext {
  lat: number;
  lng: number;
  radius: number; // in miles
}

/**
 * Props for FlightVisualization3DCesiumFixed component
 */
export interface FlightVisualization3DCesiumFixedProps {
  positions: FlightPosition[];
  currentPositionIndex?: number;
  isPlaying?: boolean;
  playbackSpeed?: number;
  onStartAnimationRef?: React.MutableRefObject<(() => void) | null>;
  onStopAnimationRef?: React.MutableRefObject<(() => void) | null>;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  onHudDataChange?: (hudData: HudData | null) => void;
  searchContext?: SearchContext;
  hoverLocations?: HoverLocationData[];
}

/**
 * Cesium viewer state tracking
 */
export interface ViewerState {
  isInitialized: boolean;
  isAnimating: boolean;
  currentFrame: number;
  lastUpdateTime: number;
}

/**
 * Camera configuration for Cesium viewer
 */
export interface CameraConfig {
  position: {
    lat: number;
    lng: number;
    alt: number;
  };
  heading: number;
  pitch: number;
  roll?: number;
}

/**
 * Label configuration for street/area labels
 */
export interface LabelConfig {
  tier: number;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
  fontSize?: number;
  maxDistance?: number;
  baseHeight?: number;
  scale?: number;
}

/**
 * Animation state for playback control
 */
export interface AnimationState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  direction: 'forward' | 'backward';
}
