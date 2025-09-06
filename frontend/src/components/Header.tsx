import { ThemeSelector } from './ThemeSelector'

export const Header = () => {
  return (
    <header className="absolute top-0 right-0 p-4 flex items-center gap-6 z-50">
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
    </header>
  )
}