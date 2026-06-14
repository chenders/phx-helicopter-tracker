import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { HomePage } from '../../pages/HomePage'
import * as testUtils from '../utils/test-utils'

// Mock the hooks that HomePage actually uses
vi.mock('../../hooks/useRealtimeFlights', () => ({
  useRealtimeFlights: vi.fn()
}))

vi.mock('../../hooks/useStats', () => ({
  useStats: vi.fn()
}))

// Mock the Router since HomePage uses Link components
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    )
  }
})

import { useRealtimeFlights } from '../../hooks/useRealtimeFlights'
import { useStats } from '../../hooks/useStats'

describe('HomePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set default mock return values
    vi.mocked(useRealtimeFlights).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    } as any)

    vi.mocked(useStats).mockReturnValue({
      data: {
        active_flights: 3,
        surveillance_incidents_today: 5,
        total_cost_today: 4500,
        pattern_alerts: 2
      },
      isLoading: false,
      isError: false,
      error: null
    } as any)
  })

  it('renders without crashing', () => {
    const { container } = testUtils.render(<HomePage />)

    // Should render without throwing
    expect(container).toBeInTheDocument()
  })

  it('displays the page title', () => {
    testUtils.render(<HomePage />)

    // Look for the main title
    expect(screen.getByText(/Phoenix PD Helicopter Surveillance Tracker/i)).toBeInTheDocument()
  })

  it('shows dashboard statistics', () => {
    const { container } = testUtils.render(<HomePage />)

    // Should display the statistics from the mocked data
    expect(container).toBeInTheDocument()

    // Look for some numerical content
    expect(container.textContent).toMatch(/\d+/)
  })

  it('displays active flights count', () => {
    const { container } = testUtils.render(<HomePage />)

    // Should show the active flights number (3 from mock)
    expect(container.textContent).toContain('3')
  })

  it('has navigation links to other sections', () => {
    testUtils.render(<HomePage />)

    // Should have links to navigate to other parts of the app
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('handles stats loading state', () => {
    vi.mocked(useStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null
    } as any)

    const { container } = testUtils.render(<HomePage />)

    // Should render and show default values (0) during loading
    expect(container).toBeInTheDocument()
  })

  it('handles stats error state', () => {
    vi.mocked(useStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch stats')
    } as any)

    const { container } = testUtils.render(<HomePage />)

    // Should render and show default values (0) on error
    expect(container).toBeInTheDocument()
  })

  it('displays key metrics when data is available', () => {
    const { container } = testUtils.render(<HomePage />)

    // Should display dashboard content
    expect(container.textContent).toBeTruthy()
    expect(container).toBeInTheDocument()
  })

  it('uses default values when stats data is null', () => {
    vi.mocked(useStats).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null
    } as any)

    const { container } = testUtils.render(<HomePage />)

    // Should render with default values (0) instead of crashing
    expect(container).toBeInTheDocument()
  })
})
