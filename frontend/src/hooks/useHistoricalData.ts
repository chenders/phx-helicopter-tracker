import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useHistoricalData(timeRange: string = '30d', aircraft: string = 'all') {
  return useQuery({
    queryKey: ['historicalData', timeRange, aircraft],
    queryFn: async () => {
      const response = await axios.get('/api/v1/analysis/historical', {
        params: { time_range: timeRange, aircraft }
      })
      return response.data
    },
    retry: 2,
    staleTime: 1000 * 60 * 10 // 10 minutes
  })
}