import { useState } from 'react'
import { useDataSources } from '../hooks/useDataSources'
import { formatLocalTime } from '../utils/dateUtils'
import { usePublicRecordsRequest } from '../hooks/usePublicRecordsRequest'

export function DataSourcesPage() {
  const [activeTab, setActiveTab] = useState('sources') // sources, records, integration
  const [requestType, setRequestType] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)

  const { data: dataSources } = useDataSources()
  const publicRecordsRequestMutation = usePublicRecordsRequest()

  const handlePublicRecordsRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle public records request submission
    alert('Public records request submitted! You will receive updates on the request status.')
  }

  return (
    <div className="space-y-6" data-id="data-sources-container">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6" data-id="data-sources-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Data Sources & Integration</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Comprehensive data collection from multiple sources including real-time ADS-B tracking, 
          FlightRadar24 historical data, and Phoenix PD public records for complete surveillance documentation.
        </p>
        
        <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500 p-4 rounded">
          <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Multi-Source Intelligence Gathering</h3>
          <p className="text-sm text-purple-700 dark:text-purple-200">
            System integrates public flight tracking data, official records requests, and community 
            reports to build comprehensive evidence for legal challenges to unconstitutional surveillance.
            All data sources are legally obtained and court-admissible.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm" data-id="data-sources-tabs">
        <div className="border-b border-gray-200 dark:border-gray-600">
          <nav className="flex space-x-8 p-6">
            <button
              onClick={() => setActiveTab('sources')}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === 'sources'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              data-id="tab-sources"
            >
              Data Sources
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === 'records'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              data-id="tab-records"
            >
              Public Records
            </button>
            <button
              onClick={() => setActiveTab('integration')}
              className={`pb-2 border-b-2 font-medium text-sm ${
                activeTab === 'integration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              data-id="tab-integration"
            >
              Data Integration
            </button>
          </nav>
        </div>

        {/* Data Sources Tab */}
        {activeTab === 'sources' && (
          <div className="p-6" data-id="tab-content-sources">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Active Data Sources</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-time Sources */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Flight Tracking</h3>
                
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">FlightRadar24 API</h4>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Real-time aircraft tracking via FlightRadar24 API. Provides live position data 
                    when Phoenix PD helicopters are actively flying.
                  </p>
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    <div>Aircraft tracked: N621FB, N623FB, N624FB, N625FB (active fleet)</div>
                    <div>Update frequency: 5 seconds (when active)</div>
                    <div>Coverage: Worldwide with ADS-B coverage</div>
                    <div>Monthly credits: 666,000 (Essential Account)</div>
                  </div>
                </div>

              </div>

              {/* Historical Sources */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Data Sources</h3>
                
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">FlightRadar24 Essential Account</h4>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Essential Account providing up to 2 years of historical flight data.
                    Download flight paths in CSV and KML formats for evidence collection.
                  </p>
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    <div>Historical range: 730 days (2 years)</div>
                    <div>Export formats: CSV, KML</div>
                    <div>Data points: Position, altitude, speed, heading, timestamps</div>
                    <div>Files imported: 21 flights</div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Public Records & FOIA Requests</h4>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-blue-600">In Progress</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Official documents obtained through Arizona Open Records Law requests 
                    including flight logs, policies, and budget documents.
                  </p>
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    <div>Pending requests: 3</div>
                    <div>Completed requests: 1</div>
                    <div>Documents obtained: Budget allocations, SOPs (pending)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Capabilities */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Capabilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">4</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Active Phoenix PD Helicopters</div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">730</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Days of Historical Data Available</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">666k</div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Monthly API Credits</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public Records Tab */}
        {activeTab === 'records' && (
          <div className="p-6" data-id="tab-content-records">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Public Records Requests</h2>
              <button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {showRequestForm ? 'Hide Form' : 'New Request'}
              </button>
            </div>

            {showRequestForm && (
              <div className="mb-8 p-6 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Submit Public Records Request</h3>
                <form onSubmit={handlePublicRecordsRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Request Type
                    </label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select request type</option>
                      <option value="flight_logs">Flight Operations Logs</option>
                      <option value="maintenance_records">Maintenance Records</option>
                      <option value="pilot_certifications">Pilot Certifications</option>
                      <option value="operating_procedures">Standard Operating Procedures</option>
                      <option value="budget_documents">Budget & Cost Documents</option>
                      <option value="communications">Radio Communications</option>
                      <option value="incident_reports">Incident Reports</option>
                      <option value="training_records">Training Records</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Specific Details
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Specify exact documents, date ranges, aircraft registrations, or other details"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Legal Justification
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain the public interest and legal basis for the request"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                  >
                    Submit Request
                  </button>
                </form>
              </div>
            )}

            {/* Existing Requests */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Request Status</h3>
              <div className="space-y-4">
                {[
                  {
                    id: '2024-001',
                    type: 'Flight Operations Logs',
                    date: '2024-08-15',
                    status: 'In Progress',
                    description: 'Flight logs for N624FB from July 1-31, 2024'
                  },
                  {
                    id: '2024-002',
                    type: 'Budget Documents',
                    date: '2024-08-10',
                    status: 'Completed',
                    description: 'Air Support Unit budget allocation 2024'
                  },
                  {
                    id: '2024-003',
                    type: 'Standard Operating Procedures',
                    date: '2024-08-05',
                    status: 'Under Review',
                    description: 'SOPs for helicopter surveillance operations'
                  }
                ].map((request) => (
                  <div key={request.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{request.type}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{request.description}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Request ID: {request.id} • Submitted: {request.date}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded text-sm ${
                        request.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        request.status === 'In Progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      }`}>
                        {request.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Integration Tab */}
        {activeTab === 'integration' && (
          <div className="p-6" data-id="tab-content-integration">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Data Integration & Analysis</h2>
            
            <div className="space-y-6">
              {/* Integration Status */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Integration Pipeline</h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-green-600 mr-4">✅</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Real-time Data Ingestion</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        FlightRadar24 API data processed when helicopters are actively flying
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-green-600 mr-4">✅</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Historical Data Import</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        KML and CSV files from FlightRadar24 imported and analyzed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-green-600 mr-4">✅</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Pattern Detection</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Automated detection of hovering, circling, and surveillance patterns
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-green-600 mr-4">✅</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Legal Documentation</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Automated generation of surveillance reports with constitutional analysis
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Flow */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Data Flow Architecture</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Raw Data Sources</div>
                    <div className="flex justify-center space-x-4 mb-6">
                      <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded text-sm text-gray-900 dark:text-white">FlightRadar24 API</div>
                      <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded text-sm text-gray-900 dark:text-white">FR24 Essential Downloads</div>
                      <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded text-sm text-gray-900 dark:text-white">Public Records</div>
                    </div>
                    <div className="text-2xl mb-4">⬇️</div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded mb-4 text-gray-900 dark:text-white">Data Processing & Validation</div>
                    <div className="text-2xl mb-4">⬇️</div>
                    <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded mb-4 text-gray-900 dark:text-white">Pattern Analysis & AI</div>
                    <div className="text-2xl mb-4">⬇️</div>
                    <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded text-gray-900 dark:text-white">Legal Documentation & Reports</div>
                  </div>
                </div>
              </div>

              {/* Quality Assurance */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Data Quality Assurance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Validation Checks</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Coordinate validation (Phoenix area bounds)</li>
                      <li>• Aircraft registration verification</li>
                      <li>• Timestamp consistency checks</li>
                      <li>• Duplicate detection and removal</li>
                      <li>• Cross-source correlation validation</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Legal Compliance</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Public data source verification</li>
                      <li>• Chain of custody documentation</li>
                      <li>• Data integrity checksums</li>
                      <li>• Court admissibility standards</li>
                      <li>• Privacy protection compliance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}