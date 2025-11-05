/**
 * Flight Visualization Utility Functions
 *
 * Pure utility functions for flight data formatting and device detection.
 * Extracted from FlightVisualization3DCesiumFixed.tsx for better testability.
 */

/**
 * Detects if the current device is a mobile device
 * @returns true if device is touch-capable AND has a small screen (<= 768px)
 */
export const isMobileDevice = (): boolean => {
  // Check if touch-capable AND small screen
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768; // Typical mobile breakpoint
  return isTouchDevice && isSmallScreen;
};

/**
 * Converts heading degrees to cardinal direction
 * @param degrees - Heading in degrees (0-360)
 * @returns Cardinal direction abbreviation (N, NNE, NE, etc.)
 */
export const getCardinalDirection = (degrees: number): string => {
  const normalized = ((degrees % 360) + 360) % 360; // Normalize to 0-360
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
};

/**
 * Formats time in MM:SS format
 * @param seconds - Time in seconds (can be negative)
 * @returns Formatted time string (e.g., "12:34")
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.floor(Math.abs(seconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculates distance between two geographic points using Haversine formula
 * @param lat1 - Latitude of first point in degrees
 * @param lng1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lng2 - Longitude of second point in degrees
 * @returns Distance in feet
 */
export const getDistanceFeet = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 20925721; // Earth radius in feet
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates distance between two geographic points in miles
 * @param lat1 - Latitude of first point in degrees
 * @param lng1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lng2 - Longitude of second point in degrees
 * @returns Distance in miles
 */
export const getDistanceMiles = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Normalizes angle to 0-360 degree range
 * @param degrees - Angle in degrees
 * @returns Normalized angle (0-360)
 */
export const normalizeAngle = (degrees: number): number => {
  return ((degrees % 360) + 360) % 360;
};

/**
 * Converts knots to miles per hour
 * @param knots - Speed in knots
 * @returns Speed in mph
 */
export const knotsToMph = (knots: number): number => {
  return knots * 1.15078;
};

/**
 * Converts meters to feet
 * @param meters - Distance in meters
 * @returns Distance in feet
 */
export const metersToFeet = (meters: number): number => {
  return meters * 3.28084;
};

/**
 * Converts feet to meters
 * @param feet - Distance in feet
 * @returns Distance in meters
 */
export const feetToMeters = (feet: number): number => {
  return feet / 3.28084;
};
