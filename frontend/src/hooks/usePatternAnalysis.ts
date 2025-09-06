import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function usePatternAnalysis(timeRange: string = '30d') {
  return useQuery({
    queryKey: ['patternAnalysis', timeRange],
    queryFn: async () => {
      const response = await axios.get(`/api/v1/patterns/analysis`, {
        params: { time_range: timeRange }
      })
      return response.data
    },
    retry: 2,
    staleTime: 1000 * 60 * 10 // 10 minutes
  })
}