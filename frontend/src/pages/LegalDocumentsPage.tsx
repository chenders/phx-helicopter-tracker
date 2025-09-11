import { useState } from 'react'
import { useLegalDocuments } from '../hooks/useLegalDocuments'
import { useGenerateLegalDocument } from '../hooks/useGenerateLegalDocument'
import { formatLocalDateOnly } from '../utils/dateUtils'

export function LegalDocumentsPage() {
  const [documentType, setDocumentType] = useState('')
  const [timeRange, setTimeRange] = useState('30d')
  const [showGenerator, setShowGenerator] = useState(false)
  
  const { data: documents, refetch } = useLegalDocuments()
  const generateDocumentMutation = useGenerateLegalDocument()

  const documentTypes = [
    {
      id: 'constitutional_analysis',
      title: 'Constitutional Analysis Report',
      description: 'Comprehensive Fourth Amendment violation analysis with legal precedents',
      icon: '⚖️'
    },
    {
      id: 'surveillance_report',
      title: 'Surveillance Activity Report',
      description: 'Detailed timeline and pattern analysis for court presentation',
      icon: '📊'
    },
    {
      id: 'cost_analysis',
      title: 'Economic Impact Report',
      description: 'Taxpayer cost analysis and alternative funding documentation',
      icon: '💰'
    },
    {
      id: 'incident_summary',
      title: 'Community Impact Compilation',
      description: 'Verified incident reports with witness statements and evidence',
      icon: '📝'
    },
    {
      id: 'expert_report',
      title: 'Expert Witness Report',
      description: 'Technical analysis prepared for expert testimony',
      icon: '🔬'
    },
    {
      id: 'public_records_request',
      title: 'Public Records Request',
      description: 'Template for requesting additional public records',
      icon: '🏛️'
    },
    {
      id: 'flight_analysis',
      title: 'Flight Analysis Report',
      description: 'Comprehensive analysis of flight patterns and behavior',
      icon: '✈️'
    },
    {
      id: 'pattern_report',
      title: 'Pattern Detection Report',
      description: 'Analysis of systematic surveillance patterns',
      icon: '🔍'
    }
  ]

  const handleGenerateDocument = async (type: string) => {
    try {
      await generateDocumentMutation.mutateAsync({
        document_type: type,
        time_range: timeRange,
        include_exhibits: true,
        format: 'pdf'
      })
      
      alert('Document generation started! You will receive a notification when complete.')
      refetch()
    } catch (error) {
      alert('Error generating document. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Legal Document Center</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Generate court-ready legal documentation for litigation challenging Phoenix PD's 
          unconstitutional helicopter surveillance practices. All documents include evidence, 
          analysis, and legal precedents necessary for successful legal challenges.
        </p>
        
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Attorney Work Product Protection</h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            All generated documents are prepared for anticipated litigation and protected under 
            attorney work product doctrine. Documents include comprehensive legal analysis, 
            constitutional precedents, and evidentiary support for civil rights violations.
          </p>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            {showGenerator ? 'Hide Generator' : 'Generate New Document'}
          </button>
        </div>
      </div>

      {/* Document Generator */}
      {showGenerator && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Document Generator</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {documentTypes.map((type) => (
              <div
                key={type.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
              >
                <div className="text-3xl mb-3">{type.icon}</div>
                <h3 className="font-semibold mb-2">{type.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{type.description}</p>
                <button
                  onClick={() => handleGenerateDocument(type.id)}
                  disabled={generateDocumentMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded font-medium"
                >
                  {generateDocumentMutation.isPending ? 'Generating...' : 'Generate'}
                </button>
              </div>
            ))}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Generation Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="1y">Last Year</option>
                  <option value="all">All Available Data</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Include Evidence
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Flight path maps</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Cost analysis charts</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Incident reports</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Format Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="radio" name="format" value="pdf" defaultChecked className="mr-2" />
                    <span className="text-sm">PDF (Court Filing)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="format" value="docx" className="mr-2" />
                    <span className="text-sm">Word Document</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="format" value="both" className="mr-2" />
                    <span className="text-sm">Both Formats</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Library */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Generated Documents</h2>
        
        {documents && documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((doc: any) => (
              <div key={doc.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="text-2xl mr-3">
                        {documentTypes.find(t => t.id === doc.document_type)?.icon || '📄'}
                      </div>
                      <div>
                        <h3 className="font-semibold">{doc.title || 'Untitled Document'}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {(doc.document_type || 'unknown').replace(/_/g, ' ').toUpperCase()} • 
                          Generated {formatLocalDateOnly(doc.created_at)} • 
                          {doc.page_count || 0} pages
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">{doc.description}</div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {doc.tags?.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {doc.legal_precedents && doc.legal_precedents.length > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Key Precedents:</strong> {doc.legal_precedents.slice(0, 3).join(', ')}
                        {doc.legal_precedents.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`px-3 py-1 rounded text-sm ${
                      doc.generation_status === 'completed' ? 'bg-green-100 text-green-800' :
                      doc.generation_status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                      doc.generation_status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(doc.generation_status || 'pending').toUpperCase()}
                    </div>
                    
                    {doc.generation_status === 'completed' && (
                      <div className="flex space-x-2">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                          Download PDF
                        </button>
                        <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm">
                          View
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">No legal documents generated yet</p>
            <button
              onClick={() => setShowGenerator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Generate Your First Document
            </button>
          </div>
        )}
      </div>

      {/* Legal Resources */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Legal Research Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h3 className="font-semibold mb-2">Fourth Amendment Precedents</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Kyllo v. United States (2001)</li>
              <li>• United States v. Jones (2012)</li>
              <li>• Carpenter v. United States (2018)</li>
              <li>• Florida v. Riley (1989)</li>
            </ul>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h3 className="font-semibold mb-2">Surveillance Technology Cases</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Leaders of a Beautiful Struggle v. BPD</li>
              <li>• ACLU v. CBP (2017)</li>
              <li>• State v. Davis (New Mexico, 2015)</li>
              <li>• People v. Tafoya (California, 2007)</li>
            </ul>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h3 className="font-semibold mb-2">Civil Rights Actions</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 42 U.S.C. § 1983 Claims</li>
              <li>• First Amendment Retaliation</li>
              <li>• Equal Protection Violations</li>
              <li>• Municipal Liability Standards</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}