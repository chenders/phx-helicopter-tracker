import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useCostAnalysis } from '../hooks/useCostAnalysis'

const COLORS = ['#dc2626', '#f59e0b', '#3b82f6', '#10b981']

export function CostAnalysisPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [analysisType, setAnalysisType] = useState('surveillance') // surveillance, operational, comparative

  // Debug logging
  console.log('Current analysisType:', analysisType)

  const { data: costData, isLoading } = useCostAnalysis(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Calculating surveillance costs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Taxpayer Cost Analysis</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Comprehensive financial analysis of Phoenix PD helicopter surveillance operations, 
          documenting taxpayer waste and alternative funding opportunities for litigation purposes.
        </p>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Economic Impact Evidence</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-200">
            Cost analysis demonstrates ${costData?.total_surveillance_cost?.toLocaleString() || 0} in taxpayer 
            funds wasted on unconstitutional surveillance activities that could fund {Math.floor((costData?.total_surveillance_cost || 0) / 65000)} 
            police officer salaries or {Math.floor((costData?.total_surveillance_cost || 0) / 12000)} 
            student education grants annually.
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
              <option value="surveillance">Surveillance Costs</option>
              <option value="operational">Operational Breakdown</option>
              <option value="comparative">Alternative Funding</option>
            </select>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-sm text-gray-900 dark:text-white">
        Current Analysis Type: <strong>{analysisType}</strong>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">💸</div>
          <div className="text-2xl font-bold text-red-600">
            ${costData?.total_surveillance_cost?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Surveillance Waste</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">⏰</div>
          <div className="text-2xl font-bold text-orange-600">
            {costData?.surveillance_flight_hours?.toFixed(1) || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Surveillance Flight Hours</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-blue-600">
            ${costData?.cost_per_resident?.toFixed(2) || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Cost Per Phoenix Resident</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <div className="text-3xl mb-2">🗑️</div>
          <div className="text-2xl font-bold text-purple-600">
            {((costData?.waste_percentage || 0) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Budget Waste Percentage</div>
        </div>
      </div>

      {/* Surveillance Analysis */}
      {analysisType === 'surveillance' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Costs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Daily Surveillance Costs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costData?.daily_costs || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Daily Cost']} />
                  <Line type="monotone" dataKey="surveillance_cost" stroke="#dc2626" strokeWidth={2} name="Surveillance" />
                  <Line type="monotone" dataKey="legitimate_cost" stroke="#10b981" strokeWidth={2} name="Legitimate" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cost by Aircraft */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Surveillance Cost by Aircraft</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costData?.aircraft_costs || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="aircraft" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Surveillance Cost']} />
                  <Bar dataKey="surveillance_cost" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparative Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">National Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Phoenix vs National Average</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hourly Operating Cost</span>
                    <div className="text-right">
                      <div className="font-semibold">${costData?.hourly_rate || 2160}</div>
                      <div className="text-xs text-red-500">+20% above average</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Surveillance Ratio</span>
                    <div className="text-right">
                      <div className="font-semibold">{((costData?.surveillance_ratio || 0.59) * 100).toFixed(0)}%</div>
                      <div className="text-xs text-red-500">+68% above average</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Annual Impact</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Phoenix Annual Surveillance</span>
                    <span className="font-semibold">${costData?.annual_surveillance_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">National Average</span>
                    <span className="font-semibold">${costData?.national_avg_annual?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Operational Breakdown */}
      {analysisType === 'operational' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Cost Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Hourly Operations Costs</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">Fuel Costs</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${costData?.hourly_breakdown?.fuel || 540}/hour</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">Personnel (2 officers)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${costData?.hourly_breakdown?.personnel || 120}/hour</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">Equipment Depreciation</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${costData?.hourly_breakdown?.equipment || 800}/hour</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">Maintenance</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${costData?.hourly_breakdown?.maintenance || 400}/hour</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">Insurance & Overhead</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${costData?.hourly_breakdown?.overhead || 300}/hour</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded border-2 border-blue-200 dark:border-blue-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Hourly Cost</span>
                  <span className="font-bold text-blue-600">${costData?.hourly_rate || 2160}/hour</span>
                </div>
              </div>
            </div>

            {/* Budget Allocation Pie Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Budget Allocation</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Legitimate Ops', value: costData?.legitimate_operations_cost || 0 },
                      { name: 'Surveillance', value: costData?.surveillance_cost || 0 },
                      { name: 'Admin', value: costData?.administrative_cost || 0 },
                      { name: 'Training/Maint', value: costData?.training_maintenance_cost || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2, 3].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost by Aircraft for Operational View */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Total Cost by Aircraft</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costData?.aircraft_costs || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="aircraft" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total Cost']} />
                <Bar dataKey="total_cost" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Alternative Funding Analysis */}
      {analysisType === 'comparative' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Alternative Uses of Surveillance Funds</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center mb-3">
                  <div className="text-3xl mr-3">👮‍♀️</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Additional Police Officers</h4>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {Math.floor((costData?.total_surveillance_cost || 0) / 65000)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full-time police officer positions that could be funded with surveillance waste
                </p>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center mb-3">
                  <div className="text-3xl mr-3">🎓</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Student Scholarships</h4>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {Math.floor((costData?.total_surveillance_cost || 0) / 12000)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Annual college scholarships for Phoenix students
                </p>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center mb-3">
                  <div className="text-3xl mr-3">🏥</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Community Health</h4>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {Math.floor((costData?.total_surveillance_cost || 0) / 85000)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Community health programs or mental health services
                </p>
              </div>
            </div>
          </div>

          {/* Comparative Cost Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Cost Comparison - Phoenix vs National Average</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    category: 'Hourly Rate',
                    Phoenix: costData?.hourly_rate || 2160,
                    'National Avg': costData?.national_avg_hourly || 1800
                  },
                  {
                    category: 'Annual Surveillance',
                    Phoenix: (costData?.annual_surveillance_cost || 0) / 1000,
                    'National Avg': (costData?.national_avg_annual || 0) / 1000
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: any, name: string) => {
                  if (name.includes('Annual')) {
                    return [`$${(value * 1000).toLocaleString()}`, name]
                  }
                  return [`$${value.toLocaleString()}`, name]
                }} />
                <Bar dataKey="Phoenix" fill="#dc2626" />
                <Bar dataKey="National Avg" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legal Impact */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Legal & Economic Impact</h3>
            <ul className="mb-4 space-y-2 text-gray-900 dark:text-gray-300">
              <li>• <strong>Excessive Costs:</strong> Phoenix PD surveillance operations cost 
              ${(costData?.cost_per_resident || 0).toFixed(2)} per resident annually, 20% above national averages</li>
              <li>• <strong>Opportunity Cost:</strong> Surveillance waste could fund {Math.floor((costData?.total_surveillance_cost || 0) / 65000)} 
              additional police officers for legitimate law enforcement</li>
              <li>• <strong>Discriminatory Impact:</strong> Higher surveillance spending in minority communities 
              creates economic burden without corresponding public safety benefits</li>
              <li>• <strong>Constitutional Violations:</strong> Taxpayer funds used for Fourth Amendment violations 
              create legal liability and potential damages</li>
            </ul>
            <p className="text-gray-900 dark:text-gray-300">
              <strong>Damages Calculation:</strong> Economic analysis supports claims for taxpayer restitution, 
              injunctive relief requiring budget reallocation, and implementation of constitutional compliance 
              measures to prevent future waste of public resources on illegal surveillance activities.
            </p>
          </div>
        </>
      )}
    </div>
  )
}