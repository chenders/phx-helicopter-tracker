/**
 * Theme-aware color utilities
 * Provides consistent colors that adapt to the current theme
 */

export const themeColors = {
  // Status colors
  success: {
    bg: 'bg-white dark:bg-gray-700 border border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    button: 'bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white',
    accent: 'border-green-500 dark:border-green-400'
  },
  
  error: {
    bg: 'bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    button: 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white',
    accent: 'border-red-500 dark:border-red-400'
  },
  
  warning: {
    bg: 'bg-white dark:bg-gray-700 border border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    button: 'bg-yellow-600 dark:bg-yellow-700 hover:bg-yellow-700 dark:hover:bg-yellow-600 text-white',
    accent: 'border-yellow-500 dark:border-yellow-400'
  },
  
  info: {
    bg: 'bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    button: 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white',
    accent: 'border-blue-500 dark:border-blue-400'
  },
  
  purple: {
    bg: 'bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    button: 'bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600 text-white',
    accent: 'border-purple-500 dark:border-purple-400'
  },
  
  orange: {
    bg: 'bg-white dark:bg-gray-700 border border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    button: 'bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-600 text-white',
    accent: 'border-orange-500 dark:border-orange-400'
  },
  
  indigo: {
    bg: 'bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    button: 'bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white',
    accent: 'border-indigo-500 dark:border-indigo-400'
  },
  
  // Alert boxes with left border
  alertBox: {
    success: 'bg-white dark:bg-gray-800 border-l-4 border-green-500 dark:border-green-400 p-4 rounded shadow-sm',
    error: 'bg-white dark:bg-gray-800 border-l-4 border-red-500 dark:border-red-400 p-4 rounded shadow-sm',
    warning: 'bg-white dark:bg-gray-800 border-l-4 border-yellow-500 dark:border-yellow-400 p-4 rounded shadow-sm',
    info: 'bg-white dark:bg-gray-800 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded shadow-sm',
    purple: 'bg-white dark:bg-gray-800 border-l-4 border-purple-500 dark:border-purple-400 p-4 rounded shadow-sm',
    orange: 'bg-white dark:bg-gray-800 border-l-4 border-orange-500 dark:border-orange-400 p-4 rounded shadow-sm'
  },
  
  // Status indicators
  statusDot: {
    active: 'bg-green-500 dark:bg-green-400',
    inactive: 'bg-gray-400 dark:bg-gray-600',
    warning: 'bg-yellow-500 dark:bg-yellow-400',
    error: 'bg-red-500 dark:bg-red-400'
  }
}

// Helper function to get theme-aware card classes
export function getCardClasses(color: keyof typeof themeColors = 'info') {
  return `bg-white dark:bg-gray-800 border ${themeColors[color].accent} rounded-lg p-6 transition-all shadow-sm hover:shadow-md`
}