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
  // Phoenix proper
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

  // Major surrounding cities (Tier 0)
  {
    id: 'scottsdale',
    name: 'Scottsdale',
    position: { longitude: -111.9260, latitude: 33.4942, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'tempe',
    name: 'Tempe',
    position: { longitude: -111.9400, latitude: 33.4255, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'mesa',
    name: 'Mesa',
    position: { longitude: -111.8315, latitude: 33.4152, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'chandler',
    name: 'Chandler',
    position: { longitude: -111.8413, latitude: 33.3062, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'gilbert',
    name: 'Gilbert',
    position: { longitude: -111.7890, latitude: 33.3528, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'glendale',
    name: 'Glendale',
    position: { longitude: -112.1860, latitude: 33.5387, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'peoria',
    name: 'Peoria',
    position: { longitude: -112.2374, latitude: 33.5806, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'surprise',
    name: 'Surprise',
    position: { longitude: -112.3679, latitude: 33.6292, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'avondale',
    name: 'Avondale',
    position: { longitude: -112.3496, latitude: 33.4356, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'goodyear',
    name: 'Goodyear',
    position: { longitude: -112.3583, latitude: 33.4353, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'buckeye',
    name: 'Buckeye',
    position: { longitude: -112.5838, latitude: 33.3703, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'fountain-hills',
    name: 'Fountain Hills',
    position: { longitude: -111.7173, latitude: 33.6117, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'paradise-valley',
    name: 'Paradise Valley',
    position: { longitude: -111.9611, latitude: 33.5331, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'queen-creek',
    name: 'Queen Creek',
    position: { longitude: -111.6343, latitude: 33.2487, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'apache-junction',
    name: 'Apache Junction',
    position: { longitude: -111.5496, latitude: 33.4150, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'el-mirage',
    name: 'El Mirage',
    position: { longitude: -112.3246, latitude: 33.6130, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'tolleson',
    name: 'Tolleson',
    position: { longitude: -112.2593, latitude: 33.4500, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'litchfield-park',
    name: 'Litchfield Park',
    position: { longitude: -112.3579, latitude: 33.4933, altitude: 200 },
    tier: 0,
    type: 'area',
  },
  {
    id: 'youngtown',
    name: 'Youngtown',
    position: { longitude: -112.3029, latitude: 33.5942, altitude: 200 },
    tier: 0,
    type: 'area',
  },
];

/**
 * Major highways and freeways (Tier 1)
 */
const HIGHWAYS: PhoenixLabel[] = [
  // I-10 segments
  {
    id: 'i-10-west',
    name: 'I-10 West',
    position: { longitude: -112.3500, latitude: 33.4500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'i-10-central',
    name: 'I-10',
    position: { longitude: -112.0740, latitude: 33.4500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'i-10-east',
    name: 'I-10 East',
    position: { longitude: -111.8500, latitude: 33.4200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // I-17 segments
  {
    id: 'i-17-north',
    name: 'I-17 North',
    position: { longitude: -112.0950, latitude: 33.6000, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'i-17-central',
    name: 'I-17',
    position: { longitude: -112.0950, latitude: 33.5000, altitude: 150 },
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

  // Loop 101 (full circle)
  {
    id: 'loop-101-north',
    name: 'Loop 101 North',
    position: { longitude: -111.9500, latitude: 33.6500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-101-east',
    name: 'Loop 101 East',
    position: { longitude: -111.7500, latitude: 33.4500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-101-south',
    name: 'Loop 101 South',
    position: { longitude: -111.9000, latitude: 33.3200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-101-west',
    name: 'Loop 101 West',
    position: { longitude: -112.2500, latitude: 33.5500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // Loop 202 segments
  {
    id: 'loop-202-red-mountain',
    name: 'Loop 202 (Red Mtn)',
    position: { longitude: -111.8500, latitude: 33.4500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-202-santan',
    name: 'Loop 202 (Santan)',
    position: { longitude: -111.7500, latitude: 33.3000, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-202-south-mountain',
    name: 'Loop 202 (South Mtn)',
    position: { longitude: -112.0500, latitude: 33.3800, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // Loop 303
  {
    id: 'loop-303-north',
    name: 'Loop 303 North',
    position: { longitude: -112.4300, latitude: 33.6500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'loop-303-south',
    name: 'Loop 303 South',
    position: { longitude: -112.4500, latitude: 33.4500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // US-60 (Superstition Freeway)
  {
    id: 'us-60-west',
    name: 'US-60 West',
    position: { longitude: -112.0500, latitude: 33.4200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'us-60-central',
    name: 'US-60',
    position: { longitude: -111.9400, latitude: 33.4200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'us-60-east',
    name: 'US-60 East',
    position: { longitude: -111.6500, latitude: 33.4200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // SR-51 (Squaw Peak Parkway)
  {
    id: 'sr-51-north',
    name: 'SR-51 North',
    position: { longitude: -112.0200, latitude: 33.6000, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'sr-51-central',
    name: 'SR-51',
    position: { longitude: -112.0200, latitude: 33.5500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
  {
    id: 'sr-51-south',
    name: 'SR-51 South',
    position: { longitude: -112.0200, latitude: 33.4900, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // SR-143 (Hohokam Expressway)
  {
    id: 'sr-143',
    name: 'SR-143',
    position: { longitude: -111.9800, latitude: 33.4200, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // SR-87 (Beeline Highway)
  {
    id: 'sr-87-north',
    name: 'SR-87 (Beeline)',
    position: { longitude: -111.6800, latitude: 33.5500, altitude: 150 },
    tier: 1,
    type: 'highway',
  },

  // SR-85
  {
    id: 'sr-85',
    name: 'SR-85',
    position: { longitude: -112.4000, latitude: 33.3000, altitude: 150 },
    tier: 1,
    type: 'highway',
  },
];

/**
 * Major arterial streets (Tier 2)
 */
const MAJOR_STREETS: PhoenixLabel[] = [
  // ========== Major East-West Streets (spanning metro) ==========

  // Northern arterials
  {
    id: 'happy-valley-rd-west',
    name: 'Happy Valley Rd',
    position: { longitude: -112.2000, latitude: 33.7090, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'happy-valley-rd-east',
    name: 'Happy Valley Rd',
    position: { longitude: -111.9000, latitude: 33.7090, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'deer-valley-rd-west',
    name: 'Deer Valley Rd',
    position: { longitude: -112.2000, latitude: 33.6820, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'deer-valley-rd-east',
    name: 'Deer Valley Rd',
    position: { longitude: -111.9000, latitude: 33.6820, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'pinnacle-peak-rd',
    name: 'Pinnacle Peak Rd',
    position: { longitude: -111.9500, latitude: 33.7200, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'jomax-rd',
    name: 'Jomax Rd',
    position: { longitude: -111.9000, latitude: 33.7350, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'union-hills-dr-west',
    name: 'Union Hills Dr',
    position: { longitude: -112.2000, latitude: 33.6530, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'union-hills-dr-east',
    name: 'Union Hills Dr',
    position: { longitude: -111.8500, latitude: 33.6530, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'bell-rd-west',
    name: 'Bell Rd',
    position: { longitude: -112.2500, latitude: 33.6385, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'bell-rd-central',
    name: 'Bell Rd',
    position: { longitude: -112.0300, latitude: 33.6385, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'bell-rd-east',
    name: 'Bell Rd',
    position: { longitude: -111.8500, latitude: 33.6385, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'greenway-rd-west',
    name: 'Greenway Rd',
    position: { longitude: -112.2000, latitude: 33.6240, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'greenway-rd-central',
    name: 'Greenway Rd',
    position: { longitude: -112.0300, latitude: 33.6240, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'greenway-rd-east',
    name: 'Greenway Rd',
    position: { longitude: -111.8500, latitude: 33.6240, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thunderbird-rd-west',
    name: 'Thunderbird Rd',
    position: { longitude: -112.2000, latitude: 33.6095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thunderbird-rd-central',
    name: 'Thunderbird Rd',
    position: { longitude: -112.0300, latitude: 33.6095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thunderbird-rd-east',
    name: 'Thunderbird Rd',
    position: { longitude: -111.8500, latitude: 33.6095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'cactus-rd-west',
    name: 'Cactus Rd',
    position: { longitude: -112.2000, latitude: 33.5950, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'cactus-rd-east',
    name: 'Cactus Rd',
    position: { longitude: -111.9000, latitude: 33.5950, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'peoria-ave-west',
    name: 'Peoria Ave',
    position: { longitude: -112.3000, latitude: 33.5805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'peoria-ave-central',
    name: 'Peoria Ave',
    position: { longitude: -112.0500, latitude: 33.5805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'peoria-ave-east',
    name: 'Peoria Ave',
    position: { longitude: -111.9000, latitude: 33.5805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'dunlap-ave-west',
    name: 'Dunlap Ave',
    position: { longitude: -112.2000, latitude: 33.5660, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'dunlap-ave-east',
    name: 'Dunlap Ave',
    position: { longitude: -111.9500, latitude: 33.5660, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'northern-ave-west',
    name: 'Northern Ave',
    position: { longitude: -112.2000, latitude: 33.5515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'northern-ave-central',
    name: 'Northern Ave',
    position: { longitude: -112.0500, latitude: 33.5515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'northern-ave-east',
    name: 'Northern Ave',
    position: { longitude: -111.9000, latitude: 33.5515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'glendale-ave-west',
    name: 'Glendale Ave',
    position: { longitude: -112.3000, latitude: 33.5370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'glendale-ave-central',
    name: 'Glendale Ave',
    position: { longitude: -112.0500, latitude: 33.5370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'glendale-ave-east',
    name: 'Glendale Ave',
    position: { longitude: -111.9000, latitude: 33.5370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'bethany-home-rd',
    name: 'Bethany Home Rd',
    position: { longitude: -112.0500, latitude: 33.5225, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'camelback-rd-west',
    name: 'Camelback Rd',
    position: { longitude: -112.2000, latitude: 33.5095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'camelback-rd-central',
    name: 'Camelback Rd',
    position: { longitude: -112.0300, latitude: 33.5095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'camelback-rd-east',
    name: 'Camelback Rd',
    position: { longitude: -111.8500, latitude: 33.5095, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'indian-school-rd-west',
    name: 'Indian School Rd',
    position: { longitude: -112.2000, latitude: 33.4950, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'indian-school-rd-central',
    name: 'Indian School Rd',
    position: { longitude: -112.0300, latitude: 33.4950, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'indian-school-rd-east',
    name: 'Indian School Rd',
    position: { longitude: -111.8500, latitude: 33.4950, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thomas-rd-west',
    name: 'Thomas Rd',
    position: { longitude: -112.2000, latitude: 33.4805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thomas-rd-central',
    name: 'Thomas Rd',
    position: { longitude: -112.0300, latitude: 33.4805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thomas-rd-east',
    name: 'Thomas Rd',
    position: { longitude: -111.8500, latitude: 33.4805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mcdowell-rd-west',
    name: 'McDowell Rd',
    position: { longitude: -112.2000, latitude: 33.4660, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mcdowell-rd-central',
    name: 'McDowell Rd',
    position: { longitude: -112.0300, latitude: 33.4660, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mcdowell-rd-east',
    name: 'McDowell Rd',
    position: { longitude: -111.8500, latitude: 33.4660, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'van-buren-st-west',
    name: 'Van Buren St',
    position: { longitude: -112.2000, latitude: 33.4515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'van-buren-st-central',
    name: 'Van Buren St',
    position: { longitude: -112.0300, latitude: 33.4515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'van-buren-st-east',
    name: 'Van Buren St',
    position: { longitude: -111.8500, latitude: 33.4515, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'buckeye-rd-west',
    name: 'Buckeye Rd',
    position: { longitude: -112.2500, latitude: 33.4370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'buckeye-rd-central',
    name: 'Buckeye Rd',
    position: { longitude: -112.0300, latitude: 33.4370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'lower-buckeye-rd',
    name: 'Lower Buckeye Rd',
    position: { longitude: -112.3000, latitude: 33.4250, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'broadway-rd-west',
    name: 'Broadway Rd',
    position: { longitude: -112.2000, latitude: 33.4080, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'broadway-rd-central',
    name: 'Broadway Rd',
    position: { longitude: -112.0300, latitude: 33.4080, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'broadway-rd-east',
    name: 'Broadway Rd',
    position: { longitude: -111.8000, latitude: 33.4080, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'southern-ave-west',
    name: 'Southern Ave',
    position: { longitude: -112.2000, latitude: 33.3935, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'southern-ave-central',
    name: 'Southern Ave',
    position: { longitude: -112.0300, latitude: 33.3935, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'southern-ave-east',
    name: 'Southern Ave',
    position: { longitude: -111.7500, latitude: 33.3935, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'baseline-rd-west',
    name: 'Baseline Rd',
    position: { longitude: -112.2000, latitude: 33.3790, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'baseline-rd-central',
    name: 'Baseline Rd',
    position: { longitude: -112.0300, latitude: 33.3790, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'baseline-rd-east',
    name: 'Baseline Rd',
    position: { longitude: -111.7500, latitude: 33.3790, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'guadalupe-rd',
    name: 'Guadalupe Rd',
    position: { longitude: -111.9000, latitude: 33.3645, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'elliot-rd-west',
    name: 'Elliot Rd',
    position: { longitude: -112.1000, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'elliot-rd-east',
    name: 'Elliot Rd',
    position: { longitude: -111.7500, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'warner-rd-west',
    name: 'Warner Rd',
    position: { longitude: -112.1000, latitude: 33.3355, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'warner-rd-east',
    name: 'Warner Rd',
    position: { longitude: -111.7000, latitude: 33.3355, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'ray-rd-west',
    name: 'Ray Rd',
    position: { longitude: -112.0500, latitude: 33.3210, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'ray-rd-east',
    name: 'Ray Rd',
    position: { longitude: -111.7000, latitude: 33.3210, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'chandler-blvd-west',
    name: 'Chandler Blvd',
    position: { longitude: -112.0000, latitude: 33.3065, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'chandler-blvd-east',
    name: 'Chandler Blvd',
    position: { longitude: -111.7000, latitude: 33.3065, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'germann-rd',
    name: 'Germann Rd',
    position: { longitude: -111.7500, latitude: 33.2775, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'queen-creek-rd',
    name: 'Queen Creek Rd',
    position: { longitude: -111.7000, latitude: 33.2485, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'ocotillo-rd',
    name: 'Ocotillo Rd',
    position: { longitude: -111.8500, latitude: 33.2630, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'riggs-rd',
    name: 'Riggs Rd',
    position: { longitude: -111.7500, latitude: 33.2920, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'williams-field-rd',
    name: 'Williams Field Rd',
    position: { longitude: -111.7500, latitude: 33.2630, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'hunt-hwy',
    name: 'Hunt Hwy',
    position: { longitude: -111.6500, latitude: 33.2200, altitude: 100 },
    tier: 2,
    type: 'street',
  },

  // ========== Major North-South Streets ==========

  // Western arterials
  {
    id: 'dysart-rd',
    name: 'Dysart Rd',
    position: { longitude: -112.4300, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'el-mirage-rd',
    name: 'El Mirage Rd',
    position: { longitude: -112.3900, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'litchfield-rd',
    name: 'Litchfield Rd',
    position: { longitude: -112.3580, latitude: 33.5000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'bullard-ave',
    name: 'Bullard Ave',
    position: { longitude: -112.3400, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'cotton-ln',
    name: 'Cotton Ln',
    position: { longitude: -112.3130, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'perryville-rd',
    name: 'Perryville Rd',
    position: { longitude: -112.2850, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'reems-rd',
    name: 'Reems Rd',
    position: { longitude: -112.2580, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'sarival-ave',
    name: 'Sarival Ave',
    position: { longitude: -112.2300, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '107th-ave',
    name: '107th Ave',
    position: { longitude: -112.2700, latitude: 33.5000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '99th-ave',
    name: '99th Ave',
    position: { longitude: -112.2560, latitude: 33.5000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '91st-ave',
    name: '91st Ave',
    position: { longitude: -112.2420, latitude: 33.5000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '83rd-ave',
    name: '83rd Ave',
    position: { longitude: -112.2280, latitude: 33.5000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '75th-ave',
    name: '75th Ave',
    position: { longitude: -112.2140, latitude: 33.4800, altitude: 100 },
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
  {
    id: '59th-ave',
    name: '59th Ave',
    position: { longitude: -112.1710, latitude: 33.4800, altitude: 100 },
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
    id: '43rd-ave',
    name: '43rd Ave',
    position: { longitude: -112.1430, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '35th-ave',
    name: '35th Ave',
    position: { longitude: -112.1290, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '27th-ave',
    name: '27th Ave',
    position: { longitude: -112.1145, latitude: 33.4800, altitude: 100 },
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
    id: '7th-ave',
    name: '7th Ave',
    position: { longitude: -112.0830, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'central-ave-north',
    name: 'Central Ave',
    position: { longitude: -112.0740, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'central-ave-central',
    name: 'Central Ave',
    position: { longitude: -112.0740, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'central-ave-south',
    name: 'Central Ave',
    position: { longitude: -112.0740, latitude: 33.4000, altitude: 100 },
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
    id: '16th-st',
    name: '16th St',
    position: { longitude: -112.0480, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '24th-st-north',
    name: '24th St',
    position: { longitude: -112.0290, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '24th-st-central',
    name: '24th St',
    position: { longitude: -112.0290, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '24th-st-south',
    name: '24th St',
    position: { longitude: -112.0290, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '32nd-st-north',
    name: '32nd St',
    position: { longitude: -112.0130, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '32nd-st-central',
    name: '32nd St',
    position: { longitude: -112.0130, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '32nd-st-south',
    name: '32nd St',
    position: { longitude: -112.0130, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '40th-st',
    name: '40th St',
    position: { longitude: -111.9970, latitude: 33.4800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '48th-st-north',
    name: '48th St',
    position: { longitude: -111.9810, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: '48th-st-south',
    name: '48th St',
    position: { longitude: -111.9810, latitude: 33.4000, altitude: 100 },
    tier: 2,
    type: 'street',
  },

  // Scottsdale/East Valley arterials
  {
    id: 'scottsdale-rd-north',
    name: 'Scottsdale Rd',
    position: { longitude: -111.9260, latitude: 33.6000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'scottsdale-rd-central',
    name: 'Scottsdale Rd',
    position: { longitude: -111.9260, latitude: 33.4942, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'scottsdale-rd-south',
    name: 'Scottsdale Rd',
    position: { longitude: -111.9260, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'hayden-rd',
    name: 'Hayden Rd',
    position: { longitude: -111.9080, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mill-ave',
    name: 'Mill Ave',
    position: { longitude: -111.9400, latitude: 33.4255, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'rural-rd',
    name: 'Rural Rd',
    position: { longitude: -111.9230, latitude: 33.4000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mcclintock-dr',
    name: 'McClintock Dr',
    position: { longitude: -111.9100, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'priest-dr',
    name: 'Priest Dr',
    position: { longitude: -111.8700, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'dobson-rd-north',
    name: 'Dobson Rd',
    position: { longitude: -111.8770, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'dobson-rd-south',
    name: 'Dobson Rd',
    position: { longitude: -111.8770, latitude: 33.3300, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'alma-school-rd-north',
    name: 'Alma School Rd',
    position: { longitude: -111.8620, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'alma-school-rd-south',
    name: 'Alma School Rd',
    position: { longitude: -111.8620, latitude: 33.3300, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'country-club-dr',
    name: 'Country Club Dr',
    position: { longitude: -111.8475, latitude: 33.4000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mesa-dr',
    name: 'Mesa Dr',
    position: { longitude: -111.8330, latitude: 33.4152, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'gilbert-rd-north',
    name: 'Gilbert Rd',
    position: { longitude: -111.8180, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'gilbert-rd-south',
    name: 'Gilbert Rd',
    position: { longitude: -111.8180, latitude: 33.3000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'val-vista-dr-north',
    name: 'Val Vista Dr',
    position: { longitude: -111.7600, latitude: 33.4500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'val-vista-dr-south',
    name: 'Val Vista Dr',
    position: { longitude: -111.7600, latitude: 33.3000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'greenfield-rd',
    name: 'Greenfield Rd',
    position: { longitude: -111.8030, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'lindsay-rd',
    name: 'Lindsay Rd',
    position: { longitude: -111.7450, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'power-rd',
    name: 'Power Rd',
    position: { longitude: -111.6890, latitude: 33.4000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'higley-rd',
    name: 'Higley Rd',
    position: { longitude: -111.7300, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'recker-rd',
    name: 'Recker Rd',
    position: { longitude: -111.6740, latitude: 33.4000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'sossaman-rd',
    name: 'Sossaman Rd',
    position: { longitude: -111.6590, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'ellsworth-rd',
    name: 'Ellsworth Rd',
    position: { longitude: -111.7160, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'arizona-ave',
    name: 'Arizona Ave',
    position: { longitude: -111.8620, latitude: 33.3300, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'cooper-rd',
    name: 'Cooper Rd',
    position: { longitude: -111.7015, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'signal-butte-rd',
    name: 'Signal Butte Rd',
    position: { longitude: -111.6450, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'hawes-rd',
    name: 'Hawes Rd',
    position: { longitude: -111.6300, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'crismon-rd',
    name: 'Crismon Rd',
    position: { longitude: -111.6150, latitude: 33.4000, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'meridian-rd',
    name: 'Meridian Rd',
    position: { longitude: -111.6000, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'ellsworth-loop-rd',
    name: 'Ellsworth Loop Rd',
    position: { longitude: -111.5850, latitude: 33.3800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'idaho-rd',
    name: 'Idaho Rd',
    position: { longitude: -111.5700, latitude: 33.4150, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'kings-ranch-rd',
    name: 'Kings Ranch Rd',
    position: { longitude: -111.5550, latitude: 33.3500, altitude: 100 },
    tier: 2,
    type: 'street',
  },

  // Scottsdale North arterials
  {
    id: 'pima-rd',
    name: 'Pima Rd',
    position: { longitude: -111.8900, latitude: 33.5500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'tatum-blvd',
    name: 'Tatum Blvd',
    position: { longitude: -111.9780, latitude: 33.5800, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'cave-creek-rd',
    name: 'Cave Creek Rd',
    position: { longitude: -111.9500, latitude: 33.6500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'shea-blvd',
    name: 'Shea Blvd',
    position: { longitude: -111.8500, latitude: 33.5805, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'frank-lloyd-wright',
    name: 'Frank Lloyd Wright',
    position: { longitude: -111.8700, latitude: 33.6075, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'thompson-peak-pkwy',
    name: 'Thompson Peak Pkwy',
    position: { longitude: -111.8000, latitude: 33.6370, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'mcdowell-mountain-rd',
    name: 'McDowell Mountain Rd',
    position: { longitude: -111.7500, latitude: 33.6500, altitude: 100 },
    tier: 2,
    type: 'street',
  },
  {
    id: 'fountain-hills-blvd',
    name: 'Fountain Hills Blvd',
    position: { longitude: -111.7173, latitude: 33.6117, altitude: 100 },
    tier: 2,
    type: 'street',
  },
];

/**
 * Key landmarks (Tier 0)
 */
const LANDMARKS: PhoenixLabel[] = [
  // Airports
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
    id: 'scottsdale-airport',
    name: 'Scottsdale Airport',
    position: { longitude: -111.9106, latitude: 33.6228, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'mesa-gateway-airport',
    name: 'Mesa Gateway Airport',
    position: { longitude: -111.6555, latitude: 33.3078, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'falcon-field',
    name: 'Falcon Field Airport',
    position: { longitude: -111.7282, latitude: 33.4608, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'glendale-airport',
    name: 'Glendale Airport',
    position: { longitude: -112.2950, latitude: 33.5272, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },

  // Mountains and Parks
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
  {
    id: 'piestewa-peak',
    name: 'Piestewa Peak',
    position: { longitude: -112.0250, latitude: 33.5480, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'papago-park',
    name: 'Papago Park',
    position: { longitude: -111.9500, latitude: 33.4550, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'mcdowell-mountains',
    name: 'McDowell Mountains',
    position: { longitude: -111.7000, latitude: 33.7000, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'superstition-mountains',
    name: 'Superstition Mountains',
    position: { longitude: -111.4500, latitude: 33.4600, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'usery-mountain',
    name: 'Usery Mountain Park',
    position: { longitude: -111.5800, latitude: 33.4800, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'white-tank-mountains',
    name: 'White Tank Mountains',
    position: { longitude: -112.5500, latitude: 33.5800, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'estrella-mountain',
    name: 'Estrella Mountain Park',
    position: { longitude: -112.3600, latitude: 33.3700, altitude: 300 },
    tier: 0,
    type: 'landmark',
  },

  // Major Universities and Stadiums
  {
    id: 'asu-tempe',
    name: 'ASU Tempe Campus',
    position: { longitude: -111.9342, latitude: 33.4242, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'state-farm-stadium',
    name: 'State Farm Stadium',
    position: { longitude: -112.2626, latitude: 33.5276, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'chase-field',
    name: 'Chase Field',
    position: { longitude: -112.0667, latitude: 33.4453, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },
  {
    id: 'footprint-center',
    name: 'Footprint Center',
    position: { longitude: -112.0712, latitude: 33.4458, altitude: 200 },
    tier: 0,
    type: 'landmark',
  },

  // Shopping/Entertainment Districts
  {
    id: 'old-town-scottsdale',
    name: 'Old Town Scottsdale',
    position: { longitude: -111.9256, latitude: 33.4942, altitude: 200 },
    tier: 1,
    type: 'landmark',
  },
  {
    id: 'westgate',
    name: 'Westgate Entertainment',
    position: { longitude: -112.2619, latitude: 33.5328, altitude: 200 },
    tier: 1,
    type: 'landmark',
  },
  {
    id: 'tempe-marketplace',
    name: 'Tempe Marketplace',
    position: { longitude: -111.8992, latitude: 33.3838, altitude: 200 },
    tier: 1,
    type: 'landmark',
  },
  {
    id: 'chandler-fashion',
    name: 'Chandler Fashion Center',
    position: { longitude: -111.8906, latitude: 33.2919, altitude: 200 },
    tier: 1,
    type: 'landmark',
  },
  {
    id: 'mesa-riverview',
    name: 'Mesa Riverview',
    position: { longitude: -111.8700, latitude: 33.4600, altitude: 200 },
    tier: 1,
    type: 'landmark',
  },
  {
    id: 'arrowhead-towne-center',
    name: 'Arrowhead Towne Center',
    position: { longitude: -112.2065, latitude: 33.6410, altitude: 200 },
    tier: 1,
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
