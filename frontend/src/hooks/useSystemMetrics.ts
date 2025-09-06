import { useQuery } from '@tanstack/react-query'

interface SystemMetrics {
  helicopters_tracked: number
  total_flights_recorded: number
  surveillance_reports: number
  active_data_sources: number
  last_data_update: string | null
  monitoring_since: string
  coverage_percentage: number
}

export function useSystemMetrics() {
  return useQuery<SystemMetrics>({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      // Try to fetch real metrics from the API
      try {
        const response = await fetch('/api/analysis/metrics')
        if (response.ok) {
          const data = await response.json()
          return {
            helicopters_tracked: data.unique_aircraft || 5, // Phoenix PD fleet size
            total_flights_recorded: data.total_flights || 0,
            surveillance_reports: data.surveillance_reports || 0,
            active_data_sources: 1, // FlightRadar24
            last_data_update: data.last_update || null,
            monitoring_since: '2024-01-01',
            coverage_percentage: data.coverage || 0
          }
        }
      } catch (error) {
        console.error('Error fetching system metrics:', error)
      }
      
      // Return default values if API is not available
      return {
        helicopters_tracked: 5, // Known Phoenix PD helicopters
        total_flights_recorded: 0,
        surveillance_reports: 0,
        active_data_sources: 1,
        last_data_update: null,
        monitoring_since: '2024-01-01',
        coverage_percentage: 0
      }
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000 // Consider data stale after 30 seconds
  })
}