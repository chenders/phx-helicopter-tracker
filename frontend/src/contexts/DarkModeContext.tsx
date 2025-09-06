import React, { createContext, useContext, useState, useEffect } from 'react'

interface DarkModeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export const useDarkMode = () => {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
}

interface DarkModeProviderProps {
  children: React.ReactNode
}

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('phx-helicopters-dark-mode')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'true')
    } else {
      setIsDarkMode(systemPrefersDark)
    }
  }, [])

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => {
    const newIsDarkMode = !isDarkMode
    setIsDarkMode(newIsDarkMode)
    localStorage.setItem('phx-helicopters-dark-mode', newIsDarkMode.toString())
  }

  const setDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('phx-helicopters-dark-mode', isDark.toString())
  }

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}