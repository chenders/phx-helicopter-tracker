import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useRealtimeFlightsDB() {
  return useQuery({
    queryKey: ['realtimeFlightsDB'],
    queryFn: async () => {
      // First try the database endpoint - no API calls
      const dbResponse = await axios.get('/api/v1/tracking/live-from-db', {
        params: {
          phoenix_pd_only: true,
          active_only: true,
          minutes_back: 15  // Show last 15 minutes of data
        }
      })
      
      // If database has recent data, use it
      if (dbResponse.data && dbResponse.data.length > 0) {
        return dbResponse.data
      }
      
      // Fall back to API endpoint when database is stale
      console.log('Database has no recent data, falling back to FR24 API')
      const apiResponse = await axios.get('/api/v1/tracking/live', {
        params: {
          phoenix_pd_only: true,
          active_only: true,
          data_source: 'fr24_api'
        }
      })
      
      // Transform API data to match database format
      return apiResponse.data.map((flight: any) => ({
        ...flight,
        data_source: 'fr24_api',
        raw_data: {
          ...flight.raw_data,
          fallback_note: 'Using FR24 API due to stale database'
        }
      }))
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