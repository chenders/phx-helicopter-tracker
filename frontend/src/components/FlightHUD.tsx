/**
 * Flight HUD Component
 *
 * Division-inspired holographic heads-up display showing flight metrics
 * without obstructing the visual field.
 *
 * Features:
 * - Positioned in top 20% of screen
 * - Semi-transparent with holographic effects
 * - Scanline animations
 * - Progressive reveal on data changes
 * - Semantic color coding
 */

import React, { useEffect, useState, useRef } from 'react';
import { HolographicColors } from '../utils/holographicMaterials';

export interface FlightHUDData {
  speed: number;                    // knots
  altitude: number;                 // feet MSL
  heading: number;                  // degrees
  groundElevation: number;          // feet MSL
  altitudeAGL: number;              // feet AGL
  distanceFromSearch?: number;      // miles (optional)
  timeRemaining?: number;           // seconds (optional)
  timeToSearchRadius?: number;      // seconds (optional)
  isWithinSearchRadius?: boolean;
  timestamp?: string;               // ISO timestamp
}

interface FlightHUDProps {
  data: FlightHUDData;
  showSearchInfo?: boolean;
  className?: string;
}

/**
 * Convert heading degrees to cardinal direction
 */
function getCardinalDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Format timestamp to readable time
 */
function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return '--:--:--';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '--:--:--';
  }
}

/**
 * Metric display component with progressive reveal
 */
interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  animate?: boolean;
}

const Metric: React.FC<MetricProps> = ({ label, value, unit, color = '#00D4FF', animate = true }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isChanging, setIsChanging] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (animate && prevValueRef.current !== value) {
      setIsChanging(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsChanging(false);
      }, 100);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate]);

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-semibold">
        {label}
      </div>
      <div
        className={`text-2xl font-mono font-bold tabular-nums transition-all duration-200 ${isChanging ? 'scale-110 brightness-150' : ''}`}
        style={{ color, textShadow: `0 0 10px ${color}, 0 0 20px ${color}40` }}
      >
        {displayValue}
        {unit && <span className="text-sm ml-1 opacity-80">{unit}</span>}
      </div>
    </div>
  );
};

/**
 * FlightHUD Component
 */
export const FlightHUD: React.FC<FlightHUDProps> = ({
  data,
  showSearchInfo = false,
  className = ''
}) => {
  const hudRef = useRef<HTMLDivElement>(null);

  // Convert colors to CSS hex
  const colors = {
    cyan: `rgb(${HolographicColors.FLIGHT_PATH.r * 255}, ${HolographicColors.FLIGHT_PATH.g * 255}, ${HolographicColors.FLIGHT_PATH.b * 255})`, // #00D4FF
    green: `rgb(${HolographicColors.LOCATION_PRIMARY.r * 255}, ${HolographicColors.LOCATION_PRIMARY.g * 255}, ${HolographicColors.LOCATION_PRIMARY.b * 255})`, // #00FF88
    amber: `rgb(${HolographicColors.WARNING.r * 255}, ${HolographicColors.WARNING.g * 255}, ${HolographicColors.WARNING.b * 255})`, // #FFAA00
    red: `rgb(${HolographicColors.CRITICAL_ALERT.r * 255}, ${HolographicColors.CRITICAL_ALERT.g * 255}, ${HolographicColors.CRITICAL_ALERT.b * 255})`, // #FF4466
  };

  return (
    <div
      ref={hudRef}
      className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none ${className}`}
    >
      {/* Main HUD Container */}
      <div
        className="relative bg-black/40 backdrop-blur-md border border-cyan-400/30 rounded-lg overflow-hidden"
        style={{
          boxShadow: `0 0 20px ${colors.cyan}40, inset 0 0 20px ${colors.cyan}10`,
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.1) 2px, rgba(0, 212, 255, 0.1) 4px)',
            animation: 'scanline 8s linear infinite',
          }}
        />

        {/* Corner accents (Division-style) */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60" />

        {/* Content */}
        <div className="relative px-6 py-4">
          {/* Top row: Time and Status */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-400/20">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: colors.green, boxShadow: `0 0 8px ${colors.green}` }}
              />
              <span className="text-xs text-cyan-300 uppercase tracking-wider font-semibold">
                FLIGHT REPLAY
              </span>
            </div>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: colors.cyan }}
            >
              {formatTimestamp(data.timestamp)}
            </div>
          </div>

          {/* Main metrics grid */}
          <div className="grid grid-cols-4 gap-6">
            {/* Speed */}
            <Metric
              label="SPEED"
              value={Math.round(data.speed)}
              unit="KTS"
              color={colors.cyan}
            />

            {/* Altitude MSL */}
            <Metric
              label="ALTITUDE"
              value={Math.round(data.altitude).toLocaleString()}
              unit="FT"
              color={colors.cyan}
            />

            {/* Heading */}
            <Metric
              label="HEADING"
              value={`${Math.round(data.heading)}° ${getCardinalDirection(data.heading)}`}
              color={colors.cyan}
            />

            {/* Altitude AGL */}
            <Metric
              label="AGL"
              value={Math.round(data.altitudeAGL).toLocaleString()}
              unit="FT"
              color={data.altitudeAGL < 400 ? colors.amber : colors.green}
            />
          </div>

          {/* Search radius info (if applicable) */}
          {showSearchInfo && data.distanceFromSearch !== undefined && (
            <div className="mt-4 pt-3 border-t border-cyan-400/20">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 uppercase tracking-wider mr-2">Distance to Search:</span>
                  <span
                    className="font-mono font-bold"
                    style={{
                      color: data.isWithinSearchRadius ? colors.red : colors.amber,
                      textShadow: data.isWithinSearchRadius ? `0 0 8px ${colors.red}` : 'none'
                    }}
                  >
                    {data.distanceFromSearch.toFixed(2)} mi
                  </span>
                </div>
                {data.isWithinSearchRadius && data.timeRemaining !== undefined && (
                  <div>
                    <span className="text-gray-400 uppercase tracking-wider mr-2">Time in Radius:</span>
                    <span
                      className="font-mono font-bold animate-pulse"
                      style={{ color: colors.red, textShadow: `0 0 8px ${colors.red}` }}
                    >
                      {Math.floor(data.timeRemaining / 60)}:{String(Math.floor(data.timeRemaining % 60)).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ground elevation info */}
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500 font-mono">
              Ground Elev: {Math.round(data.groundElevation).toLocaleString()} ft
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.cyan}60, transparent)`,
            boxShadow: `0 0 10px ${colors.cyan}60`,
          }}
        />
      </div>
    </div>
  );
};

// Add scanline animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes scanline {
      0% { transform: translateY(0); }
      100% { transform: translateY(100%); }
    }
  `;
  if (!document.head.querySelector('style[data-scanline]')) {
    style.setAttribute('data-scanline', 'true');
    document.head.appendChild(style);
  }
}

export default FlightHUD;
