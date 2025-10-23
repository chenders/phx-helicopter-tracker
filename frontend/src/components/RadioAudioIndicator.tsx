/**
 * Radio Audio Indicator Component
 *
 * Division-inspired holographic indicator for available police radio audio during flight playback.
 *
 * Features:
 * - Holographic waveform visualization
 * - Pulsing animation synchronized with timeline
 * - Click-to-play audio functionality
 * - Transcription overlay on hover
 * - Semantic color coding (amber for radio)
 */

import React, { useState, useRef, useEffect } from 'react';
import { HolographicColors } from '../utils/holographicMaterials';

export interface RadioArchiveData {
  id: number;
  filename: string;
  recording_start: string;  // ISO timestamp
  recording_end: string;    // ISO timestamp
  duration_seconds: number;
  has_transcription: boolean;
  transcription?: {
    id: number;
    model_name: string;
    full_text_preview: string;
    language: string;
    confidence_score: number | null;
    entities_extracted: boolean;
  };
}

interface RadioAudioIndicatorProps {
  archives: RadioArchiveData[];
  currentTimestamp?: string;  // Current playback timestamp (ISO)
  isPlaying?: boolean;
  onPlayAudio?: (filename: string, timestamp: string) => void;
  className?: string;
}

/**
 * Check if current timestamp is within an archive's time range
 */
function isArchiveActive(archive: RadioArchiveData, currentTimestamp: string | undefined): boolean {
  if (!currentTimestamp) return false;

  try {
    const current = new Date(currentTimestamp).getTime();
    const start = new Date(archive.recording_start).getTime();
    const end = new Date(archive.recording_end).getTime();

    return current >= start && current <= end;
  } catch {
    return false;
  }
}

/**
 * Format time duration
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format timestamp to readable time
 */
function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
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
 * Holographic Waveform SVG Component
 */
const HolographicWaveform: React.FC<{
  isActive: boolean;
  isPulsing: boolean;
  color: string;
}> = ({ isActive, isPulsing, color }) => {
  return (
    <svg
      width="32"
      height="24"
      viewBox="0 0 32 24"
      className={`transition-all duration-300 ${isPulsing ? 'animate-pulse' : ''}`}
      style={{
        filter: isActive ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color})` : 'none'
      }}
    >
      {/* Waveform bars with holographic effect */}
      <rect x="2" y="8" width="2" height="8" fill={color} opacity={isActive ? 1.0 : 0.6} />
      <rect x="6" y="4" width="2" height="16" fill={color} opacity={isActive ? 1.0 : 0.6} />
      <rect x="10" y="10" width="2" height="4" fill={color} opacity={isActive ? 0.9 : 0.5} />
      <rect x="14" y="6" width="2" height="12" fill={color} opacity={isActive ? 1.0 : 0.6} />
      <rect x="18" y="2" width="2" height="20" fill={color} opacity={isActive ? 1.0 : 0.7} />
      <rect x="22" y="8" width="2" height="8" fill={color} opacity={isActive ? 0.9 : 0.5} />
      <rect x="26" y="6" width="2" height="12" fill={color} opacity={isActive ? 1.0 : 0.6} />

      {/* Scanline effect */}
      {isActive && (
        <line
          x1="0"
          y1="12"
          x2="32"
          y2="12"
          stroke={color}
          strokeWidth="1"
          opacity="0.3"
          strokeDasharray="2,2"
          className="animate-pulse"
        />
      )}
    </svg>
  );
};

/**
 * Individual Radio Archive Indicator
 */
const RadioArchiveIndicator: React.FC<{
  archive: RadioArchiveData;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
}> = ({ archive, isActive, isPlaying, onClick }) => {
  const [showTranscription, setShowTranscription] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const colors = {
    amber: `rgb(${HolographicColors.RADIO_AVAILABLE.r * 255}, ${HolographicColors.RADIO_AVAILABLE.g * 255}, ${HolographicColors.RADIO_AVAILABLE.b * 255})`, // #FFAA00
    activeOrange: `rgb(${HolographicColors.RADIO_ACTIVE.r * 255}, ${HolographicColors.RADIO_ACTIVE.g * 255}, ${HolographicColors.RADIO_ACTIVE.b * 255})`, // #FF8000
  };

  const currentColor = isActive ? colors.activeOrange : colors.amber;

  return (
    <div
      ref={indicatorRef}
      className="relative inline-block"
      onMouseEnter={() => setShowTranscription(true)}
      onMouseLeave={() => setShowTranscription(false)}
    >
      {/* Main Indicator Button */}
      <button
        onClick={onClick}
        className="relative flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-sm border rounded-md transition-all duration-200 hover:scale-105"
        style={{
          borderColor: `${currentColor}60`,
          boxShadow: isActive ? `0 0 12px ${currentColor}60, inset 0 0 8px ${currentColor}20` : `0 0 6px ${currentColor}30`,
        }}
      >
        {/* Waveform Icon */}
        <HolographicWaveform
          isActive={isActive}
          isPulsing={isActive && isPlaying}
          color={currentColor}
        />

        {/* Time Info */}
        <div className="flex flex-col items-start text-left min-w-[80px]">
          <span
            className="text-xs font-mono font-bold"
            style={{
              color: currentColor,
              textShadow: isActive ? `0 0 6px ${currentColor}` : 'none'
            }}
          >
            {formatTimestamp(archive.recording_start)}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {formatDuration(archive.duration_seconds)}
          </span>
        </div>

        {/* Active Pulse Indicator */}
        {isActive && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
            style={{
              backgroundColor: colors.activeOrange,
              boxShadow: `0 0 8px ${colors.activeOrange}`
            }}
          />
        )}

        {/* Corner Accents (Division-style) */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l opacity-60" style={{ borderColor: currentColor }} />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r opacity-60" style={{ borderColor: currentColor }} />
      </button>

      {/* Transcription Overlay */}
      {showTranscription && archive.transcription && (
        <div
          className="absolute left-0 mt-2 w-64 p-3 bg-black/90 backdrop-blur-md border rounded-lg z-50 pointer-events-none"
          style={{
            borderColor: `${currentColor}60`,
            boxShadow: `0 0 20px ${currentColor}40, inset 0 0 10px ${currentColor}10`,
            bottom: indicatorRef.current ? `${indicatorRef.current.offsetHeight + 8}px` : '100%',
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 170, 0, 0.1) 2px, rgba(255, 170, 0, 0.1) 4px)',
            }}
          />

          {/* Content */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: currentColor }}>
                Radio Transcription
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {archive.transcription.model_name}
              </span>
            </div>

            <div className="text-xs text-gray-300 leading-relaxed mb-2">
              {archive.transcription.full_text_preview}
            </div>

            {archive.transcription.confidence_score !== null && (
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span>Confidence:</span>
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(archive.transcription.confidence_score || 0) * 100}%`,
                      backgroundColor: currentColor,
                      boxShadow: `0 0 4px ${currentColor}`
                    }}
                  />
                </div>
                <span className="font-mono">
                  {((archive.transcription.confidence_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {archive.transcription.entities_extracted && (
              <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1">
                <span>✓</span>
                <span>Entities Extracted</span>
              </div>
            )}
          </div>

          {/* Arrow pointer */}
          <div
            className="absolute left-4 w-0 h-0"
            style={{
              top: '-6px',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: `6px solid ${currentColor}60`,
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * RadioAudioIndicator Component
 */
export const RadioAudioIndicator: React.FC<RadioAudioIndicatorProps> = ({
  archives,
  currentTimestamp,
  isPlaying = false,
  onPlayAudio,
  className = ''
}) => {
  if (archives.length === 0) {
    return null; // Don't render if no radio archives
  }

  const handlePlayAudio = (filename: string, timestamp: string) => {
    if (onPlayAudio) {
      onPlayAudio(filename, timestamp);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {archives.map((archive) => {
        const isActive = isArchiveActive(archive, currentTimestamp);

        return (
          <RadioArchiveIndicator
            key={archive.id}
            archive={archive}
            isActive={isActive}
            isPlaying={isPlaying}
            onClick={() => handlePlayAudio(archive.filename, archive.recording_start)}
          />
        );
      })}
    </div>
  );
};

export default RadioAudioIndicator;
