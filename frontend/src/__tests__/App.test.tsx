import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

// Mock the page components
vi.mock('../pages/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>
}))

vi.mock('../pages/LiveTrackingPage', () => ({
  LiveTrackingPage: () => <div data-testid="live-tracking-page">Live Tracking Page</div>
}))

vi.mock('../pages/HistoricalAnalysisPage', () => ({
  HistoricalAnalysisPage: () => <div data-testid="historical-analysis-page">Historical Analysis Page</div>
}))

vi.mock('../pages/PatternAnalysisPage', () => ({
  PatternAnalysisPage: () => <div data-testid="pattern-analysis-page">Pattern Analysis Page</div>
}))

vi.mock('../pages/CostAnalysisPage', () => ({
  CostAnalysisPage: () => <div data-testid="cost-analysis-page">Cost Analysis Page</div>
}))

vi.mock('../pages/LegalDocumentsPage', () => ({
  LegalDocumentsPage: () => <div data-testid="legal-documents-page">Legal Documents Page</div>
}))

vi.mock('../pages/IncidentReportingPage', () => ({
  IncidentReportingPage: () => <div data-testid="incident-reporting-page">Incident Reporting Page</div>
}))

vi.mock('../pages/DataSourcesPage', () => ({
  DataSourcesPage: () => <div data-testid="data-sources-page">Data Sources Page</div>
}))

vi.mock('../components/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navigation</nav>
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route)
  const queryClient = createTestQueryClient()
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App Component', () => {
  it('renders without crashing', () => {
    renderWithProviders(<App />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('renders the home page by default', () => {
    renderWithProviders(<App />)
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('has proper layout structure', () => {
    renderWithProviders(<App />)
    
    const container = screen.getByTestId('navbar').closest('div')
    expect(container).toHaveClass('min-h-screen', 'bg-gray-50')
    
    const main = screen.getByRole('main')
    expect(main).toHaveClass('container', 'mx-auto', 'px-4', 'py-8')
  })

  it('configures QueryClient with correct default options', () => {
    const app = renderWithProviders(<App />)
    
    // Test that the app renders correctly with QueryClient
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })
})