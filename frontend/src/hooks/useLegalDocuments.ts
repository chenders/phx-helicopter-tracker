import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useLegalDocuments() {
  return useQuery({
    queryKey: ['legalDocuments'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/legal/documents')
      return response.data
    },
    retry: 2,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}