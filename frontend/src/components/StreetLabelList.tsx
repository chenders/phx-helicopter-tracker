/**
 * Street Label List Component
 *
 * 2D list showing nearby streets and areas based on camera/helicopter position
 * Replaces 3D floating labels with a clean sidebar interface
 */

import React, { useState } from 'react';

interface StreetLabel {
  name: string;
  tier: number;
  distance: number; // miles
  type?: 'area' | 'street' | 'highway' | 'landmark';
  alwaysShow?: boolean;
}

interface StreetLabelListProps {
  labels: StreetLabel[];
  className?: string;
}

export const StreetLabelList: React.FC<StreetLabelListProps> = ({ labels, className = '' }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Group labels by tier
  const areas = labels.filter(l => l.tier === 0 || l.alwaysShow);
  const streets = labels.filter(l => l.tier >= 1 && !l.alwaysShow);

  // Colors based on tier
  const getTierColor = (tier: number) => {
    if (tier === 0) return '#00FF88'; // Green for areas
    if (tier === 1) return '#FFAA00'; // Amber for highways
    if (tier === 2) return '#00D4FF'; // Cyan for major streets
    return '#88DDFF'; // Light cyan for minor streets
  };

  const getTierLabel = (tier: number, type?: string) => {
    if (tier === 0) return type === 'area' ? 'AREA' : 'DISTRICT';
    if (tier === 1) return 'HIGHWAY';
    if (tier === 2) return 'MAJOR ST';
    return 'STREET';
  };

  return (
    // Outer reserves the flex space (keeps the minimap pinned at the bottom) but
    // is transparent + click-through; the card inside shrinks to its content so
    // collapsing it leaves the minimap where it is. max-h-full caps the card to
    // the available space so a long list scrolls instead of reaching the minimap.
    <div className={`w-64 flex flex-col min-h-0 pointer-events-none ${className}`}>
      <div
        className="bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg overflow-hidden w-64 flex flex-col max-h-full pointer-events-auto"
        style={{
          boxShadow: `0 0 15px rgba(0, 212, 255, 0.2)`,
        }}
      >
        {/* Header */}
        <div
          className={`px-3 py-2 flex items-center justify-between gap-2 shrink-0 ${
            collapsed ? '' : 'border-b border-cyan-400/30'
          }`}
        >
          <div className="text-xs text-cyan-300 uppercase tracking-wider font-bold">
            Nearby Locations
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand nearby locations' : 'Minimize nearby locations'}
            title={collapsed ? 'Expand' : 'Minimize'}
            className="-mr-1 p-0.5 rounded text-cyan-300/80 hover:text-cyan-100 hover:bg-cyan-400/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="7" x2="11" y2="7" />
              {/* The vertical stroke turns the minus into a plus when collapsed */}
              {collapsed && <line x1="7" y1="3" x2="7" y2="11" />}
            </svg>
          </button>
        </div>

        {/* Collapsible region — grid-rows 1fr→0fr animates to the true content
            height without measuring pixels. It flex-shrinks (no flex-grow) so it
            fits the capped card and the inner list scrolls when content overflows. */}
        <div
          className={`grid min-h-0 transition-[grid-template-rows] duration-300 ease-out ${
            collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden flex flex-col">
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-400/30 scrollbar-track-transparent">
          {/* Areas */}
          {areas.length > 0 && (
            <div className="px-3 py-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Areas</div>
              {areas.map((label, idx) => (
                <div
                  key={`area-${idx}`}
                  className="mb-1.5 pb-1.5 border-b border-cyan-400/10 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: getTierColor(label.tier),
                          boxShadow: `0 0 6px ${getTierColor(label.tier)}`,
                        }}
                      />
                      <span
                        className="text-sm font-semibold truncate"
                        style={{
                          color: getTierColor(label.tier),
                          textShadow: `0 0 4px ${getTierColor(label.tier)}40`,
                        }}
                      >
                        {label.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {label.distance.toFixed(1)}mi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Streets */}
          {streets.length > 0 && (
            <div className="px-3 py-2 border-t border-cyan-400/20">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Streets</div>
              {streets.slice(0, 15).map((label, idx) => (
                <div
                  key={`street-${idx}`}
                  className="mb-1.5 pb-1.5 border-b border-cyan-400/10 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="px-1.5 py-0.5 text-[9px] font-bold rounded flex-shrink-0"
                        style={{
                          backgroundColor: `${getTierColor(label.tier)}20`,
                          color: getTierColor(label.tier),
                          border: `1px solid ${getTierColor(label.tier)}40`,
                        }}
                      >
                        {getTierLabel(label.tier, label.type)}
                      </div>
                      <span
                        className="text-xs truncate"
                        style={{
                          color: getTierColor(label.tier),
                        }}
                      >
                        {label.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {label.distance.toFixed(1)}mi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {labels.length === 0 && (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">
              No nearby locations
            </div>
          )}
        </div>

        {/* Footer accent */}
        <div
          className="h-0.5 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)`,
          }}
        />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreetLabelList;
