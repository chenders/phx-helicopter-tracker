import React from 'react';
import HelicopterIcon from './HelicopterIcon';

interface HelicopterMarkerProps {
  registration: string;
  heading?: number;
  color?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

const HelicopterMarker: React.FC<HelicopterMarkerProps> = ({ 
  registration, 
  heading = 0, 
  color = '#FF0000',
  onClick,
  isSelected = false
}) => {
  return (
    <div 
      className="helicopter-marker"
      onClick={onClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 1000 : 100
      }}
    >
      {/* Registration label with arrow */}
      <div 
        style={{
          position: 'absolute',
          top: '-35px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1001
        }}
      >
        {registration}
        {/* Arrow pointing down */}
        <div 
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid white',
          }}
        />
        <div 
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #333',
            zIndex: -1
          }}
        />
      </div>
      
      {/* Helicopter icon */}
      <div style={{
        filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,0,0,0.8))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      }}>
        <HelicopterIcon 
          size={32} 
          color={color} 
          rotation={heading}
        />
      </div>
      
      {/* Selection ring */}
      {isSelected && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            border: '2px solid #FF0000',
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite',
            pointerEvents: 'none'
          }}
        />
      )}
      
      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default HelicopterMarker;