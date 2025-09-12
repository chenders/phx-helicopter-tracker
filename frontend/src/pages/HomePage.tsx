import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRealtimeFlights } from '../hooks/useRealtimeFlights'
import { useStats } from '../hooks/useStats'
import { formatRelativeTime, formatLocalTime } from '../utils/dateUtils'

interface DashboardStats {
  active_flights: number
  surveillance_events_today: number
  total_cost_today: number
  pattern_alerts: number
}

export function HomePage() {
  const { data: realtimeFlights } = useRealtimeFlights()
  const { data: stats } = useStats()
  
  const dashboardStats: DashboardStats = stats || {
    active_flights: 0,
    surveillance_events_today: 0,
    total_cost_today: 0,
    pattern_alerts: 0
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Phoenix PD Helicopter Surveillance Tracker
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Comprehensive real-time monitoring and analysis of Phoenix Police Department helicopter operations 
          to document surveillance patterns and constitutional violations for legal proceedings.
        </p>
        
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Legal Documentation System</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This platform automatically tracks, analyzes, and documents Phoenix PD helicopter surveillance activities 
            for use in legal challenges to unconstitutional surveillance practices. All data is collected from 
            publicly available sources and organized for litigation purposes.
          </p>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🚁</div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{dashboardStats.active_flights}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Active Flights</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">👁️</div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{dashboardStats.surveillance_events_today}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Surveillance Events Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">💰</div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                ${(dashboardStats.total_cost_today || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Taxpayer Cost Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🚨</div>
            <div>
              <p className="text-2xl font-bold text-red-600">{dashboardStats.pattern_alerts}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Pattern Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Current Phoenix PD Aircraft Activity</h2>
        {realtimeFlights && realtimeFlights.length > 0 ? (
          <div className="space-y-4">
            {realtimeFlights.map((flight: any) => (
              <div key={flight.aircraft_id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{flight.aircraft_registration}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Altitude: {flight.altitude} ft • Speed: {flight.speed} mph
                  </div>
                  {flight.is_surveillance && (
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      ⚠️ Potential surveillance activity detected
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last seen: {formatRelativeTime(flight.last_seen)}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost: ${flight.hourly_cost_estimate}/hour
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No Phoenix PD aircraft currently tracked. Real-time monitoring active.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/live"
          className="block bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 hover:border-blue-400 dark:hover:border-blue-700 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-3">📡</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Tracking</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Real-time helicopter positions with surveillance detection and pattern analysis
          </p>
        </Link>

        <Link
          to="/legal"
          className="block bg-white dark:bg-gray-800 border border-green-200 dark:border-green-900 hover:border-green-400 dark:hover:border-green-700 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-3">⚖️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Legal Documents</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Generate court-ready reports and constitutional analysis for litigation
          </p>
        </Link>

        <Link
          to="/patterns"
          className="block bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900 hover:border-purple-400 dark:hover:border-purple-700 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pattern Analysis</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Identify surveillance hotspots and systematic constitutional violations
          </p>
        </Link>

        <Link
          to="/costs"
          className="block bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-900 hover:border-yellow-400 dark:hover:border-yellow-700 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-3">💸</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cost Analysis</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Calculate taxpayer waste and alternative funding for public services
          </p>
        </Link>

        <Link
          to="/historical"
          className="block bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900 hover:border-indigo-400 dark:hover:border-indigo-700 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-3">📈</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historical Data</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Analyze past surveillance patterns and build comprehensive case evidence
          </p>
        </Link>
      </div>

      {/* Key Features & Capabilities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">System Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <div className="text-blue-600 dark:text-blue-400 mr-3 mt-1">🔍</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Real-Time Tracking</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Monitor Phoenix PD helicopters when they're actively flying using FlightRadar24 API
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-purple-600 dark:text-purple-400 mr-3 mt-1">📊</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Pattern Detection</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Identify surveillance patterns, hovering, and circling behaviors automatically
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-green-600 dark:text-green-400 mr-3 mt-1">⚖️</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Legal Documentation</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Generate court-ready reports with constitutional analysis and precedents
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-orange-600 dark:text-orange-400 mr-3 mt-1">💰</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Cost Analysis</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Calculate taxpayer costs and demonstrate alternative public service funding
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-indigo-600 dark:text-indigo-400 mr-3 mt-1">📈</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Historical Analysis</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Analyze past flight data to build comprehensive surveillance evidence
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-2">💡</span>
            <span>
              Data collected from public sources including FlightRadar24 and public records requests
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}