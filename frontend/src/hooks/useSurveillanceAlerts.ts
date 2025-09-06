import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useSurveillanceAlerts() {
  return useQuery({
    queryKey: ['surveillanceAlerts'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/tracking/alerts')
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds for alerts
    retry: 2,
    staleTime: 0 // Always fresh for alerts
  })
}