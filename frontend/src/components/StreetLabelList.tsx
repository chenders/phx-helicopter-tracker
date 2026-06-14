/**
 * Street Label List Component
 *
 * 2D list showing nearby streets and areas based on camera/helicopter position
 * Replaces 3D floating labels with a clean sidebar interface
 */

import React from 'react';

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
    <div className={`absolute right-4 top-20 z-30 ${className}`} style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <div
        className="bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg overflow-hidden w-64"
        style={{
          boxShadow: `0 0 15px rgba(0, 212, 255, 0.2)`,
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-cyan-400/30">
          <div className="text-xs text-cyan-300 uppercase tracking-wider font-bold">
            Nearby Locations
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-400/30 scrollbar-track-transparent">
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
  );
};

export default StreetLabelList;
