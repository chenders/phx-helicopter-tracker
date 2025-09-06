import React from 'react';

interface HelicopterIconProps {
  size?: number;
  color?: string;
  rotation?: number; // Heading in degrees
  className?: string;
}

const HelicopterIcon: React.FC<HelicopterIconProps> = ({ 
  size = 32, 
  color = '#FF0000', 
  rotation = 0,
  className = ''
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        transition: 'transform 0.3s ease'
      }}
    >
      {/* Helicopter viewed from above */}
      <g transform="translate(16, 16)">
        {/* Main rotor blades (animated) */}
        <g className="rotor-animation">
          <line 
            x1="-14" y1="0" x2="14" y2="0" 
            stroke={color} 
            strokeWidth="1" 
            strokeLinecap="round" 
            opacity="0.4"
          />
          <line 
            x1="0" y1="-14" x2="0" y2="14" 
            stroke={color} 
            strokeWidth="1" 
            strokeLinecap="round" 
            opacity="0.4"
          />
        </g>
        
        {/* Fuselage shadow */}
        <ellipse 
          cx="1" cy="1" rx="6" ry="8" 
          fill="rgba(0,0,0,0.2)"
        />
        
        {/* Main fuselage */}
        <ellipse 
          cx="0" cy="0" rx="6" ry="8" 
          fill={color}
        />
        
        {/* Cockpit window */}
        <ellipse 
          cx="0" cy="-3" rx="4" ry="3" 
          fill="rgba(255,255,255,0.3)"
        />
        <ellipse 
          cx="0" cy="-3" rx="3" ry="2" 
          fill="rgba(0,0,0,0.2)"
        />
        
        {/* Tail boom */}
        <rect 
          x="-2" y="6" width="4" height="10" 
          fill={color}
        />
        
        {/* Tail fin */}
        <path 
          d="M -2 14 L 2 14 L 1 16 L -1 16 Z" 
          fill={color}
        />
        
        {/* Tail rotor */}
        <circle cx="0" cy="14" r="1" fill={color}/>
        <line 
          x1="-4" y1="14" x2="4" y2="14" 
          stroke={color} 
          strokeWidth="0.8" 
          strokeLinecap="round"
        />
        
        {/* Landing skids */}
        <rect x="-7" y="3" width="1.5" height="5" rx="0.5" fill={color}/>
        <rect x="5.5" y="3" width="1.5" height="5" rx="0.5" fill={color}/>
        <rect x="-8" y="7" width="16" height="1" rx="0.5" fill={color}/>
        
        {/* Rotor hub */}
        <circle cx="0" cy="0" r="1" fill="rgba(0,0,0,0.3)"/>
      </g>
      
      <style>{`
        @keyframes rotor-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rotor-animation {
          animation: rotor-spin 0.1s linear infinite;
          transform-origin: center;
        }
      `}</style>
    </svg>
  );
};

export default HelicopterIcon;