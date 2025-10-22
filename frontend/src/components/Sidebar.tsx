import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Sidebar = () => {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSystemExpanded, setIsSystemExpanded] = useState(false)

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/search', label: 'Flight Search', icon: '🔎' },
    { path: '/live', label: 'Live Tracking', icon: '📡' },
    { path: '/historical', label: 'Historical', icon: '📊' },
    { path: '/patterns', label: 'Patterns', icon: '🔍' },
    { path: '/temporal', label: 'Temporal Analysis', icon: '📈' },
    { path: '/abnormal', label: 'Abnormal Patterns', icon: '⚠️' },
    { path: '/costs', label: 'Cost Analysis', icon: '💰' },
    { path: '/legal', label: 'Legal Docs', icon: '⚖️' },
    { path: '/radio', label: 'Radio Archives', icon: '📻' },
    { path: '/radio-analysis', label: 'Radio Analysis', icon: '📊' },
  ]

  const systemItems = [
    { path: '/data-sources', label: 'Data Sources', icon: '💾' },
    { path: '/data-quality', label: 'Data Quality', icon: '📈' },
    { path: '/tasks', label: 'Tasks', icon: '⚙️' },
    { path: '/logs', label: 'Logs', icon: '📋' },
  ]

  // Check if any system item is active
  const isSystemActive = systemItems.some(item => location.pathname === item.path)

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-blue-900 dark:bg-gray-900 text-white min-h-screen flex flex-col shadow-xl`}>
      {/* Header */}
      <div className="p-4 border-b border-blue-800 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <Link to="/" className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
            <span className="text-2xl">🚁</span>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold">Phoenix PD</h1>
                <p className="text-xs text-blue-200 dark:text-gray-300">Helicopter Tracker</p>
              </div>
            )}
          </Link>

          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`${isCollapsed ? 'mx-auto mt-2' : ''} p-1.5 rounded-lg hover:bg-blue-800 dark:hover:bg-gray-800 transition-colors`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all ${
              location.pathname === item.path
                ? 'bg-blue-700 dark:bg-gray-700 text-white shadow-md'
                : 'hover:bg-blue-800 dark:hover:bg-gray-800 text-blue-100 dark:text-gray-200'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </Link>
        ))}

        {/* System Group */}
        <div className="mt-4 pt-4 border-t border-blue-800 dark:border-gray-700">
          <button
            onClick={() => setIsSystemExpanded(!isSystemExpanded)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all ${
              isSystemActive
                ? 'bg-blue-700 dark:bg-gray-700 text-white'
                : 'hover:bg-blue-800 dark:hover:bg-gray-800 text-blue-100 dark:text-gray-200'
            }`}
            title={isCollapsed ? 'System' : ''}
          >
            <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
              <span className="text-xl">⚡</span>
              {!isCollapsed && (
                <span className="text-sm font-medium">System</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-xs">
                {isSystemExpanded ? '▼' : '▶'}
              </span>
            )}
          </button>

          {/* System Items (shown when expanded) */}
          {isSystemExpanded && (
            <div className="mt-1 space-y-1">
              {systemItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 pl-6'} px-3 py-2 rounded-lg transition-all ${
                    location.pathname === item.path
                      ? 'bg-blue-600 dark:bg-gray-600 text-white'
                      : 'hover:bg-blue-800 dark:hover:bg-gray-800 text-blue-100 dark:text-gray-200'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
