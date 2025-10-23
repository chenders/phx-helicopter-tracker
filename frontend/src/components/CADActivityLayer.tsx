/**
 * CAD Activity Layer Component
 *
 * Division-inspired visualization of police radio activity (CAD calls) during flight.
 * Shows call origins as holographic markers with urgency-based color coding.
 *
 * Features:
 * - Holographic markers at mentioned locations
 * - Urgency-based colors: red (high), amber (medium), green (low)
 * - Pulsing animation for active calls
 * - Click/hover for call details
 */

import { useEffect, useRef, useState } from 'react';
import { HolographicColors } from '../utils/holographicMaterials';
import { RadioActivitySegment } from '../hooks/useRadioActivity';

declare global {
  interface Window {
    Cesium: any;
  }
}

interface CADActivityLayerProps {
  viewer: any;  // Cesium.Viewer
  segments: RadioActivitySegment[];
  currentTimestamp?: string;  // ISO timestamp
  showMarkers?: boolean;
}

/**
 * Get urgency color based on score
 * High (>0.6) = Red, Medium (0.3-0.6) = Amber, Low (<0.3) = Green
 */
function getUrgencyColor(urgencyScore: number | null): { r: number; g: number; b: number } {
  if (urgencyScore === null || urgencyScore < 0.3) {
    return HolographicColors.LOCATION_PRIMARY;  // Green - low/routine
  } else if (urgencyScore < 0.6) {
    return HolographicColors.WARNING;  // Amber - medium priority
  } else {
    return HolographicColors.CRITICAL_ALERT;  // Red - high urgency
  }
}

/**
 * Get urgency label
 */
function getUrgencyLabel(urgencyScore: number | null): string {
  if (urgencyScore === null) return 'ROUTINE';
  if (urgencyScore < 0.3) return 'LOW';
  if (urgencyScore < 0.6) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Attempt to geocode a location string to coordinates
 * This is a simplified version - in production, use a proper geocoding service
 */
function attemptGeocoding(location: string): { latitude: number; longitude: number } | null {
  // For now, return null - geocoding would require external API
  // Future enhancement: integrate with Google Maps Geocoding API
  // or use a local Phoenix street database with coordinates
  return null;
}

/**
 * Check if segment is currently active based on timestamp
 */
function isSegmentActive(segment: RadioActivitySegment, currentTimestamp: string | undefined): boolean {
  if (!currentTimestamp || !segment.timestamp) return false;

  try {
    const current = new Date(currentTimestamp).getTime();
    const segmentTime = new Date(segment.timestamp).getTime();
    const segmentEnd = segmentTime + (segment.duration_seconds * 1000);

    // Active if current time is within segment duration
    return current >= segmentTime && current <= segmentEnd;
  } catch {
    return false;
  }
}

/**
 * CADActivityLayer Component
 */
export const CADActivityLayer: React.FC<CADActivityLayerProps> = ({
  viewer,
  segments,
  currentTimestamp,
  showMarkers = true,
}) => {
  const entitiesRef = useRef<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<RadioActivitySegment | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const Cesium = window.Cesium;
    if (!Cesium || !viewer || !showMarkers) return;

    // Clear existing entities
    for (const entity of entitiesRef.current) {
      try {
        viewer.entities.remove(entity);
      } catch (e) {
        console.warn('Error removing CAD marker entity:', e);
      }
    }
    entitiesRef.current = [];

    // For each segment with locations, create a marker
    // Note: Without geocoding, we can't place markers at exact coordinates
    // This is a limitation that would be resolved with a geocoding service

    // Future implementation would:
    // 1. Geocode each location string to lat/lng
    // 2. Create Cesium entities at those coordinates
    // 3. Style with urgency colors
    // 4. Add click handlers for details

    console.log(`CAD Activity Layer: ${segments.length} segments with location data`);
    console.log('Note: Geocoding not yet implemented - markers require coordinate mapping');

    // For now, we'll log the activity data structure
    segments.forEach(segment => {
      if (segment.locations.length > 0) {
        const urgency = getUrgencyLabel(segment.urgency_score);
        console.log(`[${urgency}] ${segment.locations.join(', ')} - "${segment.text.substring(0, 50)}..."`);
      }
    });

  }, [viewer, segments, showMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewer) {
        for (const entity of entitiesRef.current) {
          try {
            viewer.entities.remove(entity);
          } catch (e) {
            console.warn('Error removing CAD marker entity on cleanup:', e);
          }
        }
        entitiesRef.current = [];
      }
    };
  }, [viewer]);

  // This component renders directly to Cesium, no React DOM
  // Tooltip would be rendered if selectedSegment is set
  return selectedSegment ? (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: tooltipPosition?.x || 0,
        top: tooltipPosition?.y || 0,
      }}
    >
      <div
        className="bg-black/90 backdrop-blur-md border rounded-lg p-3 max-w-sm"
        style={{
          borderColor: `${getUrgencyColor(selectedSegment.urgency_score)}60`,
          boxShadow: `0 0 20px ${getUrgencyColor(selectedSegment.urgency_score)}40`,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: `rgb(${getUrgencyColor(selectedSegment.urgency_score).r * 255}, ${getUrgencyColor(selectedSegment.urgency_score).g * 255}, ${getUrgencyColor(selectedSegment.urgency_score).b * 255})` }}
          >
            {getUrgencyLabel(selectedSegment.urgency_score)} PRIORITY
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {new Date(selectedSegment.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="text-xs text-gray-300 mb-2">
          {selectedSegment.text}
        </div>

        {selectedSegment.locations.length > 0 && (
          <div className="text-xs text-green-400 mb-1">
            📍 {selectedSegment.locations.join(', ')}
          </div>
        )}

        {selectedSegment.incident_codes.length > 0 && (
          <div className="text-xs text-amber-400">
            🚨 {selectedSegment.incident_codes.join(', ')}
          </div>
        )}
      </div>
    </div>
  ) : null;
};

export default CADActivityLayer;
