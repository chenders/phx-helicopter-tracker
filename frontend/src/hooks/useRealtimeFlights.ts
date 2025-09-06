import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useRealtimeFlights() {
  return useQuery({
    queryKey: ['realtimeFlights'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/tracking/live', {
        params: {
          data_source: 'fr24_api'  // Force FlightRadar24 only
        }
      })
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 1, // Reduce retries to avoid rate limit issues
    staleTime: 5000 // Consider data fresh for 5 seconds
  })
}