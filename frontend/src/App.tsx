import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { MobileNav } from './components/MobileNav'
import { GoogleMapsProvider } from './components/GoogleMapsProvider'
import { HomePage } from './pages/HomePage'
import { LiveTrackingPage } from './pages/LiveTrackingPage'
import { HistoricalAnalysisPage } from './pages/HistoricalAnalysisPage'
import { PatternAnalysisPage } from './pages/PatternAnalysisPage'
import { TemporalAnalysisPage } from './pages/TemporalAnalysisPage'
import { CostAnalysisPage } from './pages/CostAnalysisPage'
import { LegalDocumentsPage } from './pages/LegalDocumentsPage'
import { DataSourcesPage } from './pages/DataSourcesPage'
import { TaskMonitoringPage } from './pages/TaskMonitoringPage'
import { RadioPage } from './pages/RadioPage'
import { RadioAnalysisPage } from './pages/RadioAnalysisPage'
import AbnormalPatternsPage from './pages/AbnormalPatternsPage'
import { FlightSearchPage } from './pages/FlightSearchPage'
import { FlightDetailPage } from './pages/FlightDetailPage'
import { DataQualityPage } from './pages/DataQualityPage'
import { LogsPage } from './pages/LogsPage'
import './App.css'

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <GoogleMapsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {isMobile ? (
          // Mobile Layout
          <div className="flex flex-col">
            <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
            <main className="flex-1 px-4 py-4 pt-16">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/live" element={<LiveTrackingPage />} />
                <Route path="/historical" element={<HistoricalAnalysisPage />} />
                <Route path="/patterns" element={<PatternAnalysisPage />} />
                <Route path="/temporal" element={<TemporalAnalysisPage />} />
                <Route path="/costs" element={<CostAnalysisPage />} />
                <Route path="/legal" element={<LegalDocumentsPage />} />
                <Route path="/data-sources" element={<DataSourcesPage />} />
                <Route path="/tasks" element={<TaskMonitoringPage />} />
                <Route path="/radio" element={<RadioPage />} />
                <Route path="/radio-analysis" element={<RadioAnalysisPage />} />
                <Route path="/abnormal" element={<AbnormalPatternsPage />} />
                <Route path="/search" element={<FlightSearchPage />} />
                <Route path="/flight/:flightId" element={<FlightDetailPage />} />
                <Route path="/data-quality" element={<DataQualityPage />} />
                <Route path="/logs" element={<LogsPage />} />
              </Routes>
            </main>
          </div>
        ) : (
          // Desktop Layout
          <div className="flex relative">
            <Sidebar />
            <Header />
            <main className="flex-1 px-6 py-8 overflow-auto pt-16">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/live" element={<LiveTrackingPage />} />
                <Route path="/historical" element={<HistoricalAnalysisPage />} />
                <Route path="/patterns" element={<PatternAnalysisPage />} />
                <Route path="/temporal" element={<TemporalAnalysisPage />} />
                <Route path="/costs" element={<CostAnalysisPage />} />
                <Route path="/legal" element={<LegalDocumentsPage />} />
                <Route path="/data-sources" element={<DataSourcesPage />} />
                <Route path="/tasks" element={<TaskMonitoringPage />} />
                <Route path="/radio" element={<RadioPage />} />
                <Route path="/radio-analysis" element={<RadioAnalysisPage />} />
                <Route path="/abnormal" element={<AbnormalPatternsPage />} />
                <Route path="/search" element={<FlightSearchPage />} />
                <Route path="/flight/:flightId" element={<FlightDetailPage />} />
                <Route path="/data-quality" element={<DataQualityPage />} />
                <Route path="/logs" element={<LogsPage />} />
              </Routes>
            </main>
          </div>
        )}
      </div>
    </GoogleMapsProvider>
  )
}

export default App
