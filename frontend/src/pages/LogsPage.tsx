import { useState, useEffect } from 'react'
import { PageHeader } from '../components/PageHeader'

interface LogLevel {
  value: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  label: string
  color: string
  bgColor: string
}

interface LogCategory {
  value: string
  label: string
}

interface SystemLog {
  id: number
  level: string
  category: string
  message: string
  source?: string
  task_id?: string
  flight_id?: string
  registration?: string
  error_type?: string
  error_details?: string
  context_metadata?: string
  created_at: string
}

interface PaginatedLogsResponse {
  logs: SystemLog[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

const LOG_LEVELS: LogLevel[] = [
  { value: 'debug', label: 'Debug', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { value: 'info', label: 'Info', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'warning', label: 'Warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { value: 'error', label: 'Error', color: 'text-red-600', bgColor: 'bg-red-100' },
  { value: 'critical', label: 'Critical', color: 'text-red-800', bgColor: 'bg-red-200' },
]

export const LogsPage = () => {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Fetch available categories on mount
  useEffect(() => {
    fetch('/api/v1/logs/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error)
  }, [])

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      })

      if (selectedLevel) params.append('level', selectedLevel)
      if (selectedCategory) params.append('category', selectedCategory)
      if (searchText) params.append('search', searchText)

      const response = await fetch(`/api/v1/logs/?${params}`)
      const data: PaginatedLogsResponse = await response.json()

      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch logs on filter changes
  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, selectedLevel, selectedCategory])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, page, pageSize, selectedLevel, selectedCategory, searchText])

  const getLevelStyle = (level: string) => {
    const levelConfig = LOG_LEVELS.find(l => l.value === level)
    return levelConfig || { color: 'text-gray-600', bgColor: 'bg-gray-100' }
  }

  const toggleLogDetails = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="System Logs"
        subtitle="Monitor system events, errors, and anomalies"
        icon="📋"
      />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Log Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Log Level
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Levels</option>
              {LOG_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {formatCategory(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  fetchLogs()
                }
              }}
              placeholder="Search in messages..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Page Size and Auto-refresh */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Per Page
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-md transition-colors ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              {autoRefresh ? '🔄' : '⏸'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {logs.length > 0 ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}` : '0'} of {total} logs
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const levelStyle = getLevelStyle(log.level)
                  const isExpanded = expandedLogs.has(log.id)

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${levelStyle.bgColor} ${levelStyle.color}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {formatCategory(log.category)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="max-w-xl">
                          <p className="truncate">{log.message}</p>
                          {log.flight_id && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Flight: {log.flight_id}
                            </span>
                          )}
                          {log.registration && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              Aircraft: {log.registration}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(log.error_details || log.context_metadata) && (
                          <button
                            onClick={() => toggleLogDetails(log.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {isExpanded ? '▼ Hide' : '▶ Show'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Details */}
        {logs.map((log) => {
          if (!expandedLogs.has(log.id)) return null

          return (
            <div key={`details-${log.id}`} className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                {log.source && (
                  <div>
                    <span className="font-semibold text-sm">Source:</span> {log.source}
                  </div>
                )}
                {log.task_id && (
                  <div>
                    <span className="font-semibold text-sm">Task ID:</span> {log.task_id}
                  </div>
                )}
                {log.error_type && (
                  <div>
                    <span className="font-semibold text-sm">Error Type:</span> {log.error_type}
                  </div>
                )}
                {log.error_details && (
                  <div>
                    <span className="font-semibold text-sm">Error Details:</span>
                    <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                      {log.error_details}
                    </pre>
                  </div>
                )}
                {log.context_metadata && (
                  <div>
                    <span className="font-semibold text-sm">Context:</span>
                    <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(JSON.parse(log.context_metadata), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center space-x-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      )}
    </div>
  )
}