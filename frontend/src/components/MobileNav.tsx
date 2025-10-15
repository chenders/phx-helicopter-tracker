import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { ThemeSelector } from './ThemeSelector'

interface MobileNavProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export const MobileNav = ({ isOpen, setIsOpen }: MobileNavProps) => {
  const location = useLocation()
  const [isSystemExpanded, setIsSystemExpanded] = useState(false)

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/search', label: 'Flight Search', icon: '🔎' },
    { path: '/live', label: 'Live Tracking', icon: '📡' },
    { path: '/historical', label: 'Historical', icon: '📊' },
    { path: '/patterns', label: 'Patterns', icon: '🔍' },
    { path: '/temporal', label: 'Temporal', icon: '📈' },
    { path: '/abnormal', label: 'Abnormal', icon: '⚠️' },
    { path: '/costs', label: 'Cost Analysis', icon: '💰' },
    { path: '/legal', label: 'Legal Docs', icon: '⚖️' },
    { path: '/radio', label: 'Radio Archives', icon: '📻' },
  ]

  const systemItems = [
    { path: '/data-sources', label: 'Data Sources', icon: '💾' },
    { path: '/tasks', label: 'Tasks', icon: '⚙️' },
    { path: '/logs', label: 'Logs', icon: '📋' },
  ]

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 bg-blue-900 dark:bg-gray-900 text-white shadow-lg z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🚁</span>
            <div>
              <h1 className="text-lg font-bold">Phoenix PD</h1>
              <p className="text-xs text-blue-200 dark:text-gray-300">Helicopter Tracker</p>
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            <ThemeSelector />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-blue-800 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />

        {/* Navigation Panel */}
        <nav
          className={`absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 max-h-[calc(100vh-4rem)] overflow-y-auto ${
            isOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  location.pathname === item.path
                    ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {/* System Group */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsSystemExpanded(!isSystemExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  systemItems.some(item => location.pathname === item.path)
                    ? 'bg-blue-500 dark:bg-blue-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">⚡</span>
                  <span className="font-medium">System</span>
                </div>
                <span className="text-sm">
                  {isSystemExpanded ? '▼' : '▶'}
                </span>
              </button>

              {/* System Items (shown when expanded) */}
              {isSystemExpanded && (
                <div className="mt-1 space-y-1 pl-4">
                  {systemItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${
                        location.pathname === item.path
                          ? 'bg-blue-400 dark:bg-blue-700 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-around text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Online
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Data:</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Live</span>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}