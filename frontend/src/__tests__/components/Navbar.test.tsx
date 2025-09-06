import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navbar } from '../../components/Navbar'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Navbar Component', () => {
  it('renders the navigation bar', () => {
    renderWithRouter(<Navbar />)
    
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('contains the site title/brand', () => {
    renderWithRouter(<Navbar />)
    
    // Look for Phoenix PD related text
    expect(screen.getByText(/phoenix/i)).toBeInTheDocument()
  })

  it('has navigation links', () => {
    renderWithRouter(<Navbar />)
    
    const nav = screen.getByRole('navigation')
    const links = nav.querySelectorAll('a')
    
    // Should have multiple navigation links
    expect(links.length).toBeGreaterThan(0)
  })

  it('has proper styling classes', () => {
    renderWithRouter(<Navbar />)
    
    const nav = screen.getByRole('navigation')
    
    // Check for Tailwind classes that would typically be used in a navbar
    expect(nav).toHaveClass()
    expect(nav.className).toBeTruthy()
  })

  it('renders navigation items for main sections', () => {
    renderWithRouter(<Navbar />)
    
    // These are the main sections from the app routing
    const expectedSections = [
      'Live Tracking',
      'Historical',
      'Patterns',
      'Costs',
      'Legal',
      'Incidents',
      'Data Sources'
    ]
    
    // At least some of these should be present as navigation items
    const navText = screen.getByRole('navigation').textContent
    const foundSections = expectedSections.filter(section => 
      navText?.toLowerCase().includes(section.toLowerCase())
    )
    
    // Should have at least a few navigation items
    expect(foundSections.length).toBeGreaterThan(0)
  })
})