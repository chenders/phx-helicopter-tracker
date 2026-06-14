import React, { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, Clock, Activity } from 'lucide-react'
import axios from '@/lib/axios'

interface DiscrepancyData {
  month: string
  avg_discrepancy_minutes: number
  max_discrepancy_minutes: number
  flights_with_discrepancy: number
  total_flights: number
  pct_with_discrepancy: number
  flights_50pct_longer: number
  flights_double: number
}

interface FlightDiscrepancy {
  id: number
  flight_id: string
  departure_time: string
  recorded_duration_minutes: number
  actual_span_minutes: number
  discrepancy_minutes: number
  minutes_before_departure: number
  minutes_after_arrival: number
}

interface SummaryStats {
  total_flights: number
  flights_with_early_positions: number
  flights_with_late_positions: number
  flights_with_any_discrepancy: number
  flights_with_50pct_longer_span: number
  flights_with_double_span: number
  avg_discrepancy_minutes: number
  max_discrepancy_minutes: number
}

export function DataQualityPage() {
  // Try to restore data from sessionStorage on mount
  const [timeSeriesData, setTimeSeriesData] = useState<DiscrepancyData[]>(() => {
    const cached = sessionStorage.getItem('dataQuality_timeSeries')
    return cached ? JSON.parse(cached) : []
  })
  const [worstCases, setWorstCases] = useState<FlightDiscrepancy[]>(() => {
    const cached = sessionStorage.getItem('dataQuality_worstCases')
    return cached ? JSON.parse(cached) : []
  })
  const [summary, setSummary] = useState<SummaryStats | null>(() => {
    const cached = sessionStorage.getItem('dataQuality_summary')
    return cached ? JSON.parse(cached) : null
  })
  const [loading, setLoading] = useState(() => {
    // Only show loading if we don't have cached data
    return !sessionStorage.getItem('dataQuality_summary')
  })
  const [initialLoadComplete, setInitialLoadComplete] = useState(() => {
    return !!sessionStorage.getItem('dataQuality_summary')
  })

  useEffect(() => {
    // Only fetch if we haven't loaded data yet
    if (!initialLoadComplete) {
      fetchDataQuality()
    }
  }, [])

  const fetchDataQuality = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true)
      }
      const response = await axios.get('/api/v1/flights/data-quality-metrics')

      // Update state
      setTimeSeriesData(response.data.time_series)
      setWorstCases(response.data.worst_cases)
      setSummary(response.data.summary)
      setInitialLoadComplete(true)

      // Cache in sessionStorage to survive remounts during screenshots
      sessionStorage.setItem('dataQuality_timeSeries', JSON.stringify(response.data.time_series))
      sessionStorage.setItem('dataQuality_worstCases', JSON.stringify(response.data.worst_cases))
      sessionStorage.setItem('dataQuality_summary', JSON.stringify(response.data.summary))
    } catch (error) {
      console.error('Error fetching data quality metrics:', error)
      setInitialLoadComplete(true)
    } finally {
      if (showLoadingSpinner) {
        setLoading(false)
      }
    }
  }

  const getDiscrepancyColor = (discrepancy: number) => {
    if (discrepancy < 10) return '#10b981' // green
    if (discrepancy < 30) return '#f59e0b' // yellow
    if (discrepancy < 60) return '#f97316' // orange
    return '#ef4444' // red
  }

  if (loading && !initialLoadComplete) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Data Quality Analysis
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Flight metadata vs. position data discrepancy tracking
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Flights</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_flights.toLocaleString()}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">With Discrepancy</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {Math.round((summary.flights_with_any_discrepancy / summary.total_flights) * 100)}%
                </p>
                <p className="text-xs text-gray-500">
                  {summary.flights_with_any_discrepancy.toLocaleString()} flights
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Discrepancy</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {Math.round(summary.avg_discrepancy_minutes)} min
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Discrepancy</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Math.round(summary.max_discrepancy_minutes)} min
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Time Series Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Discrepancy Trends Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg_discrepancy_minutes"
              stroke="#f59e0b"
              name="Avg Discrepancy (min)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="max_discrepancy_minutes"
              stroke="#ef4444"
              name="Max Discrepancy (min)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Percentage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Percentage of Flights with Issues Over Time
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Legend />
            <Bar dataKey="pct_with_discrepancy" fill="#f59e0b" name="% with Any Discrepancy" />
            <Bar dataKey={(data) => (data.flights_50pct_longer / data.total_flights) * 100} fill="#f97316" name="% 50%+ Longer" />
            <Bar dataKey={(data) => (data.flights_double / data.total_flights) * 100} fill="#ef4444" name="% Double Duration" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter Plot */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recorded vs Actual Flight Duration (Top 50 Worst Cases)
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="recorded_duration_minutes"
              name="Recorded Duration (min)"
              label={{ value: 'Recorded Duration (minutes)', position: 'bottom' }}
            />
            <YAxis
              dataKey="actual_span_minutes"
              name="Actual Span (min)"
              label={{ value: 'Actual Position Span (minutes)', angle: -90, position: 'left' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'Recorded Duration (min)') return [`${Math.round(value)} min`, 'Recorded']
                if (name === 'Actual Span (min)') return [`${Math.round(value)} min`, 'Actual']
                return [value, name]
              }}
            />
            <Scatter data={worstCases} fill="#8884d8">
              {worstCases.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getDiscrepancyColor(entry.discrepancy_minutes)} />
              ))}
            </Scatter>
            {/* Reference line showing where they should match */}
            <Line
              type="monotone"
              dataKey={(d: any) => d.recorded_duration_minutes}
              data={worstCases}
              stroke="#666"
              strokeDasharray="5 5"
              name="Perfect Match"
              dot={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-gray-600 dark:text-gray-400">&lt; 10 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-gray-600 dark:text-gray-400">10-30 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span className="text-gray-600 dark:text-gray-400">30-60 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-gray-600 dark:text-gray-400">&gt; 60 min</span>
          </div>
        </div>
      </div>

      {/* Top 10 Worst Cases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top 10 Worst Discrepancies
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Flight ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recorded Duration
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actual Span
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Discrepancy
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Before Departure
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  After Arrival
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {worstCases.slice(0, 10).map((flight) => (
                <tr key={flight.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                    {flight.flight_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(flight.departure_time).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {Math.round(flight.recorded_duration_minutes)} min
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {Math.round(flight.actual_span_minutes)} min
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className="font-semibold"
                      style={{ color: getDiscrepancyColor(flight.discrepancy_minutes) }}
                    >
                      +{Math.round(flight.discrepancy_minutes)} min
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {Math.round(flight.minutes_before_departure)} min
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {Math.round(flight.minutes_after_arrival)} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Data Recalculation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Automatically updates as new flight data is imported
            </p>
          </div>
          <button
            onClick={() => fetchDataQuality()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}
