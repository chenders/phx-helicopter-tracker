import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import axios from 'axios'
import { useFlightData } from '../../hooks/useFlightData'
import { createMockFlightData } from '../utils/test-utils'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Create wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useFlightData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('fetches flight data successfully', async () => {
    const mockData = [createMockFlightData()]
    mockedAxios.get.mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useFlightData(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBe(null)
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/flights')
  })

  it('handles error when flight data fetch fails', async () => {
    const errorMessage = 'Network Error'
    mockedAxios.get.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useFlightData(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeUndefined()
  })

  it('can filter flight data by date range', async () => {
    const mockData = [createMockFlightData()]
    mockedAxios.get.mockResolvedValue({ data: mockData })

    const dateRange = {
      startDate: '2025-08-26',
      endDate: '2025-08-27'
    }

    const { result } = renderHook(() => useFlightData(dateRange), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/flights', {
      params: dateRange
    })
  })

  it('can filter flight data by aircraft', async () => {
    const mockData = [createMockFlightData()]
    mockedAxios.get.mockResolvedValue({ data: mockData })

    const aircraftId = 1

    const { result } = renderHook(() => useFlightData({ aircraftId }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/flights', {
      params: { aircraftId }
    })
  })

  it('caches flight data appropriately', async () => {
    const mockData = [createMockFlightData()]
    mockedAxios.get.mockResolvedValue({ data: mockData })

    const wrapper = createWrapper()

    // First render
    const { result: result1 } = renderHook(() => useFlightData(), { wrapper })
    
    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true)
    })

    // Second render should use cached data
    const { result: result2 } = renderHook(() => useFlightData(), { wrapper })
    
    expect(result2.current.data).toEqual(mockData)
    expect(result2.current.isLoading).toBe(false)
    
    // Should only have been called once due to caching
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  it('refetches data when filters change', async () => {
    const mockData = [createMockFlightData()]
    mockedAxios.get.mockResolvedValue({ data: mockData })

    const { result, rerender } = renderHook(
      ({ filters }) => useFlightData(filters),
      {
        wrapper: createWrapper(),
        initialProps: { filters: { aircraftId: 1 } }
      }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    // Change filters
    rerender({ filters: { aircraftId: 2 } })

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })

    expect(mockedAxios.get).toHaveBeenLastCalledWith('/api/v1/flights', {
      params: { aircraftId: 2 }
    })
  })
})