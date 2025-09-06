import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '../lib/axios'

export function usePublicRecordsRequest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (requestData: any) => {
      const response = await axios.post('/api/v1/data-sources/public-records-request', requestData)
      return response.data
    },
    onSuccess: () => {
      // Invalidate data sources to refresh request status
      queryClient.invalidateQueries({ queryKey: ['dataSources'] })
    }
  })
}