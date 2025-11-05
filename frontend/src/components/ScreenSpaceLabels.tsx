/**
 * Screen-Space Label Overlay
 *
 * Displays location labels as a 2D overlay showing nearby streets and landmarks
 * based on camera position. Always shows relevant labels to help viewer understand
 * their location, regardless of camera angle.
 */

import React, { useEffect, useState } from 'react';

interface LabelData {
  name: string;
  tier: number;
  distance: number; // distance from camera in miles
  type: 'area' | 'freeway' | 'street';
}

interface ScreenSpaceLabelsProps {
  viewer: any; // Cesium.Viewer
  labels: Array<{ name: string; lat: number; lng: number; tier: number; isArea?: boolean }>;
  updateInterval?: number; // ms between updates
}

export const ScreenSpaceLabels: React.FC<ScreenSpaceLabelsProps> = ({
  viewer,
  labels,
  updateInterval = 1000 // Update every 1000ms
}) => {
  const [nearbyLabels, setNearbyLabels] = useState<LabelData[]>([]);

  // Helper: Calculate distance between two lat/lng points in miles
  const getDistanceMiles = React.useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  useEffect(() => {
    if (!viewer || !viewer.scene || !labels || labels.length === 0) return;

    const updateLabels = () => {
      try {
        const camera = viewer.camera;
        const ellipsoid = viewer.scene.globe.ellipsoid;

        // Get camera position in cartographic coordinates
        const cameraCartographic = camera.positionCartographic;
        const cameraLat = (window as any).Cesium.Math.toDegrees(cameraCartographic.latitude);
        const cameraLng = (window as any).Cesium.Math.toDegrees(cameraCartographic.longitude);
        const cameraAltFeet = cameraCartographic.height * 3.28084; // Convert meters to feet

        // Determine how many labels and what tiers to show based on altitude
        let maxLabels = 8;
        let maxTier = 5;
        let maxDistanceMiles = 3;

        if (cameraAltFeet > 8000) {
          maxLabels = 3;
          maxTier = 0; // Only show major areas
          maxDistanceMiles = 10;
        } else if (cameraAltFeet > 5000) {
          maxLabels = 4;
          maxTier = 1; // Areas + freeways
          maxDistanceMiles = 6;
        } else if (cameraAltFeet > 3000) {
          maxLabels = 6;
          maxTier = 2; // + major arterials
          maxDistanceMiles = 4;
        } else if (cameraAltFeet > 1500) {
          maxLabels = 8;
          maxTier = 3; // + major streets
          maxDistanceMiles = 3;
        }

        // Filter labels by tier and calculate distances
        const relevantLabels = labels
          .filter(l => l.tier <= maxTier)
          .map(label => {
            const distance = getDistanceMiles(cameraLat, cameraLng, label.lat, label.lng);
            return { ...label, distance };
          })
          .filter(l => l.distance <= maxDistanceMiles)
          .sort((a, b) => {
            // Sort by tier first (lower tier = more important), then by distance
            if (a.tier !== b.tier) return a.tier - b.tier;
            return a.distance - b.distance;
          })
          .slice(0, maxLabels);

        // Convert to LabelData format
        const labelData: LabelData[] = relevantLabels.map(label => {
          let type: 'area' | 'freeway' | 'street' = 'street';
          if (label.isArea || label.tier === 0) type = 'area';
          else if (label.tier === 1) type = 'freeway';

          return {
            name: label.name,
            tier: label.tier,
            distance: label.distance,
            type
          };
        });

        setNearbyLabels(labelData);
      } catch (error) {
        console.warn('Error updating screen-space labels:', error);
      }
    };

    // Initial update
    updateLabels();

    // Update on camera move
    const interval = setInterval(updateLabels, updateInterval);

    return () => clearInterval(interval);
  }, [viewer, labels, updateInterval, getDistanceMiles]);

  const getLabelStyle = (label: LabelData, index: number) => {
    // Simple styling without holographic effects
    let fontSize = '13px';
    let fontWeight: 'normal' | 'bold' = 'normal';
    let opacity = 1.0;

    if (label.type === 'area') {
      fontSize = '16px';
      fontWeight = 'bold';
    } else if (label.type === 'freeway') {
      fontSize = '15px';
      fontWeight = 'bold';
    } else if (label.tier <= 2) {
      fontSize = '14px';
      fontWeight = '600' as any;
    }

    // Fade out labels that are further away (based on index after sorting)
    if (index >= 5) {
      opacity = 0.7;
    }

    return {
      color: '#ffffff',
      fontSize,
      fontWeight,
      opacity,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      padding: '6px 12px',
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      whiteSpace: 'nowrap' as const,
      textShadow: '1px 1px 3px rgba(0, 0, 0, 0.9)',
      marginBottom: '8px'
    };
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '120px',
        left: '20px',
        zIndex: 45,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        maxWidth: '300px'
      }}
    >
      {nearbyLabels.map((label, index) => (
        <div key={`${label.name}-${index}`} style={getLabelStyle(label, index)}>
          {label.name}
          {label.distance > 0.5 && (
            <span style={{
              marginLeft: '8px',
              fontSize: '11px',
              opacity: 0.7
            }}>
              {label.distance.toFixed(1)} mi
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScreenSpaceLabels;
