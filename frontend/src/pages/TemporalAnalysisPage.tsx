import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTimeAnalysis } from '../hooks/useTimeAnalysis'

type AnalysisType = 'hourly' | 'daily' | 'weekly' | 'monthly'

export function TemporalAnalysisPage() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('daily')
  const [selectedAircraft, setSelectedAircraft] = useState<string[]>([])

  const { data: timeData, isLoading, error } = useTimeAnalysis({
    analysisType,
    aircraftFilter: selectedAircraft.length > 0 ? selectedAircraft : undefined,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing temporal patterns...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
        <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Error Loading Data</h3>
        <p className="text-sm text-red-700 dark:text-red-200">
          Failed to load temporal analysis. Please try again later.
        </p>
      </div>
    )
  }

  // Prepare chart data
  const chartData = timeData?.time_periods?.map((period: string, index: number) => ({
    period,
    flights: timeData.flight_counts[index] || 0,
    hours: timeData.flight_hours[index] || 0,
    cost: timeData.cost_estimates[index] || 0,
    surveillanceRatio: (timeData.surveillance_likelihood_by_period[period] || 0) * 100,
  })) || []

  const totalFlights = timeData?.flight_counts?.reduce((a: number, b: number) => a + b, 0) || 0
  const totalHours = timeData?.flight_hours?.reduce((a: number, b: number) => a + b, 0) || 0
  const totalCost = timeData?.cost_estimates?.reduce((a: number, b: number) => a + b, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Temporal Pattern Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze helicopter flight patterns over time to identify trends, peak activity periods,
          and unusual surveillance behavior.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Analysis Type
            </label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="hourly">Hourly (Last 7 Days)</option>
              <option value="daily">Daily (Last 30 Days)</option>
              <option value="weekly">Weekly (Last 12 Weeks)</option>
              <option value="monthly">Monthly (Last 12 Months)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">✈️</div>
          <div className="text-2xl font-bold text-blue-600">{totalFlights}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Flights</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-green-600">{totalHours.toFixed(1)}h</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Flight Hours</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-orange-600">
            ${totalCost.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flight Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Flight Activity Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'flights') return [`${value} flights`, 'Flight Count']
                  return [value, name]
                }}
              />
              <Bar dataKey="flights" fill="#3b82f6" name="flights" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flight Hours Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Flight Hours Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [`${Number(value).toFixed(1)} hours`, 'Flight Hours']}
              />
              <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Analysis Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Cost Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Cost']}
              />
              <Bar dataKey="cost" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Surveillance Ratio Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Surveillance Ratio Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Surveillance Ratio']}
              />
              <Line
                type="monotone"
                dataKey="surveillanceRatio"
                stroke="#dc2626"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Activity Periods */}
      {timeData?.peak_activity_periods && timeData.peak_activity_periods.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Peak Activity Periods
          </h3>
          <div className="flex flex-wrap gap-2">
            {timeData.peak_activity_periods.map((period: string) => (
              <span
                key={period}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium"
              >
                {period}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            These periods show significantly higher activity than average (>2 standard deviations from mean).
          </p>
        </div>
      )}

      {/* Unusual Activity Periods */}
      {timeData?.unusual_activity_periods && timeData.unusual_activity_periods.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Unusual Activity Periods
          </h3>
          <div className="space-y-3">
            {timeData.unusual_activity_periods.map((unusual: any, index: number) => (
              <div
                key={index}
                className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/30 rounded"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                      {unusual.period}
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                      {unusual.description}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded text-xs font-medium">
                    {unusual.reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Implications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Legal Implications
        </h3>
        <div className="prose max-w-none text-sm text-gray-700 dark:text-gray-300">
          <p className="mb-4">
            <strong>Temporal Analysis for Litigation:</strong> Time-based patterns can reveal systematic
            surveillance practices that may violate constitutional protections:
          </p>
          <ul className="mb-4 space-y-2">
            <li>
              • <strong>Peak Activity Periods:</strong> Unusually high activity during specific times
              may indicate systematic patrol routes rather than emergency response
            </li>
            <li>
              • <strong>Night Surveillance:</strong> Flights during late night hours (22:00-06:00)
              over residential areas heighten privacy concerns
            </li>
            <li>
              • <strong>High Surveillance Ratios:</strong> Periods with >75% surveillance flights
              suggest non-emergency operations
            </li>
            <li>
              • <strong>Pattern Consistency:</strong> Regular, predictable patterns indicate
              systematic surveillance programs
            </li>
          </ul>
          <p>
            This temporal data provides critical evidence for establishing patterns of unconstitutional
            surveillance behavior and can be used to demonstrate systematic rather than incident-driven
            helicopter deployment.
          </p>
        </div>
      </div>
    </div>
  )
}
