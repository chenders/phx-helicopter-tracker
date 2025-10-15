import { useQuery } from '@tanstack/react-query'
import axios from '../lib/axios'

interface TimeAnalysisParams {
  analysisType?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  startDate?: string
  endDate?: string
  aircraftFilter?: string[]
}

export function useTimeAnalysis({
  analysisType = 'daily',
  startDate,
  endDate,
  aircraftFilter,
}: TimeAnalysisParams = {}) {
  return useQuery({
    queryKey: ['timeAnalysis', analysisType, startDate, endDate, aircraftFilter],
    queryFn: async () => {
      const params: any = {
        analysis_type: analysisType,
      }

      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (aircraftFilter && aircraftFilter.length > 0) {
        params.aircraft_filter = aircraftFilter
      }

      const response = await axios.get(`/api/v1/analysis/time-patterns`, { params })
      return response.data
    },
    retry: 2,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
