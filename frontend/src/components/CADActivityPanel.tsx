/**
 * CAD Activity Panel Component
 *
 * Division-inspired panel showing police radio activity summary during flight.
 * Displays call statistics, urgency distribution, and location hotspots.
 *
 * Note: This is an alternative to map-based visualization that doesn't require geocoding.
 * Shows activity data in a structured, holographic panel format.
 */

import React, { useMemo } from 'react';
import { HolographicColors } from '../utils/holographicMaterials';
import { RadioActivitySegment } from '../hooks/useRadioActivity';

interface CADActivityPanelProps {
  segments: RadioActivitySegment[];
  currentTimestamp?: string;
  className?: string;
}

/**
 * Get urgency color
 */
function getUrgencyColor(urgencyScore: number | null): string {
  if (urgencyScore === null || urgencyScore < 0.3) {
    const c = HolographicColors.LOCATION_PRIMARY;
    return `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})`;
  } else if (urgencyScore < 0.6) {
    const c = HolographicColors.WARNING;
    return `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})`;
  } else {
    const c = HolographicColors.CRITICAL_ALERT;
    return `rgb(${c.r * 255}, ${c.g * 255}, ${c.b * 255})`;
  }
}

/**
 * CADActivityPanel Component
 */
export const CADActivityPanel: React.FC<CADActivityPanelProps> = ({
  segments,
  currentTimestamp,
  className = '',
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const total = segments.length;

    // Count by urgency
    let high = 0, medium = 0, low = 0;
    segments.forEach(seg => {
      const score = seg.urgency_score || 0;
      if (score >= 0.6) high++;
      else if (score >= 0.3) medium++;
      else low++;
    });

    // Count unique locations (top 5)
    const locationCounts: Record<string, number> = {};
    segments.forEach(seg => {
      seg.locations.forEach(loc => {
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      });
    });
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Count unique incident codes
    const incidentCounts: Record<string, number> = {};
    segments.forEach(seg => {
      seg.incident_codes.forEach(code => {
        incidentCounts[code] = (incidentCounts[code] || 0) + 1;
      });
    });
    const topIncidents = Object.entries(incidentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Count aircraft mentions
    const aircraftMentions = segments.filter(s => s.contains_tail_number).length;

    return {
      total,
      high,
      medium,
      low,
      topLocations,
      topIncidents,
      aircraftMentions,
    };
  }, [segments]);

  if (segments.length === 0) {
    return null;
  }

  const colors = {
    cyan: `rgb(${HolographicColors.FLIGHT_PATH.r * 255}, ${HolographicColors.FLIGHT_PATH.g * 255}, ${HolographicColors.FLIGHT_PATH.b * 255})`,
    green: `rgb(${HolographicColors.LOCATION_PRIMARY.r * 255}, ${HolographicColors.LOCATION_PRIMARY.g * 255}, ${HolographicColors.LOCATION_PRIMARY.b * 255})`,
    amber: `rgb(${HolographicColors.WARNING.r * 255}, ${HolographicColors.WARNING.g * 255}, ${HolographicColors.WARNING.b * 255})`,
    red: `rgb(${HolographicColors.CRITICAL_ALERT.r * 255}, ${HolographicColors.CRITICAL_ALERT.g * 255}, ${HolographicColors.CRITICAL_ALERT.b * 255})`,
  };

  return (
    <div className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur p-3 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: colors.cyan, boxShadow: `0 0 8px ${colors.cyan}` }}
          />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            CAD Activity
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {stats.total} calls
        </span>
      </div>

      {/* Urgency Distribution */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
          Priority Distribution
        </div>
        <div className="space-y-1">
          {/* High */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs font-mono" style={{ color: colors.red }}>
              HIGH
            </div>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(stats.high / stats.total) * 100}%`,
                  backgroundColor: colors.red,
                  boxShadow: `0 0 4px ${colors.red}`,
                }}
              />
            </div>
            <div className="w-8 text-xs font-mono text-gray-600 dark:text-gray-400 text-right">
              {stats.high}
            </div>
          </div>

          {/* Medium */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs font-mono" style={{ color: colors.amber }}>
              MEDIUM
            </div>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(stats.medium / stats.total) * 100}%`,
                  backgroundColor: colors.amber,
                  boxShadow: `0 0 4px ${colors.amber}`,
                }}
              />
            </div>
            <div className="w-8 text-xs font-mono text-gray-600 dark:text-gray-400 text-right">
              {stats.medium}
            </div>
          </div>

          {/* Low */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs font-mono" style={{ color: colors.green }}>
              LOW
            </div>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(stats.low / stats.total) * 100}%`,
                  backgroundColor: colors.green,
                  boxShadow: `0 0 4px ${colors.green}`,
                }}
              />
            </div>
            <div className="w-8 text-xs font-mono text-gray-600 dark:text-gray-400 text-right">
              {stats.low}
            </div>
          </div>
        </div>
      </div>

      {/* Top Locations */}
      {stats.topLocations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Top Locations
          </div>
          <div className="space-y-1">
            {stats.topLocations.map(([location, count], idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300" style={{ color: colors.green }}>
                  📍 {location}
                </span>
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  ×{count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Incident Codes */}
      {stats.topIncidents.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Incident Codes
          </div>
          <div className="space-y-1">
            {stats.topIncidents.map(([code, count], idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 font-mono" style={{ color: colors.amber }}>
                  {code}
                </span>
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  ×{count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aircraft Mentions */}
      {stats.aircraftMentions > 0 && (
        <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Aircraft Mentions:</span>
            <span className="font-mono font-bold" style={{ color: colors.cyan }}>
              {stats.aircraftMentions} calls
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CADActivityPanel;
