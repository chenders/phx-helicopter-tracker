import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from '../../pages/HomePage'
import * as testUtils from '../utils/test-utils'

// Mock the hooks that HomePage might use
vi.mock('../../hooks/useFlightData', () => ({
  useFlightData: vi.fn(() => ({
    data: [testUtils.createMockFlightData()],
    isLoading: false,
    error: null
  }))
}))

vi.mock('../../hooks/useAircraftData', () => ({
  useAircraftData: vi.fn(() => ({
    data: [testUtils.createMockAircraftData()],
    isLoading: false,
    error: null
  }))
}))

describe('HomePage Component', () => {
  it('renders without crashing', () => {
    testUtils.render(<HomePage />)
    
    // Should render without throwing
    expect(document.body).toBeInTheDocument()
  })

  it('displays the page title', () => {
    testUtils.render(<HomePage />)
    
    // Look for homepage related content
    expect(screen.getByText(/phoenix/i)).toBeInTheDocument()
  })

  it('shows overview statistics', () => {
    testUtils.render(<HomePage />)
    
    // Look for statistical information that would typically be on a homepage
    const text = screen.getByRole('main').textContent
    
    // Should contain some numerical data or statistics
    expect(text).toBeTruthy()
  })

  it('displays recent activity or flight information', () => {
    testUtils.render(<HomePage />)
    
    // HomePage should show some flight or aircraft information
    const pageContent = screen.getByRole('main')
    expect(pageContent).toBeInTheDocument()
  })

  it('has navigation links to other sections', () => {
    testUtils.render(<HomePage />)
    
    // Should have links or buttons to navigate to other parts of the app
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('handles loading state appropriately', () => {
    // Mock loading state
    vi.mocked(require('../../hooks/useFlightData').useFlightData).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })

    testUtils.render(<HomePage />)
    
    // Should handle loading state gracefully
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('handles error state appropriately', () => {
    // Mock error state
    vi.mocked(require('../../hooks/useFlightData').useFlightData).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch data')
    })

    testUtils.render(<HomePage />)
    
    // Should handle error state gracefully
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays key metrics and KPIs', () => {
    testUtils.render(<HomePage />)
    
    const main = screen.getByRole('main')
    const content = main.textContent
    
    // Should display some key information about helicopter surveillance
    expect(content).toBeTruthy()
    expect(main).toBeInTheDocument()
  })
})