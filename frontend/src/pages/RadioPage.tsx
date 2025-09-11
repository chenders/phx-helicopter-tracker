import React, { useState, useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { Play, Pause, Download, Search, Mic, Clock, Database, FileText, Volume2, TrendingUp, Loader2 } from 'lucide-react'

interface RadioArchive {
  filename: string
  size_mb: number
  created_at: string
  has_transcription: boolean
  transcription_model?: string
  transcribed_at?: string
  transcription_time?: number
}

interface RadioStats {
  total_archives: number
  total_transcribed: number
  transcription_percentage: number
  total_size_mb: number
  date_range?: {
    oldest: string
    newest: string
  }
  model_usage: Record<string, number>
  storage_growth_per_day_mb: number
  total_transcription_time_seconds: number
  average_transcription_time_seconds: number
}

interface Transcription {
  filename: string
  text: string
  segments: Array<{
    id?: number
    start: number
    end: number
    text: string
  }>
  model?: string
  transcribed_at?: string
  model_performance?: {
    transcription_time_seconds: number
    file_size_mb: number
  }
}

export function RadioPage() {
  const [archives, setArchives] = useState<RadioArchive[]>([])
  const [stats, setStats] = useState<RadioStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedArchive, setSelectedArchive] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [downloadingTask, setDownloadingTask] = useState<string | null>(null)
  const [transcribingTask, setTranscribingTask] = useState<string | null>(null)
  const [transcribingFiles, setTranscribingFiles] = useState<Set<string>>(new Set())
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchArchives()
    fetchStats()
  }, [])

  const fetchArchives = async () => {
    try {
      const response = await axios.get('/api/v1/radio/archives')
      setArchives(response.data.archives)
    } catch (error) {
      console.error('Failed to fetch archives:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/v1/radio/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchTranscription = async (filename: string) => {
    try {
      const response = await axios.get(`/api/v1/radio/archives/${filename}/transcription`)
      setTranscription(response.data)
      setSelectedArchive(filename)
    } catch (error) {
      console.error('Failed to fetch transcription:', error)
      alert('No transcription available for this file')
    }
  }

  const searchTranscriptions = async () => {
    if (!searchQuery.trim()) return
    
    try {
      const response = await axios.get('/api/v1/radio/search', {
        params: { query: searchQuery }
      })
      setSearchResults(response.data)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const triggerDownload = async () => {
    try {
      const response = await axios.post('/api/v1/radio/archives/download', null, {
        params: { days_back: 2, max_downloads: 5 }
      })
      setDownloadingTask(response.data.task_id)
      alert(`Download task started: ${response.data.task_id}`)
      
      // Refresh archives after a delay
      setTimeout(fetchArchives, 10000)
    } catch (error) {
      console.error('Failed to trigger download:', error)
    }
  }

  const triggerTranscription = async () => {
    try {
      // Find files without transcription
      const untranscribedFiles = archives.filter(a => !a.has_transcription).slice(0, 1)
      if (untranscribedFiles.length > 0) {
        // Mark files as being transcribed
        setTranscribingFiles(new Set(untranscribedFiles.map(f => f.filename)))
      }
      
      const response = await axios.post('/api/v1/radio/archives/transcribe', null, {
        params: { batch_size: 1 }
      })
      setTranscribingTask(response.data.task_id)
      alert(`Transcription task started: ${response.data.task_id}`)
      
      // Refresh archives after a delay
      setTimeout(() => {
        fetchArchives()
        fetchStats()
        setTranscribingFiles(new Set())
      }, 30000)
    } catch (error) {
      console.error('Failed to trigger transcription:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const parseFilename = (filename: string) => {
    // Parse filename like: 20250907_1757297388_12145.mp3
    const parts = filename.replace('.mp3', '').split('_')
    if (parts.length === 3) {
      const dateStr = parts[0] // 20250907
      const timestamp = parseInt(parts[1]) // Unix timestamp
      const feedId = parts[2] // 12145
      
      // Parse date
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      const date = new Date(`${year}-${month}-${day}`)
      
      // Calculate time from timestamp (if it's a proper Unix timestamp)
      let startTime = null
      let endTime = null
      if (timestamp > 1000000000) { // Likely a Unix timestamp
        startTime = new Date(timestamp * 1000)
        // Assume ~30 minute recordings
        endTime = new Date((timestamp + 1800) * 1000)
      }
      
      return {
        date: date,
        dateStr: date.toLocaleDateString('en-US', { 
          weekday: 'short',
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        startTime: startTime,
        endTime: endTime,
        timeRange: startTime && endTime ? 
          `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 
          null,
        feedId: feedId,
        originalFilename: filename
      }
    }
    
    // Fallback for other filename formats
    return {
      date: null,
      dateStr: filename.replace('.mp3', ''),
      startTime: null,
      endTime: null,
      timeRange: null,
      feedId: null,
      originalFilename: filename
    }
  }

  const handlePlayAudio = async (filename: string) => {
    if (playingAudio === filename && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(`/api/v1/radio/archives/${filename}/audio`)
      audioRef.current = audio
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration)
      })
      
      audio.addEventListener('timeupdate', () => {
        setAudioCurrentTime(audio.currentTime)
      })
      
      audio.addEventListener('ended', () => {
        setPlayingAudio(null)
        setAudioCurrentTime(0)
      })
      
      audio.play()
      setPlayingAudio(filename)
      setExpandedRow(filename) // Expand the row when playing
      
      // Also fetch transcription if available
      const archive = archives.find(a => a.filename === filename)
      if (archive?.has_transcription) {
        fetchTranscription(filename)
      }
    }
  }
  
  const toggleRowExpansion = (filename: string) => {
    if (expandedRow === filename) {
      setExpandedRow(null)
      // Stop audio if playing
      if (playingAudio === filename && audioRef.current) {
        audioRef.current.pause()
        setPlayingAudio(null)
      }
    } else {
      setExpandedRow(filename)
      // Fetch transcription if available
      const archive = archives.find(a => a.filename === filename)
      if (archive?.has_transcription) {
        fetchTranscription(filename)
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setAudioCurrentTime(time)
    }
  }

  const downloadFile = (filename: string, type: 'mp3' | 'txt' = 'mp3') => {
    const url = type === 'mp3' 
      ? `/api/v1/radio/archives/${filename}/audio`
      : `/api/v1/radio/archives/${filename}/transcription?format=txt`
    const a = document.createElement('a')
    a.href = url
    a.download = type === 'txt' ? filename.replace('.mp3', '.txt') : filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Police Radio Archives
        </h1>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Archives</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_archives}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stats.total_size_mb.toFixed(1)} MB
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Transcribed</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_transcribed}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stats.transcription_percentage.toFixed(1)}% complete
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Avg Transcription</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.average_transcription_time_seconds.toFixed(1)}s
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                per file
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Storage Growth</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.storage_growth_per_day_mb.toFixed(1)} MB
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                per day
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={triggerTranscription}
            disabled={!!transcribingTask}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
          >
            <Mic className="h-4 w-4" />
            <span>Transcribe Untranscribed</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex space-x-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchTranscriptions()}
            placeholder="Search transcriptions..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={searchTranscriptions}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Search Results ({searchResults.length})
            </h3>
            {searchResults.map((result, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-white">
                  {result.filename}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {result.total_matches} matches • Model: {result.model}
                </div>
                {result.matching_segments.slice(0, 2).map((seg: any, segIdx: number) => (
                  <div key={segIdx} className="mt-2 p-2 bg-white dark:bg-gray-600 rounded text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      [{formatTime(seg.start)} - {formatTime(seg.end)}]
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-white">{seg.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Archives Table with Expandable Rows */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Archive Files
        </h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading archives...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {archives.map((archive) => {
                  const fileInfo = parseFilename(archive.filename)
                  // Calculate duration assuming 30 minutes per file (can be adjusted based on actual duration)
                  const duration = "~30 min"
                  
                  return (
                    <React.Fragment key={archive.filename}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {fileInfo.dateStr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {fileInfo.timeRange || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {duration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {archive.size_mb.toFixed(2)} MB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handlePlayAudio(archive.filename)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Play Audio"
                          >
                            {playingAudio === archive.filename && audioRef.current && !audioRef.current.paused ? (
                              <Pause className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </button>
                          {archive.has_transcription ? (
                            <button
                              onClick={() => toggleRowExpansion(archive.filename)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="View Transcription"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                          ) : transcribingFiles.has(archive.filename) ? (
                            <button
                              disabled
                              className="p-1.5 rounded text-yellow-600 dark:text-yellow-400 cursor-not-allowed opacity-75"
                              title="Transcribing..."
                            >
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => downloadFile(archive.filename, 'mp3')}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                            title="Download"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row with Audio Player and Transcript */}
                    {expandedRow === archive.filename && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4">
                          <div className="space-y-4">
                            {/* Audio Player */}
                            <div className="bg-gray-900 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Volume2 className="h-5 w-5 text-blue-400" />
                                    <span className="text-lg font-medium text-white">Audio Player</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    File: {archive.filename}
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadFile(archive.filename, 'mp3')}
                                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="text-sm">Download MP3</span>
                                </button>
                              </div>
                              
                              <div className="flex items-center space-x-4">
                                <button
                                  onClick={() => handlePlayAudio(archive.filename)}
                                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white"
                                >
                                  {playingAudio === archive.filename && audioRef.current && !audioRef.current.paused ? (
                                    <Pause className="h-5 w-5" />
                                  ) : (
                                    <Play className="h-5 w-5" />
                                  )}
                                </button>
                                
                                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                                  <span>{formatTime(playingAudio === archive.filename ? audioCurrentTime : 0)}</span>
                                  <span>/</span>
                                  <span>{formatTime(playingAudio === archive.filename ? audioDuration : 0)}</span>
                                </div>
                                
                                <div className="flex-1">
                                  <input
                                    type="range"
                                    min="0"
                                    max={playingAudio === archive.filename ? audioDuration : 100}
                                    value={playingAudio === archive.filename ? audioCurrentTime : 0}
                                    onChange={handleSeek}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    disabled={playingAudio !== archive.filename}
                                  />
                                </div>
                                
                                <Volume2 className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            
                            {/* Transcript */}
                            {archive.has_transcription && transcription && selectedArchive === archive.filename && (
                              <div className="bg-gray-900 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-5 w-5 text-green-400" />
                                    <span className="text-lg font-medium text-white">
                                      Transcript ({transcription.model || archive.transcription_model} model)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => downloadFile(archive.filename, 'txt')}
                                    className="flex items-center space-x-2 text-green-400 hover:text-green-300"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span className="text-sm">Download TXT</span>
                                  </button>
                                </div>
                                
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {transcription.segments && transcription.segments.length > 0 ? (
                                    transcription.segments.map((segment, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-start space-x-4 p-2 rounded ${
                                          playingAudio === archive.filename &&
                                          audioCurrentTime >= segment.start &&
                                          audioCurrentTime <= segment.end
                                            ? 'bg-blue-900 bg-opacity-30 border-l-4 border-blue-400'
                                            : ''
                                        }`}
                                      >
                                        <div className="text-sm text-blue-400 whitespace-nowrap">
                                          [{formatTime(segment.start)} - {formatTime(segment.end)}]
                                        </div>
                                        <div className="text-sm text-gray-300 flex-1">
                                          {segment.text}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-gray-300 whitespace-pre-wrap">
                                      {transcription.text}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Loading Transcript */}
                            {archive.has_transcription && (!transcription || selectedArchive !== archive.filename) && (
                              <div className="text-center py-4 text-gray-500">
                                Loading transcript...
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}