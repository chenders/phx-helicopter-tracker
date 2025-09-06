import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useDataSources() {
  return useQuery({
    queryKey: ['dataSources'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/data-sources/status')
      return response.data
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2 // Refresh every 2 minutes
  })
}