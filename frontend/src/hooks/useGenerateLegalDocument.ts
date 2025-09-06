import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '../lib/axios'

interface GenerateDocumentRequest {
  document_type: string
  time_range: string
  include_exhibits: boolean
  format: string
}

export function useGenerateLegalDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (request: GenerateDocumentRequest) => {
      const response = await axios.post('/api/v1/legal/generate', request)
      return response.data
    },
    onSuccess: () => {
      // Invalidate legal documents list to refresh data
      queryClient.invalidateQueries({ queryKey: ['legalDocuments'] })
    }
  })
}