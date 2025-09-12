import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useRealtimeFlightsDB() {
  return useQuery({
    queryKey: ['realtimeFlightsDB'],
    queryFn: async () => {
      // Use the new database endpoint - no API calls
      const response = await axios.get('/api/v1/tracking/live-from-db', {
        params: {
          phoenix_pd_only: true,
          active_only: true,
          minutes_back: 15  // Show last 15 minutes of data
        }
      })
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds (database updates every 5 min)
    retry: 2,
    staleTime: 20000 // Consider data fresh for 20 seconds
  })
}

export function useLiveTrackingStats() {
  return useQuery({
    queryKey: ['liveTrackingStats'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/tracking/live-stats')
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 1,
    staleTime: 45000
  })
}

export async function forceAPIUpdate(registration?: string) {
  const response = await axios.post('/api/v1/tracking/force-api-update', null, {
    params: registration ? { registration } : {}
  })
  return response.data
}