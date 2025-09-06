import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '../lib/axios'

export function useDataImport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post('/api/v1/data-sources/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['historicalData'] })
      queryClient.invalidateQueries({ queryKey: ['patternAnalysis'] })
      queryClient.invalidateQueries({ queryKey: ['costAnalysis'] })
    }
  })
}

export function useMultiFileDataImport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { 
      files: File[], 
      source?: string,
      aircraftRegistrations?: string[],
      startDate?: string,
      endDate?: string 
    }) => {
      const formData = new FormData()
      
      // Add all files
      data.files.forEach((file) => {
        formData.append('files', file)
      })
      
      // Build query parameters
      const queryParams = new URLSearchParams()
      if (data.source) {
        queryParams.append('source', data.source)
      }
      if (data.aircraftRegistrations) {
        data.aircraftRegistrations.forEach(reg => {
          queryParams.append('aircraft_registrations', reg)
        })
      }
      if (data.startDate) {
        queryParams.append('start_date', data.startDate)
      }
      if (data.endDate) {
        queryParams.append('end_date', data.endDate)
      }
      
      const url = `/api/v1/data-sources/import${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['historicalData'] })
      queryClient.invalidateQueries({ queryKey: ['patternAnalysis'] })
      queryClient.invalidateQueries({ queryKey: ['costAnalysis'] })
    }
  })
}

export function useFlightRadar24Download() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      aircraftRegistration: string
      startDate: string
      endDate: string
      format?: string
    }) => {
      const queryParams = new URLSearchParams({
        aircraft_registration: data.aircraftRegistration,
        start_date: data.startDate,
        end_date: data.endDate,
        format: data.format || 'json'
      })
      
      const response = await axios.post(
        `/api/v1/data-sources/flightradar24/download?${queryParams.toString()}`,
        {},
        {
          responseType: 'blob',
          headers: {
            'Accept': data.format === 'csv' ? 'text/csv' : 
                    data.format === 'kml' ? 'application/vnd.google-earth.kml+xml' :
                    'application/json'
          }
        }
      )
      
      // Create download link
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers
      const contentDisposition = response.headers['content-disposition']
      let filename = `${data.aircraftRegistration}_${data.startDate}_${data.endDate}.${data.format || 'json'}`
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/['"]/g, '')
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      return {
        filename,
        flightsCount: parseInt(response.headers['x-flights-count'] || '0', 10),
        success: true
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicalData'] })
      queryClient.invalidateQueries({ queryKey: ['patternAnalysis'] })
      queryClient.invalidateQueries({ queryKey: ['costAnalysis'] })
    }
  })
}