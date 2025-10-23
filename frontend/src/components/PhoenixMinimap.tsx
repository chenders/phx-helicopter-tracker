/**
 * Phoenix Area Minimap Component
 *
 * Division-inspired holographic minimap showing Phoenix metro area overview.
 * Displays flight path trace, current camera view, and navigation controls.
 *
 * Features:
 * - Phoenix metro district boundaries
 * - Flight path trace on minimap
 * - Camera view frustum indicator
 * - Click-to-navigate functionality
 * - Holographic corner accents and scanlines
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { HolographicColors } from '../utils/holographicMaterials';

interface PhoenixMinimapProps {
  viewer?: any;  // Cesium.Viewer
  flightPath: Array<{ latitude: number; longitude: number }>;
  currentPosition?: { latitude: number; longitude: number };
  className?: string;
  size?: number;  // Width/height in pixels
  onClick?: (latitude: number, longitude: number) => void;
}

// Phoenix metro area bounds
const PHOENIX_BOUNDS = {
  north: 33.9,   // North Phoenix / Anthem
  south: 33.25,  // South Mountain
  east: -111.65, // East Valley (Scottsdale/Mesa)
  west: -112.45, // West Valley (Goodyear/Buckeye)
};

// Phoenix districts for visual reference
const PHOENIX_DISTRICTS = [
  { name: 'Downtown', center: { lat: 33.4484, lng: -112.0740 }, color: 'cyan' },
  { name: 'Scottsdale', center: { lat: 33.4942, lng: -111.9261 }, color: 'green' },
  { name: 'Tempe', center: { lat: 33.4255, lng: -111.9400 }, color: 'green' },
  { name: 'Mesa', center: { lat: 33.4152, lng: -111.8315 }, color: 'green' },
  { name: 'Glendale', center: { lat: 33.5387, lng: -112.1860 }, color: 'green' },
  { name: 'Deer Valley Airport', center: { lat: 33.6883, lng: -112.0833 }, color: 'amber' },
];

// Major highways for reference
const HIGHWAYS = [
  // I-10 (east-west through downtown)
  { from: { lat: 33.45, lng: -112.45 }, to: { lat: 33.45, lng: -111.65 } },
  // I-17 (north-south)
  { from: { lat: 33.9, lng: -112.07 }, to: { lat: 33.4, lng: -112.07 } },
  // Loop 101 (approximate)
  { from: { lat: 33.6, lng: -112.3 }, to: { lat: 33.3, lng: -111.7 } },
];

/**
 * Convert lat/lng to minimap pixel coordinates
 */
function latLngToPixel(
  lat: number,
  lng: number,
  bounds: typeof PHOENIX_BOUNDS,
  size: number
): { x: number; y: number } {
  const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * size;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * size;
  return { x, y };
}

/**
 * Convert minimap pixel coordinates to lat/lng
 */
function pixelToLatLng(
  x: number,
  y: number,
  bounds: typeof PHOENIX_BOUNDS,
  size: number
): { latitude: number; longitude: number } {
  const lng = bounds.west + (x / size) * (bounds.east - bounds.west);
  const lat = bounds.north - (y / size) * (bounds.north - bounds.south);
  return { latitude: lat, longitude: lng };
}

/**
 * Get camera view frustum corners in lat/lng
 */
function getCameraFrustum(viewer: any): Array<{ latitude: number; longitude: number }> | null {
  if (!viewer || !window.Cesium) return null;

  const Cesium = window.Cesium;
  const canvas = viewer.canvas;
  const ellipsoid = viewer.scene.globe.ellipsoid;

  // Get corners of the canvas
  const corners = [
    new Cesium.Cartesian2(0, 0),                           // Top-left
    new Cesium.Cartesian2(canvas.clientWidth, 0),          // Top-right
    new Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight), // Bottom-right
    new Cesium.Cartesian2(0, canvas.clientHeight),         // Bottom-left
  ];

  const frustumCorners: Array<{ latitude: number; longitude: number }> = [];

  for (const corner of corners) {
    const ray = viewer.camera.getPickRay(corner);
    if (!ray) continue;

    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!cartesian) continue;

    const cartographic = ellipsoid.cartesianToCartographic(cartesian);
    frustumCorners.push({
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
    });
  }

  return frustumCorners.length === 4 ? frustumCorners : null;
}

/**
 * PhoenixMinimap Component
 */
export const PhoenixMinimap: React.FC<PhoenixMinimapProps> = ({
  viewer,
  flightPath,
  currentPosition,
  className = '',
  size = 200,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraFrustum, setCameraFrustum] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Colors
  const colors = useMemo(() => ({
    cyan: `rgb(${HolographicColors.FLIGHT_PATH.r * 255}, ${HolographicColors.FLIGHT_PATH.g * 255}, ${HolographicColors.FLIGHT_PATH.b * 255})`,
    green: `rgb(${HolographicColors.LOCATION_PRIMARY.r * 255}, ${HolographicColors.LOCATION_PRIMARY.g * 255}, ${HolographicColors.LOCATION_PRIMARY.b * 255})`,
    amber: `rgb(${HolographicColors.WARNING.r * 255}, ${HolographicColors.WARNING.g * 255}, ${HolographicColors.WARNING.b * 255})`,
    red: `rgb(${HolographicColors.CRITICAL_ALERT.r * 255}, ${HolographicColors.CRITICAL_ALERT.g * 255}, ${HolographicColors.CRITICAL_ALERT.b * 255})`,
    blue: `rgb(${HolographicColors.BACKGROUND_INFO.r * 255}, ${HolographicColors.BACKGROUND_INFO.g * 255}, ${HolographicColors.BACKGROUND_INFO.b * 255})`,
  }), []);

  // Update camera frustum when viewer camera moves
  useEffect(() => {
    if (!viewer) return;

    const updateFrustum = () => {
      const frustum = getCameraFrustum(viewer);
      setCameraFrustum(frustum);
    };

    // Initial update
    updateFrustum();

    // Listen for camera changes
    const removeListener = viewer.camera.moveEnd.addEventListener(updateFrustum);

    return () => {
      if (removeListener) removeListener();
    };
  }, [viewer]);

  // Draw minimap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution (2x for retina displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Background with slight transparency
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, size, size);

    // Draw district markers
    PHOENIX_DISTRICTS.forEach(district => {
      const pos = latLngToPixel(district.center.lat, district.center.lng, PHOENIX_BOUNDS, size);

      // District dot
      ctx.fillStyle = district.color === 'cyan' ? colors.cyan :
                      district.color === 'amber' ? colors.amber : colors.green;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // District label (smaller text)
      ctx.fillStyle = colors.green;
      ctx.font = '8px monospace';
      ctx.globalAlpha = 0.5;
      ctx.fillText(district.name, pos.x + 5, pos.y + 3);
      ctx.globalAlpha = 1.0;
    });

    // Draw highways
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    HIGHWAYS.forEach(highway => {
      const from = latLngToPixel(highway.from.lat, highway.from.lng, PHOENIX_BOUNDS, size);
      const to = latLngToPixel(highway.to.lat, highway.to.lng, PHOENIX_BOUNDS, size);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    // Draw flight path
    if (flightPath.length > 1) {
      ctx.strokeStyle = colors.cyan;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();

      const firstPoint = latLngToPixel(flightPath[0].latitude, flightPath[0].longitude, PHOENIX_BOUNDS, size);
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < flightPath.length; i++) {
        const point = latLngToPixel(flightPath[i].latitude, flightPath[i].longitude, PHOENIX_BOUNDS, size);
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Draw camera frustum
    if (cameraFrustum && cameraFrustum.length === 4) {
      ctx.strokeStyle = colors.amber;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();

      const first = latLngToPixel(cameraFrustum[0].latitude, cameraFrustum[0].longitude, PHOENIX_BOUNDS, size);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < cameraFrustum.length; i++) {
        const point = latLngToPixel(cameraFrustum[i].latitude, cameraFrustum[i].longitude, PHOENIX_BOUNDS, size);
        ctx.lineTo(point.x, point.y);
      }

      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;
    }

    // Draw current position
    if (currentPosition) {
      const pos = latLngToPixel(currentPosition.latitude, currentPosition.longitude, PHOENIX_BOUNDS, size);

      // Pulsing outer circle
      ctx.strokeStyle = colors.red;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = colors.red;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Border with holographic glow
    ctx.strokeStyle = isHovered ? colors.cyan : colors.green;
    ctx.lineWidth = 2;
    ctx.globalAlpha = isHovered ? 1.0 : 0.6;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.globalAlpha = 1.0;

    // Corner accents (Division-style)
    const accentSize = 8;
    const accentColor = isHovered ? colors.cyan : colors.green;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(0, accentSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(accentSize, 0);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(size - accentSize, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(size, accentSize);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(size, size - accentSize);
    ctx.lineTo(size, size);
    ctx.lineTo(size - accentSize, size);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(accentSize, size);
    ctx.lineTo(0, size);
    ctx.lineTo(0, size - accentSize);
    ctx.stroke();

  }, [flightPath, currentPosition, cameraFrustum, size, colors, isHovered]);

  // Handle click to navigate
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const { latitude, longitude } = pixelToLatLng(x, y, PHOENIX_BOUNDS, size);
    onClick(latitude, longitude);
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`cursor-pointer transition-all ${isHovered ? 'brightness-110' : ''}`}
        onClick={handleClick}
      />

      {/* Scanline effect overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            rgba(0, 255, 136, 0.03) 0px,
            transparent 1px,
            transparent 2px,
            rgba(0, 255, 136, 0.03) 3px
          )`,
          animation: 'scanline 8s linear infinite',
        }}
      />

      {/* Title label */}
      <div
        className="absolute top-1 left-1 text-[10px] font-mono uppercase tracking-wider px-1"
        style={{
          color: colors.green,
          textShadow: `0 0 8px ${colors.green}`,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      >
        Phoenix Metro
      </div>

      {/* Zoom indicator (based on camera frustum size) */}
      {cameraFrustum && (
        <div
          className="absolute bottom-1 right-1 text-[9px] font-mono px-1"
          style={{
            color: colors.amber,
            textShadow: `0 0 6px ${colors.amber}`,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          VIEW
        </div>
      )}

      {/* Inline animation styles */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
};

export default PhoenixMinimap;
