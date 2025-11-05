/**
 * Cesium Flight Visualization Configuration
 *
 * Centralized configuration for 3D flight visualization.
 * Extracted from FlightVisualization3DCesiumFixed.tsx to improve maintainability.
 */

/**
 * Camera configuration
 */
export const CAMERA_CONFIG = {
  // Camera pitch angles (in degrees, negative = looking down)
  PITCH_LEVEL: -5,           // Mostly level with slight downward tilt
  PITCH_MODERATE: -40,        // Moderate downward angle
  PITCH_STEEP: -50,          // Steep downward angle
  PITCH_HOVER: -70,          // Bird's eye view for hover areas

  // Camera distance from helicopter (in feet)
  DEFAULT_DISTANCE: 1000,
  CLOSE_DISTANCE: 500,
  FAR_DISTANCE: 2000,

  // Camera follow settings
  FOLLOW_SMOOTHNESS: 0.8,    // 0-1, higher = smoother but laggier

  // Default camera position
  DEFAULT_ALTITUDE: 1550,     // feet
  DEFAULT_HEADING: 272,       // degrees
  DEFAULT_ROLL: 0,            // degrees
} as const;

/**
 * Animation and playback configuration
 */
export const ANIMATION_CONFIG = {
  // Playback speed multipliers
  DEFAULT_SPEED: 0.5,
  HOVER_SPEED_MULTIPLIER: 10,   // Slow down by 10x in hover areas
  SEARCH_SPEED_MULTIPLIER: 5,   // Slow down by 5x near search radius

  // Frame update intervals
  POSITION_INTERVAL_SECONDS: 5,  // Seconds between position updates
  CAMERA_UPDATE_FRAME_RATE: 60,  // Frames per second target

  // Label regeneration
  LABEL_UPDATE_FRAME_INTERVAL: 60,      // Update labels every N frames
  LABEL_REGENERATION_DISTANCE_MILES: 1.5, // Regenerate when helicopter moves N miles

  // Animation loop delay (milliseconds)
  ANIMATION_LOOP_DELAY: 16, // ~60fps
} as const;

/**
 * Distance and radius configuration (in miles unless specified)
 */
export const DISTANCE_CONFIG = {
  // Search radius thresholds
  SEARCH_RADIUS_CLOSE: 0.5,      // miles
  SEARCH_RADIUS_MEDIUM: 1.0,     // miles
  SEARCH_RADIUS_FAR: 2.0,        // miles

  // Label visibility distances
  LABEL_VIEWPORT_RADIUS: 10,     // miles - labels within this distance
  LABEL_TIER_0_DISTANCE: 6,      // miles - major areas
  LABEL_TIER_1_DISTANCE: 5,      // miles - major streets
  LABEL_TIER_2_DISTANCE: 4,      // miles - medium streets
  LABEL_TIER_3_DISTANCE: 3,      // miles - minor streets

  // Hover detection
  HOVER_DETECTION_RADIUS: 100,   // feet
} as const;

/**
 * Label configuration
 */
export const LABEL_CONFIG = {
  // Label counts
  MAX_TOTAL_LABELS: 15,
  MAX_AREA_LABELS: 2,
  MAX_STREET_LABELS: 13,

  // Label styling (font sizes in pixels)
  FONT_SIZE_TIER_0: 24,  // Areas
  FONT_SIZE_TIER_1: 22,  // Major streets
  FONT_SIZE_TIER_2: 20,  // Medium streets
  FONT_SIZE_TIER_3: 18,  // Minor streets

  // Label visibility distances (in feet)
  MAX_DISTANCE_TIER_0: 31680,  // 6 miles
  MAX_DISTANCE_TIER_1: 26400,  // 5 miles
  MAX_DISTANCE_TIER_2: 21120,  // 4 miles
  MAX_DISTANCE_TIER_3: 15840,  // 3 miles

  // Label heights above ground (in feet)
  BASE_HEIGHT_TIER_0: 400,
  BASE_HEIGHT_TIER_1: 300,
  BASE_HEIGHT_TIER_2: 250,
  BASE_HEIGHT_TIER_3: 200,

  // Label scales
  SCALE_TIER_0: 1.2,
  SCALE_TIER_1: 1.1,
  SCALE_TIER_2: 1.0,
  SCALE_TIER_3: 0.9,

  // Decluttering
  MIN_DISTANCE_BETWEEN_LABELS: 0.5, // miles
  DECLUTTER_ENABLED: true,
} as const;

/**
 * Helicopter entity configuration
 */
export const HELICOPTER_CONFIG = {
  // Model settings
  MODEL_SCALE: 2.0,
  MODEL_MINIMUM_PIXEL_SIZE: 64,

  // Trail settings
  TRAIL_TIME_SECONDS: 300,  // 5 minutes
  TRAIL_WIDTH: 3,           // pixels

  // Position interpolation
  INTERPOLATION_DEGREE: 1,  // Linear interpolation
} as const;

/**
 * Performance and optimization
 */
export const PERFORMANCE_CONFIG = {
  // Rendering
  REQUEST_RENDER_MODE: true,     // Only render when needed
  MAXIMUM_SCREEN_SPACE_ERROR: 2, // Higher = better performance, lower quality

  // Tile caching
  MAXIMUM_CACHE_OVERFLOW_SIZE: 512, // MB

  // Label optimization
  LABEL_FRUSTUM_CULLING: true,   // Hide labels outside view
  LABEL_DISTANCE_CULLING: true,   // Hide distant labels
} as const;

/**
 * Google 3D Tiles configuration
 */
export const GOOGLE_TILES_CONFIG = {
  // Tileset IDs
  PHOTOREALISTIC_TILESET_ID: 'google_photorealistic_3d_tiles',

  // API Configuration
  SHOW_CREDITS_ON_SCREEN: false,

  // Quality settings
  SKIP_LEVEL_OF_DETAIL: false,
  MAXIMUM_SCREEN_SPACE_ERROR: 16,
} as const;

/**
 * HUD (Heads-Up Display) configuration
 */
export const HUD_CONFIG = {
  // Update intervals
  UPDATE_INTERVAL_MS: 100,  // milliseconds

  // Display precision
  ALTITUDE_DECIMAL_PLACES: 0,
  SPEED_DECIMAL_PLACES: 1,
  DISTANCE_DECIMAL_PLACES: 2,
} as const;

/**
 * Conversion constants
 */
export const CONVERSION_CONSTANTS = {
  FEET_PER_MILE: 5280,
  METERS_TO_FEET: 3.28084,
  KNOTS_TO_MPH: 1.15078,
  EARTH_RADIUS_FEET: 20925721,
  EARTH_RADIUS_MILES: 3959,
} as const;

/**
 * Mobile device breakpoint
 */
export const MOBILE_BREAKPOINT = 768; // pixels

/**
 * Helper function to get camera pitch by mode
 */
export const getCameraPitchByMode = (mode: 'auto' | 'level' | 'moderate' | 'steep'): number => {
  switch (mode) {
    case 'level':
      return CAMERA_CONFIG.PITCH_LEVEL;
    case 'moderate':
      return CAMERA_CONFIG.PITCH_MODERATE;
    case 'steep':
      return CAMERA_CONFIG.PITCH_STEEP;
    default:
      return CAMERA_CONFIG.PITCH_LEVEL; // 'auto' defaults to level
  }
};

/**
 * Helper function to get label config by tier
 */
export const getLabelConfigByTier = (tier: number) => {
  switch (tier) {
    case 0:
      return {
        fontSize: LABEL_CONFIG.FONT_SIZE_TIER_0,
        maxDistance: LABEL_CONFIG.MAX_DISTANCE_TIER_0,
        baseHeight: LABEL_CONFIG.BASE_HEIGHT_TIER_0,
        scale: LABEL_CONFIG.SCALE_TIER_0,
      };
    case 1:
      return {
        fontSize: LABEL_CONFIG.FONT_SIZE_TIER_1,
        maxDistance: LABEL_CONFIG.MAX_DISTANCE_TIER_1,
        baseHeight: LABEL_CONFIG.BASE_HEIGHT_TIER_1,
        scale: LABEL_CONFIG.SCALE_TIER_1,
      };
    case 2:
      return {
        fontSize: LABEL_CONFIG.FONT_SIZE_TIER_2,
        maxDistance: LABEL_CONFIG.MAX_DISTANCE_TIER_2,
        baseHeight: LABEL_CONFIG.BASE_HEIGHT_TIER_2,
        scale: LABEL_CONFIG.SCALE_TIER_2,
      };
    case 3:
    default:
      return {
        fontSize: LABEL_CONFIG.FONT_SIZE_TIER_3,
        maxDistance: LABEL_CONFIG.MAX_DISTANCE_TIER_3,
        baseHeight: LABEL_CONFIG.BASE_HEIGHT_TIER_3,
        scale: LABEL_CONFIG.SCALE_TIER_3,
      };
  }
};
