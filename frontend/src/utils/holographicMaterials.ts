/**
 * Holographic Material System for Cesium
 * Inspired by The Division's AR interface design
 *
 * Provides shaders and utilities for creating holographic UI elements
 * with scanlines, Fresnel edge glow, and progressive reveal animations.
 */

declare global {
  interface Window {
    Cesium: any;
  }
}

// Multi-Color Semantic Palette (Division-inspired, optimized for daytime satellite imagery)
// Provides information hierarchy through color coding
export const HolographicColors = {
  // Flight Path & Movement (Cyan/Teal)
  FLIGHT_PATH: { r: 0.0, g: 0.83, b: 1.0 },       // #00D4FF - Bright Cyan for flight trajectory
  FLIGHT_PATH_GLOW: { r: 0.0, g: 1.0, b: 1.0 },   // #00FFFF - Cyan glow
  FLIGHT_ACTIVE: { r: 0.0, g: 1.0, b: 0.8 },      // #00FFCC - Teal for active elements

  // Critical Data & Alerts (Red/Amber)
  CRITICAL_ALERT: { r: 1.0, g: 0.27, b: 0.4 },    // #FF4466 - Red for critical alerts
  WARNING: { r: 1.0, g: 0.67, b: 0.0 },           // #FFAA00 - Amber for warnings
  DANGER: { r: 1.0, g: 0.0, b: 0.0 },             // #FF0000 - Pure Red for danger

  // Location & Spatial Data (Green/Lime)
  LOCATION_PRIMARY: { r: 0.0, g: 1.0, b: 0.53 },  // #00FF88 - Bright Green for locations
  LOCATION_GLOW: { r: 0.0, g: 1.0, b: 0.4 },      // #00FF66 - Green glow
  HOVER_LOCATION: { r: 0.53, g: 1.0, b: 0.0 },    // #88FF00 - Lime for hover spots

  // Radio Audio & Communications (Amber/Orange)
  RADIO_AVAILABLE: { r: 1.0, g: 0.67, b: 0.0 },   // #FFAA00 - Amber for audio available
  RADIO_ACTIVE: { r: 1.0, g: 0.5, b: 0.0 },       // #FF8000 - Orange for playing
  RADIO_GLOW: { r: 1.0, g: 0.8, b: 0.2 },         // #FFCC33 - Warm glow

  // Supporting & Background Elements (Blue)
  BACKGROUND_INFO: { r: 0.27, g: 0.4, b: 1.0 },   // #4466FF - Blue for supporting data
  BACKGROUND_GLOW: { r: 0.4, g: 0.6, b: 1.0 },    // #66AAFF - Light blue glow

  // Legacy compatibility (map to new semantic colors)
  PRIMARY: { r: 0.0, g: 0.83, b: 1.0 },           // Maps to FLIGHT_PATH
  PRIMARY_GLOW: { r: 0.0, g: 1.0, b: 1.0 },       // Maps to FLIGHT_PATH_GLOW
  SECONDARY: { r: 0.0, g: 1.0, b: 0.53 },         // Maps to LOCATION_PRIMARY
  HOVER_ALERT: { r: 0.53, g: 1.0, b: 0.0 },       // Maps to HOVER_LOCATION
  LOW_ALT_WARNING: { r: 1.0, g: 0.67, b: 0.0 },   // Maps to WARNING

  // Neutral
  BACKGROUND: { r: 0.05, g: 0.05, b: 0.08 },      // Dark blue-grey
  WHITE: { r: 1.0, g: 1.0, b: 1.0 },
  BLACK: { r: 0.0, g: 0.0, b: 0.0 },              // For strong outlines
};

/**
 * Creates a holographic material with scanlines and Fresnel edge glow
 * This is implemented as a custom Cesium Material for use with billboards, labels, etc.
 */
export function createHolographicMaterial(Cesium: any, options: {
  baseColor?: { r: number; g: number; b: number };
  glowColor?: { r: number; g: number; b: number };
  scanlineSpeed?: number;
  scanlineFrequency?: number;
  fresnelPower?: number;
  glowIntensity?: number;
  alpha?: number;
} = {}) {
  const {
    baseColor = HolographicColors.PRIMARY,
    glowColor = HolographicColors.PRIMARY_GLOW,
    scanlineSpeed = 2.0,
    scanlineFrequency = 20.0,
    fresnelPower = 3.0,
    glowIntensity = 1.5,
    alpha = 0.9,
  } = options;

  // Define custom material source for holographic effect
  const holographicMaterialSource = `
    czm_material czm_getMaterial(czm_materialInput materialInput) {
      czm_material material = czm_getDefaultMaterial(materialInput);

      vec2 st = materialInput.st;
      float time = czm_frameNumber / 60.0; // Convert frame number to approximate seconds

      // Base holographic color
      vec3 baseColor = vec3(${baseColor.r}, ${baseColor.g}, ${baseColor.b});
      vec3 glowColor = vec3(${glowColor.r}, ${glowColor.g}, ${glowColor.b});

      // Scanline effect - horizontal moving lines
      float scanline = sin(st.y * ${scanlineFrequency} - time * ${scanlineSpeed}) * 0.5 + 0.5;
      scanline = pow(scanline, 2.0); // Sharpen the lines

      // Fresnel edge glow effect (simulated)
      // In a full 3D context, this would use view direction and normal
      // For 2D billboards, we approximate using distance from edges
      float edgeDistX = min(st.x, 1.0 - st.x);
      float edgeDistY = min(st.y, 1.0 - st.y);
      float edgeDist = min(edgeDistX, edgeDistY);
      float fresnel = 1.0 - pow(edgeDist * 2.0, ${fresnelPower});
      fresnel = clamp(fresnel, 0.0, 1.0);

      // Combine effects
      vec3 finalColor = baseColor;
      finalColor += glowColor * fresnel * ${glowIntensity};
      finalColor *= (0.7 + scanline * 0.3); // Modulate by scanlines

      // Pulsing effect for added dynamism
      float pulse = sin(time * 2.0) * 0.1 + 0.9;
      finalColor *= pulse;

      material.diffuse = finalColor;
      material.alpha = ${alpha} * (0.8 + scanline * 0.2);
      material.emission = finalColor * 0.5; // Self-illumination

      return material;
    }
  `;

  return holographicMaterialSource;
}

/**
 * Creates a holographic canvas texture for use with billboards
 * This generates a canvas-based texture with holographic effects
 */
export function createHolographicCanvasTexture(
  Cesium: any,
  text: string,
  options: {
    fontSize?: number;
    fontFamily?: string;
    color?: { r: number; g: number; b: number };
    glowColor?: { r: number; g: number; b: number };
    padding?: number;
    scanlineIntensity?: number;
  } = {}
): HTMLCanvasElement {
  const {
    fontSize = 24,
    fontFamily = 'monospace',
    color = HolographicColors.PRIMARY,
    glowColor = HolographicColors.PRIMARY_GLOW,
    padding = 10,
    scanlineIntensity = 0.3,
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set font to measure text
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.5; // Account for ascenders/descenders

  // Size canvas
  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;

  // Reset font after canvas resize
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Draw strong black outline first for contrast against bright backgrounds
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 6;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

  // Draw glow effect (multiple passes) - more intense for daytime
  const glowColorStr = `rgba(${Math.round(glowColor.r * 255)}, ${Math.round(glowColor.g * 255)}, ${Math.round(glowColor.b * 255)}, 0.8)`;
  ctx.shadowBlur = 20;
  ctx.shadowColor = glowColorStr;

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = glowColorStr;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  // Draw main text - fully opaque for visibility
  ctx.shadowBlur = 0;
  const mainColorStr = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 1.0)`;
  ctx.fillStyle = mainColorStr;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // Add white inner outline for extra pop
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

  // Add scanlines
  if (scanlineIntensity > 0) {
    ctx.globalCompositeOperation = 'overlay';
    for (let y = 0; y < canvas.height; y += 2) {
      ctx.fillStyle = `rgba(0, 0, 0, ${scanlineIntensity})`;
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  return canvas;
}

/**
 * Creates a holographic billboard entity for Cesium
 * Used for street labels, markers, etc.
 */
export function createHolographicBillboard(
  Cesium: any,
  viewer: any,
  options: {
    position: any; // Cesium.Cartesian3
    text: string;
    fontSize?: number;
    color?: { r: number; g: number; b: number };
    scale?: number;
    pixelOffset?: any; // Cesium.Cartesian2
    distanceDisplayCondition?: any; // Cesium.DistanceDisplayCondition
    scaleByDistance?: any; // Cesium.NearFarScalar
    translucencyByDistance?: any; // Cesium.NearFarScalar
  }
) {
  const {
    position,
    text,
    fontSize = 18,
    color = HolographicColors.PRIMARY,
    scale = 1.0,
    pixelOffset,
    distanceDisplayCondition,
    scaleByDistance,
    translucencyByDistance,
  } = options;

  // Create holographic canvas texture
  const canvas = createHolographicCanvasTexture(Cesium, text, {
    fontSize,
    color,
    padding: 8,
    scanlineIntensity: 0.2,
  });

  // Create billboard config with safe BlendMode access
  const billboardConfig: any = {
    image: canvas,
    scale: scale,
    pixelOffset: pixelOffset || new Cesium.Cartesian2(0, 0),
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: distanceDisplayCondition,
    scaleByDistance: scaleByDistance,
    translucencyByDistance: translucencyByDistance,
  };

  // Enable additive blending for holographic effect if available
  if (Cesium.BlendMode && Cesium.BlendMode.ADD !== undefined) {
    billboardConfig.blendMode = Cesium.BlendMode.ADD;
  }

  // Create billboard entity
  return viewer.entities.add({
    position: position,
    billboard: billboardConfig,
  });
}

/**
 * Creates an animated holographic label with progressive reveal
 * The text appears to "scan in" from left to right
 */
export function createProgressiveRevealLabel(
  Cesium: any,
  viewer: any,
  options: {
    position: any;
    text: string;
    fontSize?: number;
    color?: { r: number; g: number; b: number };
    revealDuration?: number; // milliseconds
    startDelay?: number; // milliseconds
    scale?: number;
    distanceDisplayCondition?: any;
    scaleByDistance?: any;
    translucencyByDistance?: any;
  }
) {
  const {
    position,
    text,
    fontSize = 18,
    color = HolographicColors.PRIMARY,
    revealDuration = 1000,
    startDelay = 0,
    scale = 1.0,
    distanceDisplayCondition,
    scaleByDistance,
    translucencyByDistance,
  } = options;

  // Create initial canvas (empty)
  const canvas = createHolographicCanvasTexture(Cesium, '', {
    fontSize,
    color,
  });

  // Create billboard entity with safe BlendMode access
  const billboardConfig: any = {
    image: canvas,
    scale: scale,
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: distanceDisplayCondition,
    scaleByDistance: scaleByDistance,
    translucencyByDistance: translucencyByDistance,
  };

  // Only set blendMode if Cesium.BlendMode is available
  if (Cesium.BlendMode && Cesium.BlendMode.ADD !== undefined) {
    billboardConfig.blendMode = Cesium.BlendMode.ADD;
  }

  const entity = viewer.entities.add({
    position: position,
    billboard: billboardConfig,
  });

  // Animate the reveal
  setTimeout(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / revealDuration, 1.0);

      // Calculate how many characters to show
      const charsToShow = Math.floor(progress * text.length);
      const partialText = text.substring(0, charsToShow);

      // Update canvas
      const newCanvas = createHolographicCanvasTexture(Cesium, partialText, {
        fontSize,
        color,
        scanlineIntensity: 0.2,
      });

      if (entity.billboard) {
        entity.billboard.image = newCanvas;
      }

      // Clean up when complete
      if (progress >= 1.0) {
        clearInterval(interval);
      }
    }, 50); // Update every 50ms
  }, startDelay);

  return entity;
}

/**
 * Creates a pulsing holographic point marker
 * Useful for hover locations, search markers, etc.
 */
export function createPulsingHolographicMarker(
  Cesium: any,
  viewer: any,
  options: {
    position: any;
    baseSize?: number;
    color?: { r: number; g: number; b: number };
    pulseSpeed?: number;
    pulseIntensity?: number;
  }
) {
  const {
    position,
    baseSize = 20,
    color = HolographicColors.PRIMARY,
    pulseSpeed = 2.0,
    pulseIntensity = 0.5,
  } = options;

  const colorCesium = new Cesium.Color(color.r, color.g, color.b, 0.8);

  // Create point entity
  const entity = viewer.entities.add({
    position: position,
    point: {
      pixelSize: baseSize,
      color: colorCesium,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  // Animate the pulse
  const startTime = Date.now();
  const animatePulse = () => {
    const elapsed = (Date.now() - startTime) / 1000;
    const pulse = Math.sin(elapsed * pulseSpeed) * pulseIntensity + 1.0;

    if (entity.point) {
      entity.point.pixelSize = baseSize * pulse;
    }

    requestAnimationFrame(animatePulse);
  };
  animatePulse();

  return entity;
}

/**
 * Utility to convert tier-based colors to holographic colors
 * Maps existing tier system to vibrant colors for daytime visibility
 */
export function getTierHolographicColor(tier: number): { r: number; g: number; b: number } {
  switch (tier) {
    case 0: // Major landmarks/areas - Bright Magenta (most important)
      return HolographicColors.SECONDARY; // #FF00CC - Magenta
    case 1: // Major highways - Royal Blue
      return HolographicColors.PRIMARY; // #0066FF - Royal Blue
    case 2: // Major streets - Bright Cyan
      return { r: 0.0, g: 0.8, b: 1.0 }; // #00CCFF - Bright Cyan
    case 3: // Secondary streets - Medium Blue
      return { r: 0.2, g: 0.6, b: 1.0 }; // #3399FF - Medium Blue
    case 4: // Tertiary streets - Light Blue
      return { r: 0.4, g: 0.7, b: 1.0 }; // #66B3FF - Light Blue
    case 5: // Minor streets - Pale Blue
      return { r: 0.5, g: 0.75, b: 1.0 }; // #80BFFF - Pale Blue
    default:
      return HolographicColors.PRIMARY;
  }
}

/**
 * Creates a holographic cylinder for hover location beams
 * Extends from ground to specified altitude
 */
export function createHolographicBeam(
  Cesium: any,
  viewer: any,
  options: {
    position: { longitude: number; latitude: number };
    radius?: number;
    height?: number;
    color?: { r: number; g: number; b: number };
    pulseSpeed?: number;
  }
) {
  const {
    position,
    radius = 50,
    height = 4572, // ~15,000 feet
    color = HolographicColors.HOVER_ALERT,
    pulseSpeed = 1.0,
  } = options;

  const cesiumColor = new Cesium.Color(color.r, color.g, color.b, 0.3);

  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      height / 2
    ),
    cylinder: {
      length: height,
      topRadius: radius,
      bottomRadius: radius,
      material: cesiumColor,
      outline: true,
      outlineColor: new Cesium.Color(color.r, color.g, color.b, 0.6),
      outlineWidth: 2,
    },
  });

  // Animate opacity pulse
  const startTime = Date.now();
  const animatePulse = () => {
    const elapsed = (Date.now() - startTime) / 1000;
    const pulse = Math.sin(elapsed * pulseSpeed) * 0.15 + 0.3;

    if (entity.cylinder && entity.cylinder.material) {
      const newColor = new Cesium.Color(color.r, color.g, color.b, pulse);
      entity.cylinder.material = newColor;
    }

    requestAnimationFrame(animatePulse);
  };
  animatePulse();

  return entity;
}
