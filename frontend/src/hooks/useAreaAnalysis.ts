import { useMutation } from '@tanstack/react-query'
import axios from '../lib/axios'

interface AreaAnalysisParams {
  centerLat: number
  centerLon: number
  radiusMeters: number
  startDate?: string
  endDate?: string
  areaName?: string
}

interface AreaAnalysisResult {
  area_name: string
  center_lat: number
  center_lon: number
  radius_meters: number
  total_flights: number
  total_positions: number
  unique_aircraft: number
  total_flight_time_minutes: number
  avg_altitude_feet: number
  min_altitude_feet: number
  max_altitude_feet: number
  hovering_events: number
  circling_events: number
  low_altitude_events: number
  night_flights: number
  surveillance_likelihood: number
  privacy_expectation_level: string
  constitutional_concern_level: number
  residential_density: number
  most_common_aircraft: string[]
  time_distribution: Record<string, number>
  altitude_distribution: Record<string, number>
}

export function useAreaAnalysis() {
  return useMutation({
    mutationFn: async (params: AreaAnalysisParams) => {
      const queryParams: any = {
        center_lat: params.centerLat,
        center_lon: params.centerLon,
        radius_meters: params.radiusMeters,
      }

      if (params.startDate) queryParams.start_date = params.startDate
      if (params.endDate) queryParams.end_date = params.endDate
      if (params.areaName) queryParams.area_name = params.areaName

      const response = await axios.post<AreaAnalysisResult>(
        `/api/v1/analysis/areas`,
        null,
        { params: queryParams }
      )
      return response.data
    },
    retry: 1,
  })
}
