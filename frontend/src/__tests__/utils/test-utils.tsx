import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper function to create mock flight data
export const createMockFlightData = () => ({
  id: 1,
  aircraft_id: 1,
  flight_id: 'FL_TEST_001',
  callsign: 'Air15',
  departure_time: '2025-08-26T10:00:00Z',
  arrival_time: '2025-08-26T11:00:00Z',
  flight_duration_minutes: 60,
  departure_airport: 'KDVT',
  arrival_airport: 'KDVT',
  max_altitude_feet: 1200,
  min_altitude_feet: 300,
  avg_altitude_feet: 800,
  estimated_cost: 2160.0,
  surveillance_likelihood: 0.8,
  privacy_concern_level: 4,
  aircraft: {
    id: 1,
    registration: 'N624FB',
    make: 'Airbus',
    model: 'H125',
    is_phoenix_pd: true,
    unit_designation: 'Air15'
  }
})

// Helper function to create mock aircraft data
export const createMockAircraftData = () => ({
  id: 1,
  registration: 'N624FB',
  icao_code: 'A12345',
  make: 'Airbus',
  model: 'H125',
  year_manufactured: 2020,
  is_phoenix_pd: true,
  unit_designation: 'Air15',
  has_flir: true,
  has_spotlight: true,
  has_loudspeaker: true,
  max_flight_time_minutes: 180,
  hourly_operating_cost: 2160.0,
  purchase_cost: 3500000.0,
  annual_maintenance_cost: 150000.0,
  is_active: true
})

// Helper function to create mock position data
export const createMockPositionData = () => ({
  id: 1,
  flight_log_id: 1,
  aircraft_id: 1,
  timestamp: '2025-08-26T10:30:00Z',
  latitude: 33.4484,
  longitude: -112.0740,
  altitude_feet: 800,
  ground_speed_knots: 45.0,
  track_degrees: 180.0,
  is_hovering: false,
  hover_duration_seconds: 0,
  neighborhood: 'Maryvale',
  over_private_property: true,
  altitude_privacy_concern: true,
  data_source: 'adsb'
})

// Mock WebSocket for testing real-time features
export const createMockWebSocket = () => {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  }
  
  return mockWs as unknown as WebSocket
}

// Helper to mock API responses
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}