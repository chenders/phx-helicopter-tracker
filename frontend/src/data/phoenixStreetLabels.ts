/**
 * Phoenix Street and Area Labels
 *
 * Hierarchical location data for holographic world-space labels:
 * - Tier 0: Major areas/neighborhoods
 * - Tier 1: Highways and freeways
 * - Tier 2: Major arterial streets
 * - Tier 3+: Secondary streets
 *
 * Positions are approximate centroids for areas, or representative points for streets
 */

export interface PhoenixLabel {
  id: string;
  name: string;
  position: { longitude: number; latitude: number; altitude?: number };
  tier: number;
  type: 'area' | 'street' | 'highway' | 'landmark';
}

/**
 * Major Phoenix areas and neighborhoods (Tier 0)
 */
const MAJOR_AREAS: PhoenixLabel[] = [
  {
    id: 'downtown-phoenix',
    name: 'Downtown Phoenix',
    position: { longitude: -112.0740, latitude: 33.4484, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'maryvale',
    name: 'Maryvale',
    position: { longitude: -112.1770, latitude: 33.5025, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'south-phoenix',
    name: 'South Phoenix',
    position: { longitude: -112.0740, latitude: 33.3900, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'north-phoenix',
    name: 'North Phoenix',
    position: { longitude: -112.0740, latitude: 33.6500, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'central-phoenix',
    name: 'Central Phoenix',
    position: { longitude: -112.0740, latitude: 33.5000, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'ahwatukee',
    name: 'Ahwatukee',
    position: { longitude: -112.0100, latitude: 33.3400, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'deer-valley',
    name: 'Deer Valley',
    position: { longitude: -112.1350, latitude: 33.7300, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'camelback-east',
    name: 'Camelback East',
    position: { longitude: -111.9700, latitude: 33.5100, altitude: 200 },
    tier: 0,
    type: 'area',
  },
];

/**
 * Major highways and freeways (Tier 1)
 */
const HIGHWAYS: PhoenixLabel[] = [
  {
    id: 'i-10-central',
    name: 'I-10',
    position: { longitude: -112.0740, latitude: 33.4500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'i-17-north',
    name: 'I-17 North',
    position: { longitude: -112.0950, latitude: 33.6000, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'i-17-south',
    name: 'I-17 South',
    position: { longitude: -112.0950, latitude: 33.4300, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-101-north',
    name: 'Loop 101',
    position: { longitude: -111.9500, latitude: 33.6000, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-202-east',
    name: 'Loop 202',
    position: { longitude: -111.9800, latitude: 33.3800, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'us-60',
    name: 'US-60',
    position: { longitude: -111.9400, latitude: 33.4200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'sr-51',
    name: 'SR-51',
    position: { longitude: -112.0200, latitude: 33.5500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
];

/**
 * Major arterial streets (Tier 2)
 */
const MAJOR_STREETS: PhoenixLabel[] = [
  // Major East-West Streets
  {
    id: 'camelback-rd',
    name: 'Camelback Rd',
    position: { longitude: -112.0300, latitude: 33.5095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'indian-school-rd',
    name: 'Indian School Rd',
    position: { longitude: -112.0300, latitude: 33.4950, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thomas-rd',
    name: 'Thomas Rd',
    position: { longitude: -112.0300, latitude: 33.4805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mcdowell-rd',
    name: 'McDowell Rd',
    position: { longitude: -112.0300, latitude: 33.4660, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'van-buren-st',
    name: 'Van Buren St',
    position: { longitude: -112.0300, latitude: 33.4515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'buckeye-rd',
    name: 'Buckeye Rd',
    position: { longitude: -112.0300, latitude: 33.4370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'broadway-rd',
    name: 'Broadway Rd',
    position: { longitude: -112.0300, latitude: 33.4080, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'baseline-rd',
    name: 'Baseline Rd',
    position: { longitude: -112.0300, latitude: 33.3790, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'southern-ave',
    name: 'Southern Ave',
    position: { longitude: -112.0300, latitude: 33.3935, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'bell-rd',
    name: 'Bell Rd',
    position: { longitude: -112.0300, latitude: 33.6385, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'union-hills-dr',
    name: 'Union Hills Dr',
    position: { longitude: -112.0300, latitude: 33.6530, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thunderbird-rd',
    name: 'Thunderbird Rd',
    position: { longitude: -112.0300, latitude: 33.6095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'greenway-rd',
    name: 'Greenway Rd',
    position: { longitude: -112.0300, latitude: 33.6240, altitude: 100 },
    tier: 2,
    type: 'street',
  },

  // Major North-South Streets
  {
    id: 'central-ave',
    name: 'Central Ave',
    position: { longitude: -112.0740, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '7th-ave',
    name: '7th Ave',
    position: { longitude: -112.0830, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '19th-ave',
    name: '19th Ave',
    position: { longitude: -112.1000, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '24th-st',
    name: '24th St',
    position: { longitude: -112.0290, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '32nd-st',
    name: '32nd St',
    position: { longitude: -112.0130, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '7th-st',
    name: '7th St',
    position: { longitude: -112.0650, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '43rd-ave',
    name: '43rd Ave',
    position: { longitude: -112.1430, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '51st-ave',
    name: '51st Ave',
    position: { longitude: -112.1570, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '59th-ave',
    name: '59th Ave',
    position: { longitude: -112.1710, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '67th-ave',
    name: '67th Ave',
    position: { longitude: -112.1850, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
];

/**
 * Key landmarks (Tier 0)
 */
const LANDMARKS: PhoenixLabel[] = [
  {
    id: 'sky-harbor',
    name: 'Sky Harbor Airport',
    position: { longitude: -112.0080, latitude: 33.4343, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'deer-valley-airport',
    name: 'Deer Valley Airport',
    position: { longitude: -112.0830, latitude: 33.6880, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'camelback-mountain',
    name: 'Camelback Mountain',
    position: { longitude: -111.9720, latitude: 33.5145, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'south-mountain',
    name: 'South Mountain Park',
    position: { longitude: -112.0620, latitude: 33.3400, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
];

/**
 * All Phoenix labels combined
 */
export const PHOENIX_LABELS: PhoenixLabel[] = [
  ...MAJOR_AREAS,
  ...HIGHWAYS,
  ...MAJOR_STREETS,
  ...LANDMARKS,
];

/**
 * Get labels filtered by tier (for progressive loading)
 */
export function getLabelsByTier(maxTier: number = 5): PhoenixLabel[] {
  return PHOENIX_LABELS.filter(label => label.tier <= maxTier);
}

/**
 * Get labels within a bounding box
 */
export function getLabelsInBounds(
  minLon: number,
  maxLon: number,
  minLat: number,
  maxLat: number
): PhoenixLabel[] {
  return PHOENIX_LABELS.filter(
    label =>
      label.position.longitude >= minLon &&
      label.position.longitude <= maxLon &&
      label.position.latitude >= minLat &&
      label.position.latitude <= maxLat
  );
}

/**
 * Get labels by type
 */
export function getLabelsByType(
  type: 'area' | 'street' | 'highway' | 'landmark'
): PhoenixLabel[] {
  return PHOENIX_LABELS.filter(label => label.type === type);
}
