import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts'
import { usePatternAnalysis } from '../hooks/usePatternAnalysis'
import { useSurveillanceHotspots } from '../hooks/useSurveillanceHotspots'

const COLORS = ['#dc2626', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']

export function PatternAnalysisPage() {
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d, 1y
  const [analysisType, setAnalysisType] = useState('surveillance') // surveillance, geographic, temporal, constitutional
  
  const { data: patternData, isLoading } = usePatternAnalysis(timeRange)
  const { data: hotspots } = useSurveillanceHotspots(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing surveillance patterns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Surveillance Pattern Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive analysis of Phoenix PD helicopter surveillance patterns to identify systematic 
          constitutional violations and discriminatory enforcement practices.
        </p>
        
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Constitutional Violations Detected</h3>
          <p className="text-sm text-red-700 dark:text-red-200">
            Analysis has identified {patternData?.constitutional_violations || 0} potential Fourth Amendment violations
            based on surveillance intensity, duration, and location patterns. This data is court-ready for litigation.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Analysis Type</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="surveillance">Surveillance Patterns</option>
              <option value="geographic">Geographic Distribution</option>
              <option value="temporal">Temporal Analysis</option>
              <option value="constitutional">Constitutional Impact</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">⚖️</div>
          <div className="text-2xl font-bold text-red-600">
            {patternData?.constitutional_violations || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Constitutional Violations</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-2xl font-bold text-orange-600">
            {patternData?.surveillance_hotspots || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Surveillance Hotspots</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-blue-600">
            {patternData?.avg_hover_duration || 0}min
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Hover Duration</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-purple-600">
            {((patternData?.surveillance_ratio || 0) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Surveillance Flight Ratio</div>
        </div>
      </div>

      {/* Charts - Conditional rendering based on analysis type */}
      {analysisType === 'surveillance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Surveillance Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Daily Surveillance Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={patternData?.daily_activity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  `${value} ${name === 'surveillance_flights' ? 'surveillance flights' : 'incidents'}`,
                  name === 'surveillance_flights' ? 'Surveillance Flights' : 'Constitutional Violations'
                ]}
              />
              <Line type="monotone" dataKey="surveillance_flights" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="constitutional_violations" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Surveillance by Hour */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Surveillance Activity by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patternData?.hourly_distribution || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value} flights`, 'Surveillance Flights']} />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Surveillance by Neighborhood</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={patternData?.neighborhood_distribution || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="neighborhood" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${value} incidents`, 'Surveillance Incidents']}
              />
              <Bar dataKey="surveillance_count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        </div>
      )}

      {analysisType === 'geographic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Geographic Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Surveillance by Neighborhood</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={patternData?.neighborhood_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="neighborhood" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value} incidents`, 'Surveillance Incidents']}
                />
                <Bar dataKey="surveillance_count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Surveillance Hotspots Map Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Hotspot Locations</h3>
            <div className="space-y-3">
              {hotspots?.slice(0, 5).map((hotspot: any, index: number) => (
                <div key={hotspot.location} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{hotspot.location}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {hotspot.event_count} surveillance events
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      {hotspot.constitutional_risk}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analysisType === 'temporal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Surveillance Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Daily Surveillance Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={patternData?.daily_activity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value} ${name === 'surveillance_flights' ? 'surveillance flights' : 'incidents'}`,
                    name === 'surveillance_flights' ? 'Surveillance Flights' : 'Constitutional Violations'
                  ]}
                />
                <Line type="monotone" dataKey="surveillance_flights" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="constitutional_violations" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Surveillance by Hour */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Surveillance Activity by Hour</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={patternData?.hourly_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value} flights`, 'Surveillance Flights']} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {analysisType === 'constitutional' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Constitutional Violation Types */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Constitutional Violation Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={patternData?.violation_types || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(patternData?.violation_types || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          </div>

          {/* Pattern Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Constitutional Violations Analysis</h3>
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/30 rounded">
                <h4 className="font-semibold text-red-800 dark:text-red-300">Total Violations</h4>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {patternData?.constitutional_violations || 0}
                </p>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  Documented instances of potential Fourth Amendment violations
                </p>
              </div>

              <div className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/30 rounded">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300">Excessive Hovering</h4>
                <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                  {patternData?.excessive_hovering_events || 0} events of prolonged hovering
                </p>
              </div>

              <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">Low-Altitude Violations</h4>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  {patternData?.low_altitude_violations || 0} flights below 400 feet
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surveillance Hotspots */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Surveillance Hotspots</h3>
          <div className="space-y-3">
            {hotspots?.slice(0, 5).map((hotspot: any, index: number) => (
              <div key={hotspot.location} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{hotspot.location}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {hotspot.event_count} surveillance events
                  </div>
                  <div className="text-sm text-orange-600">
                    Surveillance Score: {(hotspot.surveillance_intensity * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Demographics: {hotspot.demographic_info}
                  </div>
                  <div className="text-sm font-medium text-red-600">
                    {hotspot.constitutional_risk}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Key Pattern Insights</h3>
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/30 rounded">
              <h4 className="font-semibold text-red-800 dark:text-red-300">Discriminatory Surveillance</h4>
              <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                Analysis shows {((patternData?.discriminatory_ratio || 0) * 100).toFixed(1)}% higher surveillance
                rates in minority communities compared to affluent areas, indicating potential civil rights violations.
              </p>
            </div>

            <div className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/30 rounded">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300">Excessive Hovering</h4>
              <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                {patternData?.excessive_hovering_events || 0} events of prolonged hovering ({'>'} 2 minutes)
                over residential areas without apparent emergency, violating reasonable privacy expectations.
              </p>
            </div>

            <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300">Low-Altitude Surveillance</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                {patternData?.low_altitude_violations || 0} flights below 400 feet over residential areas,
                creating unreasonable noise and privacy intrusion without emergency justification.
              </p>
            </div>

            <div className="p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/30 rounded">
              <h4 className="font-semibold text-purple-800 dark:text-purple-300">Systematic Patterns</h4>
              <p className="text-sm text-purple-700 dark:text-purple-200 mt-1">
                Regular surveillance routes detected with {patternData?.systematic_patrol_routes || 0} 
                repeated patterns indicating systematic rather than incident-responsive deployment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Legal Analysis Summary</h3>
        <div className="prose max-w-none text-sm text-gray-700 dark:text-gray-300">
          <p className="mb-4">
            <strong>Fourth Amendment Implications:</strong> The pattern analysis reveals systematic 
            surveillance practices that likely violate the Fourth Amendment's protection against 
            unreasonable searches. Key violations include:
          </p>
          <ul className="mb-4 space-y-2">
            <li>• <strong>Prolonged Surveillance:</strong> Extended hovering over private residences 
            without warrants or exigent circumstances</li>
            <li>• <strong>Discriminatory Enforcement:</strong> Disproportionate surveillance in 
            minority communities suggesting equal protection violations</li>
            <li>• <strong>Technology-Enhanced Surveillance:</strong> Use of FLIR and high-resolution 
            cameras exceeding plain view doctrine protections</li>
            <li>• <strong>Pattern Surveillance:</strong> Systematic routes indicating dragnet 
            surveillance rather than individualized suspicion</li>
          </ul>
          <p>
            <strong>Litigation Readiness:</strong> This data provides comprehensive evidence of 
            constitutional violations suitable for civil rights litigation, including statistical 
            analysis, geographic patterns, and individual incident documentation required for 
            successful legal challenges to unconstitutional surveillance practices.
          </p>
        </div>
      </div>
    </div>
  )
}