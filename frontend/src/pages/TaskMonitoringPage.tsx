import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatLocalDate, formatRelativeTime, formatDuration } from '../utils/dateUtils'

interface TaskHistory {
  id: number
  task_id: string
  task_name: string
  status: string
  started_at: string | null
  completed_at: string | null
  runtime_seconds: number | null
  error_message: string | null
  credits_used: number | null
  records_processed: number | null
  created_at: string
}

interface TaskEvent {
  id: number
  task_name: string
  event_type: string
  severity: number
  title: string
  message: string
  created_at: string
}

interface TaskMetrics {
  id: number
  task_name: string
  total_runs: number
  successful_runs: number
  failed_runs: number
  avg_runtime_seconds: number | null
  total_credits_used: number
  last_run_at: string | null
  last_error_message: string | null
}

interface TaskStatusSummary {
  total_tasks: number
  pending: number
  running: number
  successful: number
  failed: number
  tasks_last_hour: number
  tasks_last_24h: number
  success_rate_24h: number
  avg_runtime_24h: number
  total_credits_used_24h: number
  active_workers: string[]
}

interface TaskMonitoringDashboard {
  status_summary: TaskStatusSummary
  recent_tasks: TaskHistory[]
  recent_events: TaskEvent[]
  task_metrics: TaskMetrics[]
  scheduled_tasks: any[]
  credit_usage: any
}

function useTaskMonitoring() {
  return useQuery<TaskMonitoringDashboard>({
    queryKey: ['task-monitoring'],
    queryFn: async () => {
      const response = await fetch('/api/v1/tasks/dashboard')
      if (!response.ok) throw new Error('Failed to fetch task monitoring data')
      return response.json()
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  })
}

function useActiveTasks() {
  return useQuery({
    queryKey: ['active-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/v1/tasks/active')
      if (!response.ok) throw new Error('Failed to fetch active tasks')
      return response.json()
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  })
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    SUCCESS: 'bg-green-100 text-green-800',
    FAILURE: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    STARTED: 'bg-blue-100 text-blue-800',
    RETRY: 'bg-orange-100 text-orange-800'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function SeverityIcon({ severity }: { severity: number }) {
  const icons = ['ℹ️', '⚠️', '❌', '🚨']
  const colors = ['text-blue-500', 'text-yellow-500', 'text-red-500', 'text-red-700']
  
  return (
    <span className={`text-lg ${colors[severity - 1] || colors[0]}`}>
      {icons[severity - 1] || icons[0]}
    </span>
  )
}

export function TaskMonitoringPage() {
  const { data: dashboard, isLoading, error } = useTaskMonitoring()
  const { data: activeTasks } = useActiveTasks()
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'events' | 'metrics' | 'scheduled'>('overview')
  
  if (isLoading) return <div className="p-6">Loading task monitoring data...</div>
  if (error) return <div className="p-6 text-red-600">Error loading task monitoring</div>
  if (!dashboard) return null
  
  const { status_summary, recent_tasks, recent_events, task_metrics, scheduled_tasks, credit_usage } = dashboard
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Monitoring Center</h1>
        <p className="text-gray-600">
          Monitor Celery task execution, performance metrics, and system health
        </p>
      </div>
      
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Success Rate (24h)</p>
              <p className="text-2xl font-bold text-green-600">
                {status_summary.success_rate_24h.toFixed(1)}%
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Tasks</p>
              <p className="text-2xl font-bold text-blue-600">
                {status_summary.running + (activeTasks?.length || 0)}
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed (24h)</p>
              <p className="text-2xl font-bold text-red-600">
                {status_summary.failed}
              </p>
            </div>
            <div className="text-3xl">❌</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">FR24 Credits</p>
              {credit_usage?.monthly_used ? (
                <>
                  <p className="text-2xl font-bold text-purple-600">
                    {credit_usage.monthly_used.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    of {credit_usage.monthly_limit.toLocaleString()} ({credit_usage.monthly_percentage.toFixed(1)}%)
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold text-purple-600">
                  {status_summary.total_credits_used_24h}
                </p>
              )}
            </div>
            <div className="text-3xl">💳</div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['overview', 'history', 'events', 'metrics', 'scheduled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  selectedTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Currently Active Tasks */}
              {activeTasks && activeTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Currently Running</h3>
                  <div className="space-y-2">
                    {activeTasks.map((task: any) => (
                      <div key={task.task_id} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <div>
                          <span className="font-medium">{task.name}</span>
                          <span className="ml-2 text-sm text-gray-500">ID: {task.task_id}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Worker: {task.worker}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Last Hour</h4>
                  <p className="text-2xl font-bold">{status_summary.tasks_last_hour}</p>
                  <p className="text-sm text-gray-500">tasks executed</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Last 24 Hours</h4>
                  <p className="text-2xl font-bold">{status_summary.tasks_last_24h}</p>
                  <p className="text-sm text-gray-500">tasks executed</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Avg Runtime</h4>
                  <p className="text-2xl font-bold">{status_summary.avg_runtime_24h.toFixed(1)}s</p>
                  <p className="text-sm text-gray-500">per task</p>
                </div>
              </div>
              
              {/* Active Workers */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Active Workers</h3>
                <div className="flex flex-wrap gap-2">
                  {status_summary.active_workers.length > 0 ? (
                    status_summary.active_workers.map((worker) => (
                      <span key={worker} className="px-3 py-1 bg-green-100 text-green-800 rounded">
                        {worker}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No active workers</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* History Tab */}
          {selectedTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Task Executions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Runtime</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recent_tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div>
                            <div className="text-sm font-medium">{task.task_name.split('.').pop()}</div>
                            <div className="text-xs text-gray-500">{task.task_id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {formatRelativeTime(task.created_at)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {task.runtime_seconds ? `${task.runtime_seconds.toFixed(1)}s` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {task.credits_used || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {task.records_processed || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Events Tab */}
          {selectedTab === 'events' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Events & Alerts</h3>
              <div className="space-y-3">
                {recent_events.length > 0 ? (
                  recent_events.map((event) => (
                    <div key={event.id} className="flex items-start p-3 border rounded-lg">
                      <SeverityIcon severity={event.severity} />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="font-medium">{event.title}</span>
                          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {event.event_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRelativeTime(event.created_at)} • {event.task_name}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent events</p>
                )}
              </div>
            </div>
          )}
          
          {/* Metrics Tab */}
          {selectedTab === 'metrics' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Task Performance Metrics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Runs</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Success</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Runtime</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credits Used</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {task_metrics.map((metric) => (
                      <tr key={metric.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium">{metric.task_name.split('.').pop()}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">{metric.total_runs}</td>
                        <td className="px-4 py-2 text-sm text-green-600">{metric.successful_runs}</td>
                        <td className="px-4 py-2 text-sm text-red-600">{metric.failed_runs}</td>
                        <td className="px-4 py-2 text-sm">
                          {metric.avg_runtime_seconds ? `${metric.avg_runtime_seconds.toFixed(1)}s` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">{metric.total_credits_used || '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          {metric.last_run_at ? formatRelativeTime(metric.last_run_at) : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Scheduled Tab */}
          {selectedTab === 'scheduled' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Scheduled Tasks (Celery Beat)</h3>
              <div className="space-y-3">
                {scheduled_tasks.map((task: any) => (
                  <div key={task.name} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{task.name}</h4>
                        <p className="text-sm text-gray-600">{task.task}</p>
                        {task.kwargs && Object.keys(task.kwargs).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            Args: {JSON.stringify(task.kwargs)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {task.schedule < 60 
                            ? `Every ${task.schedule}s`
                            : task.schedule < 3600
                            ? `Every ${Math.round(task.schedule / 60)} min`
                            : task.schedule < 86400
                            ? `Every ${Math.round(task.schedule / 3600)} hours`
                            : `Every ${Math.round(task.schedule / 86400)} days`
                          }
                        </span>
                        <div className="text-xs text-gray-500">
                          {task.schedule === 300 && '(5 minutes)'}
                          {task.schedule === 3600 && '(1 hour)'}
                          {task.schedule === 7200 && '(2 hours)'}
                          {task.schedule === 86400 && '(24 hours)'}
                          {task.schedule === 604800 && '(7 days)'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}