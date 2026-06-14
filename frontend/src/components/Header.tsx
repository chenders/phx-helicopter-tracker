import { ThemeSelector } from './ThemeSelector'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Show back button on flight detail pages
  const showBackButton = location.pathname.startsWith('/flights/')

  return (
    <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50">
      {/* Left side - Back button (conditional) */}
      <div className="flex-1">
        {showBackButton && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-cyan-500/30 rounded-lg text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}
      </div>

      {/* Right side - Status, Data, Theme */}
      <div className="flex items-center gap-6">
        {/* Status Info */}
        <div className="flex items-center gap-6 text-sm bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300">Status:</span>
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Online
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300">Data:</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Live</span>
          </div>
        </div>

        {/* Theme Selector */}
        <ThemeSelector />
      </div>
    </header>
  )
}