/**
 * Flight HUD Component
 *
 * Compact, draggable heads-up display showing essential flight metrics
 *
 * Features:
 * - Compact design (3 metrics only)
 * - Draggable positioning
 * - Semi-transparent with holographic effects
 * - Progressive reveal on data changes
 */

import React, { useEffect, useState, useRef } from 'react';
import { HolographicColors } from '../utils/holographicMaterials';

export interface FlightHUDData {
  speed: number;                    // mph
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
 * Compact metric display component
 */
interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  animate?: boolean;
}

const Metric: React.FC<MetricProps> = ({ label, value, unit, color = '#00D4FF', animate = true }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-300 uppercase tracking-widest mb-1 font-bold">
        {label}
      </div>
      <div
        className="text-2xl font-mono font-bold tabular-nums"
        style={{ color, textShadow: `0 0 8px ${color}, 0 0 15px ${color}40` }}
      >
        {value}
        {unit && <span className="text-sm ml-1 opacity-80">{unit}</span>}
      </div>
    </div>
  );
};

/**
 * FlightHUD Component - Compact & Draggable
 */
export const FlightHUD: React.FC<FlightHUDProps> = ({
  data,
  showSearchInfo = false,
  className = ''
}) => {
  const hudRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number | null; y: number }>({ x: null, y: 16 }); // null = centered
  const dragOffset = useRef({ x: 0, y: 0 });

  // Convert colors to CSS hex
  const colors = {
    cyan: `rgb(${HolographicColors.FLIGHT_PATH.r * 255}, ${HolographicColors.FLIGHT_PATH.g * 255}, ${HolographicColors.FLIGHT_PATH.b * 255})`, // #00D4FF
    green: `rgb(${HolographicColors.LOCATION_PRIMARY.r * 255}, ${HolographicColors.LOCATION_PRIMARY.g * 255}, ${HolographicColors.LOCATION_PRIMARY.b * 255})`, // #00FF88
    amber: `rgb(${HolographicColors.WARNING.r * 255}, ${HolographicColors.WARNING.g * 255}, ${HolographicColors.WARNING.b * 255})`, // #FFAA00
    red: `rgb(${HolographicColors.CRITICAL_ALERT.r * 255}, ${HolographicColors.CRITICAL_ALERT.g * 255}, ${HolographicColors.CRITICAL_ALERT.b * 255})`, // #FF4466
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hudRef.current) return;

    // Get the actual rendered position on screen
    const rect = hudRef.current.getBoundingClientRect();

    // Calculate offset from where the mouse clicked within the element
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // If currently centered, immediately set to absolute position at current location
    // This prevents the jump when transitioning from centered to dragging
    if (position.x === null) {
      setPosition({
        x: rect.left,
        y: rect.top
      });
    }

    setIsDragging(true);
    e.preventDefault();
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={hudRef}
      className={`absolute z-40 ${className}`}
      style={{
        left: position.x === null ? '50%' : `${position.x}px`,
        top: `${position.y}px`,
        transform: position.x === null ? 'translateX(-50%)' : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Compact HUD Container */}
      <div
        className="relative bg-black/50 backdrop-blur-sm border border-cyan-400/30 rounded overflow-hidden w-[500px]"
        style={{
          boxShadow: `0 0 15px ${colors.cyan}30, inset 0 0 15px ${colors.cyan}08`,
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.1) 2px, rgba(0, 212, 255, 0.1) 4px)',
            animation: 'scanline 8s linear infinite',
          }}
        />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/60" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/60" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/60" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/60" />

        {/* Content */}
        <div className="relative px-3 py-2">
          {/* Timestamp header */}
          {data.timestamp && (
            <div className="mb-2 pb-2 border-b border-cyan-400/20 text-center">
              <div className="text-xs text-cyan-300/80 uppercase tracking-wider font-bold">
                {new Date(data.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          )}

          {/* Compact metrics - 3 columns only */}
          <div className="grid grid-cols-3 gap-3">
            {/* Speed */}
            <Metric
              label="SPEED"
              value={Math.round(data.speed)}
              unit="MPH"
              color={colors.cyan}
            />

            {/* Altitude AGL (renamed from "AGL" to "ALTITUDE") */}
            <Metric
              label="ALTITUDE"
              value={Math.round(data.altitudeAGL).toLocaleString()}
              unit="FT"
              color={data.altitudeAGL < 400 ? colors.amber : colors.green}
            />

            {/* Heading */}
            <Metric
              label="HEADING"
              value={`${Math.round(data.heading)}° ${getCardinalDirection(data.heading)}`}
              color={colors.cyan}
            />
          </div>

          {/* Search radius info (if applicable) */}
          {showSearchInfo && data.distanceFromSearch !== undefined && (
            <div className="mt-3 pt-3 border-t border-cyan-400/20">
              <div className="flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 uppercase tracking-wider font-bold">Search:</span>
                  <span
                    className="font-mono font-bold text-base"
                    style={{
                      color: data.isWithinSearchRadius ? colors.red : colors.amber,
                      textShadow: data.isWithinSearchRadius ? `0 0 6px ${colors.red}` : 'none'
                    }}
                  >
                    {data.distanceFromSearch.toFixed(2)} mi
                  </span>
                </div>
                {data.isWithinSearchRadius && data.timeRemaining !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 uppercase tracking-wider font-bold">Time:</span>
                    <span
                      className="font-mono font-bold text-base animate-pulse"
                      style={{ color: colors.red, textShadow: `0 0 6px ${colors.red}` }}
                    >
                      {Math.floor(data.timeRemaining / 60)}:{String(Math.floor(data.timeRemaining % 60)).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom accent line */}
        <div
          className="h-0.5 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.cyan}50, transparent)`,
            boxShadow: `0 0 8px ${colors.cyan}50`,
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
