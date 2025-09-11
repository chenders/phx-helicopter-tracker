import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { LiveTrackingPage } from './pages/LiveTrackingPage'
import { HistoricalAnalysisPage } from './pages/HistoricalAnalysisPage'
import { PatternAnalysisPage } from './pages/PatternAnalysisPage'
import { CostAnalysisPage } from './pages/CostAnalysisPage'
import { LegalDocumentsPage } from './pages/LegalDocumentsPage'
import { DataSourcesPage } from './pages/DataSourcesPage'
import { TaskMonitoringPage } from './pages/TaskMonitoringPage'
import { RadioPage } from './pages/RadioPage'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex relative">
      <Sidebar />
      <Header />
      <main className="flex-1 px-6 py-8 overflow-auto pt-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LiveTrackingPage />} />
          <Route path="/historical" element={<HistoricalAnalysisPage />} />
          <Route path="/patterns" element={<PatternAnalysisPage />} />
          <Route path="/costs" element={<CostAnalysisPage />} />
          <Route path="/legal" element={<LegalDocumentsPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/tasks" element={<TaskMonitoringPage />} />
          <Route path="/radio" element={<RadioPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
