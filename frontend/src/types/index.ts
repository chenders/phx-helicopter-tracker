// Common types
export interface Aircraft {
  id: number
  registration: string
  model?: string
  manufacturer?: string
  is_phoenix_pd: boolean
  status: string
}

export interface FlightData {
  aircraft_id: string
  registration: string
  latitude: number
  longitude: number
  altitude: number
  speed: number
  heading: number
  is_surveillance: boolean
  last_update: string
  data_source: string
}

export interface DashboardStats {
  active_flights: number
  surveillance_events_today: number
  total_cost_today: number
  pattern_alerts: number
}

// Pattern analysis types
export interface PatternAnalysis {
  constitutional_violations: number
  surveillance_hotspots: number
  avg_hover_duration: number
  surveillance_ratio: number
  discriminatory_ratio: number
  excessive_hovering_events: number
  low_altitude_violations: number
  systematic_patrol_routes: number
  daily_activity?: Array<{ date: string; surveillance_flights: number; constitutional_violations: number }>
  hourly_distribution?: Array<{ hour: string; count: number }>
  neighborhood_distribution?: Array<{ neighborhood: string; surveillance_count: number }>
  violation_types?: Array<{ name: string; count: number }>
}

export interface SurveillanceHotspot {
  location: string
  event_count: number
  surveillance_intensity: number
  demographic_info: string
  constitutional_risk: string
}