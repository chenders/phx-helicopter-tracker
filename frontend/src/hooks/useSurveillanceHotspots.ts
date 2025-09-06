import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useSurveillanceHotspots(timeRange: string = '30d') {
  return useQuery({
    queryKey: ['surveillanceHotspots', timeRange],
    queryFn: async () => {
      const response = await axios.get(`/api/v1/patterns/hotspots`, {
        params: { time_range: timeRange }
      })
      return response.data
    },
    retry: 2,
    staleTime: 1000 * 60 * 15 // 15 minutes
  })
}