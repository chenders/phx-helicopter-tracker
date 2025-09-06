import { useState, useRef, useEffect } from 'react'
import { useTheme, Theme } from '../contexts/ThemeContext'

const themes = [
  { 
    id: 'light' as Theme, 
    name: 'Light', 
    icon: '☀️',
    description: 'Classic light theme',
    preview: 'bg-white text-gray-900'
  },
  { 
    id: 'dark' as Theme, 
    name: 'Dark', 
    icon: '🌙',
    description: 'Dark mode for night viewing',
    preview: 'bg-gray-900 text-gray-100'
  },
  { 
    id: 'flightradar' as Theme, 
    name: 'FlightRadar', 
    icon: '✈️',
    description: 'Modern aviation theme',
    preview: 'bg-slate-950 text-cyan-50'
  },
]

interface ThemeSelectorProps {
  collapsed?: boolean
}

export function ThemeSelector({ collapsed = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const currentTheme = themes.find(t => t.id === theme) || themes[0]
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center ${collapsed ? 'justify-center w-10 h-10' : 'space-x-2 px-3 py-2'} rounded-lg bg-white/10 hover:bg-white/20 transition-colors`}
        aria-label="Theme selector"
        title={collapsed ? currentTheme.name : ''}
      >
        <span className="text-lg">{currentTheme.icon}</span>
        {!collapsed && (
          <>
            <span className="text-sm font-medium">{currentTheme.name}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
      
      {isOpen && (
        <div className={`absolute ${collapsed ? 'left-full ml-2 bottom-0' : 'right-0 mt-2'} w-64 rounded-lg shadow-xl bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50`}>
          <div className="p-2">
            {themes.map((themeOption) => (
              <button
                key={themeOption.id}
                onClick={() => {
                  setTheme(themeOption.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-start space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  theme === themeOption.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-2xl">{themeOption.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {themeOption.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {themeOption.description}
                  </div>
                  <div className={`mt-1 h-6 rounded ${themeOption.preview} border dark:border-gray-600`} />
                </div>
                {theme === themeOption.id && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}