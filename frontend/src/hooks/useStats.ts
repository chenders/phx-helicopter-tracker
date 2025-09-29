import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/tracking/stats')
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Keep previous data on error to prevent values from disappearing
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    // Don't set data to undefined on error
    onError: (error: any) => {
      console.error('Failed to fetch dashboard stats:', error)
    }
  })
}