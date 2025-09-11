import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'dark' | 'darker'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'darker'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)

    // Remove all theme classes
    document.documentElement.classList.remove('dark', 'darker')

    // Add current theme class
    document.documentElement.classList.add(theme)

    // Both themes use dark mode
    document.documentElement.classList.add('dark')
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
