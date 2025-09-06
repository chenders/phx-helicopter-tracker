import { Link, useLocation } from 'react-router-dom'
import { ThemeSelector } from './ThemeSelector'

export const Navbar = () => {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/live', label: 'Live Tracking', icon: '📡' },
    { path: '/historical', label: 'Historical', icon: '📊' },
    { path: '/patterns', label: 'Patterns', icon: '🔍' },
    { path: '/costs', label: 'Cost Analysis', icon: '💰' },
    { path: '/legal', label: 'Legal Docs', icon: '⚖️' },
    { path: '/data-sources', label: 'Data Sources', icon: '💾' },
    { path: '/tasks', label: 'Tasks', icon: '⚙️' },
  ]

  return (
    <nav className="bg-blue-900 dark:bg-gray-900 text-white shadow-lg transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🚁</span>
            <div>
              <h1 className="text-xl font-bold">Phoenix PD Helicopter Tracker</h1>
              <p className="text-sm text-blue-200 dark:text-gray-300">Comprehensive Surveillance Monitoring</p>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-700 dark:bg-gray-700 text-white'
                    : 'hover:bg-blue-800 dark:hover:bg-gray-800 text-blue-100 dark:text-gray-200'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
            </div>
            <ThemeSelector />
          </div>
          
          {/* Mobile menu button */}
          <button className="md:hidden">
            <span className="text-2xl">☰</span>
          </button>
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-700 dark:bg-gray-700 text-white'
                    : 'hover:bg-blue-800 dark:hover:bg-gray-800 text-blue-100 dark:text-gray-200'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}