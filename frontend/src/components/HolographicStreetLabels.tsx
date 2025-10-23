/**
 * Holographic Street Labels Component
 *
 * Renders world-space street names and area labels with Division-inspired styling:
 * - Distance-based LOD (Level of Detail)
 * - Intelligent culling to prevent text overlap
 * - Fresnel edge glow for holographic appearance
 * - Progressive reveal animations
 * - Semantic color coding (green for locations)
 */

import { useEffect, useRef } from 'react';
import {
  createHolographicBillboard,
  createProgressiveRevealLabel,
  HolographicColors,
} from '../utils/holographicMaterials';

declare global {
  interface Window {
    Cesium: any;
  }
}

interface StreetLabel {
  id: string;
  name: string;
  position: { longitude: number; latitude: number; altitude?: number };
  tier: number; // 0 = major area, 1 = highway, 2 = major street, 3+ = minor streets
  type: 'area' | 'street' | 'highway' | 'landmark';
}

interface HolographicStreetLabelsProps {
  viewer: any; // Cesium.Viewer
  cameraPosition?: any; // Cesium.Cartesian3
  labels: StreetLabel[];
  maxVisibleLabels?: number;
  progressiveReveal?: boolean;
}

/**
 * Distance thresholds for different label tiers (in meters)
 */
const VISIBILITY_THRESHOLDS = {
  0: { min: 0, max: 50000 },      // Major areas: visible from 0-50km
  1: { min: 0, max: 20000 },      // Highways: visible from 0-20km
  2: { min: 0, max: 10000 },      // Major streets: visible from 0-10km
  3: { min: 0, max: 5000 },       // Secondary streets: visible from 0-5km
  4: { min: 0, max: 2000 },       // Tertiary streets: visible from 0-2km
  5: { min: 0, max: 1000 },       // Minor streets: visible from 0-1km
};

/**
 * Font sizes for different label tiers (in pixels)
 */
const FONT_SIZES = {
  0: 28,  // Major areas (largest)
  1: 24,  // Highways
  2: 20,  // Major streets
  3: 18,  // Secondary streets
  4: 16,  // Tertiary streets
  5: 14,  // Minor streets (smallest)
};

/**
 * Get semantic color based on label type and tier
 */
function getLabelColor(label: StreetLabel): { r: number; g: number; b: number } {
  // All location-based labels use green semantic color
  if (label.type === 'area' || label.type === 'landmark') {
    return HolographicColors.LOCATION_PRIMARY; // Bright green
  }

  if (label.type === 'highway') {
    return HolographicColors.FLIGHT_PATH; // Cyan (represents movement)
  }

  // Streets use green with varying intensity based on importance
  if (label.tier === 2) {
    return HolographicColors.LOCATION_PRIMARY; // Bright green for major streets
  }

  // Minor streets use slightly dimmed green
  return {
    r: HolographicColors.LOCATION_PRIMARY.r * 0.8,
    g: HolographicColors.LOCATION_PRIMARY.g * 0.8,
    b: HolographicColors.LOCATION_PRIMARY.b * 0.8,
  };
}

/**
 * Calculate distance between two Cartesian3 positions
 */
function calculateDistance(pos1: any, pos2: any): number {
  const Cesium = window.Cesium;
  if (!Cesium) return Infinity;

  return Cesium.Cartesian3.distance(pos1, pos2);
}

/**
 * Check if two labels would overlap on screen
 */
function wouldOverlap(
  label1Pos: any,
  label2Pos: any,
  label1Text: string,
  label2Text: string,
  fontSize: number,
  viewer: any
): boolean {
  const Cesium = window.Cesium;
  if (!Cesium || !viewer.scene) return false;

  try {
    // Convert world positions to screen coordinates
    const screen1 = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      viewer.scene,
      label1Pos
    );
    const screen2 = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      viewer.scene,
      label2Pos
    );

    if (!screen1 || !screen2) return false;

    // Estimate label dimensions (approximate)
    const label1Width = label1Text.length * fontSize * 0.6;
    const label2Width = label2Text.length * fontSize * 0.6;
    const labelHeight = fontSize * 1.5;

    // Calculate screen distance
    const dx = Math.abs(screen1.x - screen2.x);
    const dy = Math.abs(screen1.y - screen2.y);

    // Check for overlap with padding
    const padding = 10;
    const overlapX = dx < (label1Width + label2Width) / 2 + padding;
    const overlapY = dy < labelHeight + padding;

    return overlapX && overlapY;
  } catch (e) {
    // If coordinate conversion fails, assume no overlap
    return false;
  }
}

/**
 * Intelligent label culling to prevent overlap
 * Returns filtered list of labels based on priority and screen space
 */
function cullOverlappingLabels(
  labels: StreetLabel[],
  cameraPosition: any,
  viewer: any,
  maxVisible: number
): StreetLabel[] {
  const Cesium = window.Cesium;
  if (!Cesium) return labels;

  // Sort by tier (priority) and distance from camera
  const sortedLabels = [...labels].sort((a, b) => {
    // Lower tier = higher priority
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    // Same tier: prefer closer labels
    const posA = Cesium.Cartesian3.fromDegrees(
      a.position.longitude,
      a.position.latitude,
      a.position.altitude || 0
    );
    const posB = Cesium.Cartesian3.fromDegrees(
      b.position.longitude,
      b.position.latitude,
      b.position.altitude || 0
    );

    const distA = calculateDistance(cameraPosition, posA);
    const distB = calculateDistance(cameraPosition, posB);

    return distA - distB;
  });

  // Select non-overlapping labels
  const visibleLabels: StreetLabel[] = [];
  const visiblePositions: any[] = [];

  for (const label of sortedLabels) {
    if (visibleLabels.length >= maxVisible) break;

    const labelPos = Cesium.Cartesian3.fromDegrees(
      label.position.longitude,
      label.position.latitude,
      label.position.altitude || 0
    );

    // Check distance threshold for this tier
    const distance = calculateDistance(cameraPosition, labelPos);
    const threshold = VISIBILITY_THRESHOLDS[label.tier as keyof typeof VISIBILITY_THRESHOLDS]
      || VISIBILITY_THRESHOLDS[5];

    if (distance < threshold.min || distance > threshold.max) {
      continue; // Outside visibility range
    }

    // Check for overlap with already visible labels
    let hasOverlap = false;
    for (let i = 0; i < visiblePositions.length; i++) {
      if (wouldOverlap(
        labelPos,
        visiblePositions[i],
        label.name,
        visibleLabels[i].name,
        FONT_SIZES[label.tier as keyof typeof FONT_SIZES] || 16,
        viewer
      )) {
        hasOverlap = true;
        break;
      }
    }

    if (!hasOverlap) {
      visibleLabels.push(label);
      visiblePositions.push(labelPos);
    }
  }

  return visibleLabels;
}

/**
 * HolographicStreetLabels Component
 */
export const HolographicStreetLabels: React.FC<HolographicStreetLabelsProps> = ({
  viewer,
  cameraPosition,
  labels,
  maxVisibleLabels = 50,
  progressiveReveal = true,
}) => {
  const labelEntitiesRef = useRef<any[]>([]);
  const previousLabelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const Cesium = window.Cesium;
    if (!Cesium || !viewer || !cameraPosition) return;

    // Cull overlapping labels
    const visibleLabels = cullOverlappingLabels(
      labels,
      cameraPosition,
      viewer,
      maxVisibleLabels
    );

    const currentLabelIds = new Set(visibleLabels.map(l => l.id));
    const previousLabelIds = previousLabelsRef.current;

    // Remove labels that are no longer visible
    labelEntitiesRef.current = labelEntitiesRef.current.filter(entity => {
      const labelId = entity._labelId;
      if (!currentLabelIds.has(labelId)) {
        try {
          viewer.entities.remove(entity);
        } catch (e) {
          console.warn('Error removing label entity:', e);
        }
        return false;
      }
      return true;
    });

    // Add new labels
    for (const label of visibleLabels) {
      if (previousLabelIds.has(label.id)) {
        continue; // Already exists
      }

      const position = Cesium.Cartesian3.fromDegrees(
        label.position.longitude,
        label.position.latitude,
        label.position.altitude || 100 // Slight elevation to prevent z-fighting
      );

      const color = getLabelColor(label);
      const fontSize = FONT_SIZES[label.tier as keyof typeof FONT_SIZES] || 16;
      const threshold = VISIBILITY_THRESHOLDS[label.tier as keyof typeof VISIBILITY_THRESHOLDS]
        || VISIBILITY_THRESHOLDS[5];

      // Create distance-based scaling
      const scaleByDistance = new Cesium.NearFarScalar(
        threshold.min + 100,    // Start scaling at near distance
        1.2,                    // Scale factor when close
        threshold.max * 0.8,    // Start reducing at far distance
        0.6                     // Scale factor when far
      );

      // Create distance-based translucency
      const translucencyByDistance = new Cesium.NearFarScalar(
        threshold.min,          // Fully opaque at near distance
        1.0,
        threshold.max * 0.9,    // Start fading at far distance
        0.3                     // Translucent when far
      );

      // Create distance display condition
      const distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        threshold.min,
        threshold.max
      );

      let entity;
      if (progressiveReveal && !previousLabelIds.has(label.id)) {
        // Use progressive reveal for new labels
        entity = createProgressiveRevealLabel(Cesium, viewer, {
          position,
          text: label.name,
          fontSize,
          color,
          revealDuration: 800,
          startDelay: 0,
          scale: 1.0,
          distanceDisplayCondition,
          scaleByDistance,
          translucencyByDistance,
        });
      } else {
        // Standard billboard for existing labels
        entity = createHolographicBillboard(Cesium, viewer, {
          position,
          text: label.name,
          fontSize,
          color,
          scale: 1.0,
          distanceDisplayCondition,
          scaleByDistance,
          translucencyByDistance,
        });
      }

      // Store label ID for tracking
      entity._labelId = label.id;
      labelEntitiesRef.current.push(entity);
    }

    // Update previous labels set
    previousLabelsRef.current = currentLabelIds;

  }, [viewer, cameraPosition, labels, maxVisibleLabels, progressiveReveal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewer) {
        for (const entity of labelEntitiesRef.current) {
          try {
            viewer.entities.remove(entity);
          } catch (e) {
            console.warn('Error removing label entity on cleanup:', e);
          }
        }
        labelEntitiesRef.current = [];
      }
    };
  }, [viewer]);

  return null; // This component renders directly to Cesium, no React DOM
};

export default HolographicStreetLabels;
