/**
 * Compact Flight Detail Header Component
 *
 * A space-efficient header design with:
 * - Compact single-line display by default
 * - Expandable sections for detailed info
 * - Holographic/tactical theme
 * - Integrated animation controls
 */

import React, { useState } from 'react';
import {
  Plane,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  DollarSign,
  Gauge,
  Info,
  Target
} from 'lucide-react';

interface FlightDetailHeaderProps {
  flightId: string;
  aircraft: string;
  callsign: string;
  departureTime: string;
  duration: number | null;
  distance: string;
  avgSpeed: string;
  estimatedCost: number | null;
  isAnimating: boolean;
  playbackSpeed: number;
  onToggleAnimation: () => void;
  onSpeedChange: (speed: number) => void;
  searchContext?: {
    lat?: number;
    lng?: number;
    closestDistance?: number;
    closestSpeed?: number;
    closestAltitudeAGL?: number;
    closestAltitude?: number;
    closestBearing?: number;
    closestTime?: string;
    isHovering?: boolean;
    hoverDuration?: number;
    radius?: number;
    totalTimeInRadius?: number;
  };
}

export const FlightDetailHeader: React.FC<FlightDetailHeaderProps> = ({
  flightId,
  aircraft,
  callsign,
  departureTime,
  duration,
  distance,
  avgSpeed,
  estimatedCost,
  isAnimating,
  playbackSpeed,
  onToggleAnimation,
  onSpeedChange,
  searchContext,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  const { date, time } = formatDateTime(departureTime);

  return (
    <div className="bg-gradient-to-r from-gray-900/95 via-blue-900/90 to-gray-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/20">
      {/* Compact Header - Always Visible */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Flight Info - Left Side */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-lg flex-shrink-0">
            <Plane className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-cyan-50 truncate">
                {flightId || 'Unknown Flight'}
              </h1>
              <span className="text-sm text-cyan-400/70 font-mono">
                {aircraft}
              </span>
              {callsign && (
                <span className="text-xs text-blue-300/60 font-mono">
                  • {callsign}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-cyan-300/60 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {date} {time}
              </span>
              {duration != null && (
                <>
                  <span>•</span>
                  <span>{duration.toFixed(0)}m</span>
                </>
              )}
              {distance && (
                <>
                  <span>•</span>
                  <span>{distance} mi</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Animation Controls - Center */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggleAnimation}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              isAnimating
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/30'
                : 'bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/30'
            }`}
          >
            {!isAnimating && (
              <span className="absolute inset-0 rounded-lg animate-pulse border border-emerald-400/50"></span>
            )}
            {isAnimating ? (
              <Pause className="h-4 w-4 relative z-10" />
            ) : (
              <Play className="h-4 w-4 relative z-10" />
            )}
            <span className="relative z-10 hidden sm:inline">
              {isAnimating ? 'Pause' : 'Animate'}
            </span>
          </button>

          {/* Speed Control */}
          <div className="flex items-center gap-1 bg-gray-800/80 border border-cyan-500/30 px-2 py-1.5 rounded-lg">
            <Gauge className="h-3 w-3 text-cyan-400" />
            <select
              value={playbackSpeed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-transparent text-cyan-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded cursor-pointer"
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

        {/* Expand Button - Right Side */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors flex-shrink-0 group"
        >
          <Info className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
          ) : (
            <ChevronDown className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
          )}
        </button>
      </div>

      {/* Expanded Details - Collapsible */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-cyan-500/20">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-cyan-300/70 mb-1">
                <Clock className="h-3 w-3" />
                Duration
              </div>
              <div className="text-lg font-bold text-cyan-50">
                {duration != null ? `${duration.toFixed(2)} min` : 'N/A'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-cyan-300/70 mb-1">
                <MapPin className="h-3 w-3" />
                Distance
              </div>
              <div className="text-lg font-bold text-cyan-50">{distance} mi</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-cyan-300/70 mb-1">
                <Gauge className="h-3 w-3" />
                Avg Speed
              </div>
              <div className="text-lg font-bold text-cyan-50">{avgSpeed}</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-cyan-300/70 mb-1">
                <DollarSign className="h-3 w-3" />
                Est. Cost
              </div>
              <div className="text-lg font-bold text-cyan-50">
                {estimatedCost != null ? `$${estimatedCost.toLocaleString()}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Search Context - Closest Approach */}
          {searchContext?.lat && searchContext?.lng && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-300">Closest Approach to Search Location</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {searchContext.closestDistance !== undefined && (
                  <div>
                    <div className="text-xs text-emerald-300/70">Distance</div>
                    <div className="font-semibold text-emerald-100">
                      {searchContext.closestDistance * 0.000621371 < 0.5
                        ? `${Math.round(searchContext.closestDistance * 3.28084)} ft`
                        : `${(searchContext.closestDistance * 0.000621371).toFixed(2)} mi`}
                    </div>
                  </div>
                )}

                {searchContext.closestSpeed !== undefined && (
                  <div>
                    <div className="text-xs text-emerald-300/70">Speed</div>
                    <div className="font-semibold text-emerald-100">
                      {Math.round(searchContext.closestSpeed * 1.15078)} mph
                    </div>
                  </div>
                )}

                {(searchContext.closestAltitudeAGL || searchContext.closestAltitude) && (
                  <div>
                    <div className="text-xs text-emerald-300/70">Altitude</div>
                    <div className="font-semibold text-emerald-100">
                      {searchContext.closestAltitudeAGL
                        ? `${searchContext.closestAltitudeAGL.toLocaleString()} ft AGL`
                        : `${searchContext.closestAltitude?.toLocaleString()} ft`}
                    </div>
                  </div>
                )}

                {searchContext.closestBearing !== undefined && (
                  <div>
                    <div className="text-xs text-emerald-300/70">Heading</div>
                    <div className="font-semibold text-emerald-100">
                      {Math.round(searchContext.closestBearing)}°
                    </div>
                  </div>
                )}
              </div>

              {searchContext.closestTime && (
                <div className="mt-2 text-xs text-emerald-300/80">
                  Time: {searchContext.closestTime}
                  {searchContext.isHovering && searchContext.hoverDuration && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500/20 border border-red-500/50 text-red-300 rounded text-xs">
                      Hovering {searchContext.hoverDuration}s
                    </span>
                  )}
                </div>
              )}

              {searchContext.radius && searchContext.totalTimeInRadius !== undefined && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 text-xs text-emerald-300/80">
                  <span className="font-semibold">Total time in {searchContext.radius}m radius:</span> {searchContext.totalTimeInRadius.toFixed(1)}s
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
