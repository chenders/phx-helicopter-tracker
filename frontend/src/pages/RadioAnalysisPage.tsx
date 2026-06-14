import React, { useState, useEffect } from 'react'
import axios from '@/lib/axios'
import {
  TrendingUp,
  MapPin,
  Radio,
  BarChart3,
  Activity,
  Hash,
  AlertTriangle,
  Link2,
  Search
} from 'lucide-react'

interface AnalysisStats {
  totals: {
    archives: number
    transcribed_archives: number
    transcriptions: number
    segments: number
    keywords: number
    correlations: number
  }
  entity_extraction: {
    segments_with_tail_numbers: number
    segments_with_locations: number
    segments_with_incident_codes: number
  }
  coverage: {
    transcription_percentage: number
    oldest_archive: string | null
    newest_archive: string | null
  }
}

interface KeywordData {
  keyword: string
  type: string
  total_occurrences: number
  transcription_count: number
  avg_confidence: number | null
}

interface EntitySummary {
  days_analyzed: number
  summary: {
    total_segments_with_entities: number
    unique_tail_numbers: number
    unique_locations: number
    unique_incident_codes: number
  }
  top_tail_numbers: Array<{ tail_number: string; count: number }>
  top_locations: Array<{ location: string; count: number }>
  top_incident_codes: Array<{ code: string; count: number }>
}

interface TimelineData {
  timestamp: string
  archive_count: number
  transcription_count: number
  transcribed_duration_seconds: number
}

interface HourlyActivity {
  hour: number
  day_of_week: number
  archive_count: number
  total_duration_seconds: number
}

export function RadioAnalysisPage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null)
  const [keywords, setKeywords] = useState<KeywordData[]>([])
  const [entities, setEntities] = useState<EntitySummary | null>(null)
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [heatmap, setHeatmap] = useState<HourlyActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'keywords' | 'entities' | 'timeline' | 'heatmap'>('overview')
  const [keywordTypeFilter, setKeywordTypeFilter] = useState<string>('')
  const [daysBack, setDaysBack] = useState(30)

  useEffect(() => {
    fetchAnalysisData()
  }, [daysBack, keywordTypeFilter])

  const fetchAnalysisData = async () => {
    setLoading(true)
    try {
      // Fetch all analysis data in parallel
      const [statsRes, keywordsRes, entitiesRes, timelineRes, heatmapRes] = await Promise.all([
        axios.get('/api/v1/radio-analysis/stats'),
        axios.get('/api/v1/radio-analysis/keywords/frequency', {
          params: { limit: 50, keyword_type: keywordTypeFilter || undefined }
        }),
        axios.get('/api/v1/radio-analysis/entities/summary', {
          params: { days_back: daysBack }
        }),
        axios.get('/api/v1/radio-analysis/timeline/activity', {
          params: { days_back: daysBack, granularity: 'daily' }
        }),
        axios.get('/api/v1/radio-analysis/timeline/hourly', {
          params: { days_back: Math.min(daysBack, 30) } // Limit heatmap to 30 days max
        })
      ])

      setStats(statsRes.data)
      setKeywords(keywordsRes.data.keywords || [])
      setEntities(entitiesRes.data)
      setTimeline(timelineRes.data.timeline || [])
      setHeatmap(heatmapRes.data.heatmap_data || [])
    } catch (error) {
      console.error('Failed to fetch analysis data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate heatmap max for scaling
  const heatmapMax = Math.max(...heatmap.map(h => h.archive_count), 1)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Radio Transcription Analysis
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Advanced analytics for Phoenix PD radio communications
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'keywords', label: 'Keywords', icon: Hash },
            { id: 'entities', label: 'Entities', icon: MapPin },
            { id: 'timeline', label: 'Timeline', icon: TrendingUp },
            { id: 'heatmap', label: 'Activity Heatmap', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analysis data...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {selectedTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Radio className="h-5 w-5 text-blue-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Archives</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totals.archives}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Transcribed</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totals.transcribed_archives}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stats.coverage.transcription_percentage.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Hash className="h-5 w-5 text-purple-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Segments</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totals.segments.toLocaleString()}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Search className="h-5 w-5 text-orange-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Keywords</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totals.keywords.toLocaleString()}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Radio className="h-5 w-5 text-cyan-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Tail #s</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.entity_extraction.segments_with_tail_numbers}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Link2 className="h-5 w-5 text-pink-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Correlations</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totals.correlations}
                  </div>
                </div>
              </div>

              {/* Entity Extraction Summary */}
              {entities && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Entity Extraction Summary ({daysBack} days)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Unique Entities
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">Tail Numbers:</span>
                          <span className="font-semibold">{entities.summary.unique_tail_numbers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Locations:</span>
                          <span className="font-semibold">{entities.summary.unique_locations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Incident Codes:</span>
                          <span className="font-semibold">{entities.summary.unique_incident_codes}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Total Segments
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {entities.summary.total_segments_with_entities.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        with extracted entities
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Date Range
                      </div>
                      <div className="text-sm">
                        {stats.coverage.oldest_archive && (
                          <div>
                            <span className="text-gray-500">From:</span>{' '}
                            {new Date(stats.coverage.oldest_archive).toLocaleDateString()}
                          </div>
                        )}
                        {stats.coverage.newest_archive && (
                          <div>
                            <span className="text-gray-500">To:</span>{' '}
                            {new Date(stats.coverage.newest_archive).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keywords Tab */}
          {selectedTab === 'keywords' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top Keywords (Last {daysBack} days)
                </h2>
                <select
                  value={keywordTypeFilter}
                  onChange={(e) => setKeywordTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Types</option>
                  <option value="tail_number">Tail Numbers</option>
                  <option value="location">Locations</option>
                  <option value="incident_code">Incident Codes</option>
                  <option value="person">Persons</option>
                  <option value="action">Actions</option>
                </select>
              </div>

              {keywords.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No keyword data available yet</p>
                  <p className="text-sm mt-2">Transcribe some radio archives to see keyword analysis</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Keyword
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Occurrences
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Files
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {keywords.map((kw, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                            {kw.keyword}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              kw.type === 'tail_number' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              kw.type === 'location' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              kw.type === 'incident_code' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {kw.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                            {kw.total_occurrences}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500 dark:text-gray-400">
                            {kw.transcription_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500 dark:text-gray-400">
                            {kw.avg_confidence ? (kw.avg_confidence * 100).toFixed(1) + '%' : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Entities Tab */}
          {selectedTab === 'entities' && entities && (
            <div className="space-y-6">
              {/* Top Tail Numbers */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Radio className="h-5 w-5 mr-2 text-blue-500" />
                  Top Aircraft Tail Numbers
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {entities.top_tail_numbers.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                        {item.tail_number}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.count} mentions
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-green-500" />
                  Top Mentioned Locations
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {entities.top_locations.slice(0, 20).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded px-3 py-2">
                      <span className="text-sm text-gray-900 dark:text-white truncate">{item.location}</span>
                      <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Incident Codes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Top Incident Codes
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {entities.top_incident_codes.slice(0, 20).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded px-3 py-2">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{item.code}</span>
                      <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {selectedTab === 'timeline' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Daily Activity Timeline
              </h2>
              {timeline.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timeline data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeline.map((point, idx) => {
                    const maxCount = Math.max(...timeline.map(p => p.archive_count), 1)
                    const widthPercent = (point.archive_count / maxCount) * 100

                    return (
                      <div key={idx} className="flex items-center space-x-4">
                        <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1">
                          <div
                            className="bg-blue-500 dark:bg-blue-600 h-8 rounded flex items-center px-3 transition-all"
                            style={{ width: `${widthPercent}%` }}
                          >
                            <span className="text-white text-sm font-medium">
                              {point.archive_count} archives
                            </span>
                          </div>
                        </div>
                        <div className="w-32 text-sm text-gray-600 dark:text-gray-400 text-right">
                          {point.transcription_count} transcribed
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Heatmap Tab */}
          {selectedTab === 'heatmap' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Hourly Activity Heatmap
              </h2>
              {heatmap.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No heatmap data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-xs text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"></th>
                        {Array.from({ length: 24 }, (_, i) => (
                          <th key={i} className="p-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                            {i}h
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dayNames.map((day, dayIdx) => (
                        <tr key={dayIdx}>
                          <td className="p-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                            {day}
                          </td>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const cell = heatmap.find(h => h.day_of_week === dayIdx && h.hour === hour)
                            const count = cell?.archive_count || 0
                            const intensity = count / heatmapMax
                            const opacity = Math.max(0.1, intensity)

                            return (
                              <td
                                key={hour}
                                className="border border-gray-200 dark:border-gray-700 p-0"
                                title={`${day} ${hour}:00 - ${count} archives`}
                              >
                                <div
                                  className="w-12 h-12 flex items-center justify-center text-xs font-medium"
                                  style={{
                                    backgroundColor: count > 0 ? `rgba(59, 130, 246, ${opacity})` : 'transparent',
                                    color: intensity > 0.5 ? 'white' : count > 0 ? '#1e40af' : 'transparent'
                                  }}
                                >
                                  {count > 0 ? count : ''}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
