import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from '@/lib/axios'
import { Play, Pause, Download, Search, Mic, Clock, Database, FileText, Volume2, TrendingUp, Loader2, ScrollText } from 'lucide-react'

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
  const [hasSearched, setHasSearched] = useState(false)
  const [downloadingTask, setDownloadingTask] = useState<string | null>(null)
  const [transcribingTask, setTranscribingTask] = useState<string | null>(null)
  const [transcribingFiles, setTranscribingFiles] = useState<Set<string>>(new Set())
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null)
  const activeSegmentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchArchives()
    fetchStats()
  }, [])

  // Auto-scroll to keep active transcript segment in view
  useEffect(() => {
    if (autoScrollEnabled && activeSegmentRef.current && transcriptContainerRef.current) {
      const container = transcriptContainerRef.current
      const activeElement = activeSegmentRef.current
      
      // Get positions
      const containerRect = container.getBoundingClientRect()
      const elementRect = activeElement.getBoundingClientRect()
      
      // Check if element is outside the visible area
      const isAbove = elementRect.top < containerRect.top
      const isBelow = elementRect.bottom > containerRect.bottom
      
      if (isAbove || isBelow) {
        // Scroll the element into view, centered if possible
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  }, [audioCurrentTime, playingAudio, autoScrollEnabled]) // Trigger when time updates or auto-scroll changes

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
    if (!searchQuery.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    
    setHasSearched(true)
    
    try {
      const response = await axios.get('/api/v1/radio/search', {
        params: { query: searchQuery }
      })
      setSearchResults(response.data)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
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

  const handlePlayAudio = async (filename: string, seekToTime?: number) => {
    console.log('handlePlayAudio called:', { filename, seekToTime, playingAudio, hasAudioRef: !!audioRef.current })
    
    if (playingAudio === filename && audioRef.current && seekToTime === undefined) {
      console.log('Toggle play/pause for existing audio')
      if (audioRef.current.paused) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    } else {
      console.log('Creating new audio element')
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      const audio = new Audio(`/api/v1/radio/archives/${filename}/audio`)
      audioRef.current = audio
      
      audio.addEventListener('loadedmetadata', () => {
        console.log('loadedmetadata event:', { duration: audio.duration, seekToTime })
        setAudioDuration(audio.duration)
        
        // If we need to seek, do it after metadata is loaded
        if (seekToTime !== undefined && seekToTime > 0) {
          console.log('Setting currentTime to:', seekToTime)
          audio.currentTime = seekToTime
          setAudioCurrentTime(seekToTime)
        }
      })
      
      audio.addEventListener('timeupdate', () => {
        setAudioCurrentTime(audio.currentTime)
      })
      
      audio.addEventListener('seeking', () => {
        console.log('seeking event triggered, target time:', audio.currentTime)
      })
      
      audio.addEventListener('seeked', () => {
        console.log('seeked event complete, current time:', audio.currentTime)
      })
      
      audio.addEventListener('ended', () => {
        console.log('audio ended')
        setPlayingAudio(null)
        setAudioCurrentTime(0)
      })
      
      // Start playing immediately, we'll seek once it's ready
      audio.play().catch(err => console.error('Play error:', err))
      
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

  const handleTranscriptClick = (startTime: number, filename: string) => {
    console.log('handleTranscriptClick called:', { startTime, filename, playingAudio })
    
    // If audio is not playing this file, start it with seek
    if (playingAudio !== filename) {
      console.log('Starting new audio with seek')
      handlePlayAudio(filename, startTime)
    } else if (audioRef.current) {
      // Audio already playing, just seek to the timestamp
      console.log('Seeking existing audio to:', startTime)
      audioRef.current.currentTime = startTime
      setAudioCurrentTime(startTime)
      
      // Ensure audio is playing
      if (audioRef.current.paused) {
        audioRef.current.play()
      }
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 md:p-4">
              <div className="flex items-center space-x-1 md:space-x-2 mb-2">
                <Database className="h-5 w-5 text-blue-500" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Total Archives</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_archives}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stats.total_size_mb.toFixed(1)} MB
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 md:p-4">
              <div className="flex items-center space-x-1 md:space-x-2 mb-2">
                <FileText className="h-5 w-5 text-green-500" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Transcribed</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_transcribed}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stats.transcription_percentage.toFixed(1)}% complete
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 md:p-4">
              <div className="flex items-center space-x-1 md:space-x-2 mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Avg Transcription</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.average_transcription_time_seconds.toFixed(1)}s
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                per file
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 md:p-4">
              <div className="flex items-center space-x-1 md:space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Storage Growth</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.storage_growth_per_day_mb.toFixed(1)} MB
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                per day
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-4">
          <button
            onClick={triggerTranscription}
            disabled={!!transcribingTask}
            className="px-3 py-2 md:px-4 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2 text-sm md:text-base"
          >
            <Mic className="h-4 w-4" />
            <span>Transcribe Untranscribed</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!e.target.value.trim()) {
                setSearchResults([])
                setHasSearched(false)
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && searchTranscriptions()}
            placeholder="Search transcriptions..."
            className="flex-1 px-3 md:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm md:text-base"
          />
          <div className="flex gap-2">
            <button
              onClick={searchTranscriptions}
              className="px-4 md:px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center space-x-2 text-sm md:text-base"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
            {hasSearched && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setHasSearched(false)
                }}
                className="px-4 md:px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center text-sm md:text-base"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {hasSearched && (
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Search Results {searchResults.length > 0 && `(${searchResults.length})`}
            </h3>
            {searchResults.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">
                  No results found for "{searchQuery}". Try a different search term.
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Note: Only {stats?.total_transcribed || 0} of {stats?.total_archives || 0} files have been transcribed.
                </p>
              </div>
            ) : (
              searchResults.map((result, idx) => (
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
              ))
            )}
          </div>
        )}
      </div>

      {/* Archives Table with Expandable Rows */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
            Archive Files
          </h2>
          
          {/* Items per page selector */}
          <div className="flex items-center space-x-2 self-end md:self-auto">
            <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1) // Reset to first page when changing items per page
              }}
              className="px-2 md:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs md:text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading archives...</div>
        ) : (
          <>
            {/* Sort archives by date descending and paginate */}
            {(() => {
              // Sort archives by filename (which contains date/time) descending
              const sortedArchives = [...archives].sort((a, b) => {
                // Parse the date from filename (format: YYYYMMDD_timestamp_feedid.mp3)
                const dateA = a.filename.substring(0, 8) + a.filename.substring(9, 19)
                const dateB = b.filename.substring(0, 8) + b.filename.substring(9, 19)
                return dateB.localeCompare(dateA) // Descending order
              })
              
              // Calculate pagination
              const totalPages = Math.ceil(sortedArchives.length / itemsPerPage)
              const startIndex = (currentPage - 1) * itemsPerPage
              const endIndex = startIndex + itemsPerPage
              const paginatedArchives = sortedArchives.slice(startIndex, endIndex)
              
              return (
                <>
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
                        {paginatedArchives.map((archive) => {
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
                            className="p-1 md:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
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
                              className="p-1 md:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="View Transcription"
                            >
                              <FileText className="h-4 w-4 md:h-5 md:w-5" />
                            </button>
                          ) : transcribingFiles.has(archive.filename) ? (
                            <button
                              disabled
                              className="p-1.5 rounded text-yellow-600 dark:text-yellow-400 cursor-not-allowed opacity-75"
                              title="Transcribing..."
                            >
                              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => downloadFile(archive.filename, 'mp3')}
                            className="p-1 md:p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4 md:h-5 md:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row with Audio Player and Transcript */}
                    {expandedRow === archive.filename && (
                      <tr>
                        <td colSpan={5} className="px-3 md:px-6 py-3 md:py-4">
                          <div className="space-y-4">
                            {/* Audio Player */}
                            <div className="bg-gray-900 rounded-lg p-3 md:p-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 gap-2">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Volume2 className="h-5 w-5 text-blue-400" />
                                    <span className="text-base md:text-lg font-medium text-white">Audio Player</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5 md:mt-1">
                                    File: {archive.filename}
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadFile(archive.filename, 'mp3')}
                                  className="flex items-center space-x-1 md:space-x-2 text-blue-400 hover:text-blue-300 text-xs md:text-sm"
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
                              <div className="bg-gray-900 rounded-lg p-3 md:p-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-4 gap-2">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-5 w-5 text-green-400" />
                                    <span className="text-base md:text-lg font-medium text-white">
                                      Transcript ({transcription.model || archive.transcription_model} model)
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    {/* Auto-scroll toggle */}
                                    <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-gray-100 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={autoScrollEnabled}
                                        onChange={(e) => setAutoScrollEnabled(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                                      />
                                      <ScrollText className={`h-4 w-4 ${autoScrollEnabled ? 'text-blue-400' : 'text-gray-500'}`} />
                                      <span>Auto-scroll</span>
                                    </label>
                                    
                                    <button
                                      onClick={() => downloadFile(archive.filename, 'txt')}
                                      className="flex items-center space-x-1 md:space-x-2 text-green-400 hover:text-green-300 text-xs md:text-sm"
                                    >
                                      <Download className="h-4 w-4" />
                                      <span className="text-sm">Download TXT</span>
                                    </button>
                                  </div>
                                </div>
                                
                                <div 
                                  ref={transcriptContainerRef}
                                  className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto"
                                >
                                  {transcription.segments && transcription.segments.length > 0 ? (
                                    transcription.segments.map((segment, idx) => {
                                      const isActive = playingAudio === archive.filename &&
                                        audioCurrentTime >= segment.start &&
                                        audioCurrentTime <= segment.end
                                      
                                      return (
                                        <div
                                          key={idx}
                                          ref={isActive ? activeSegmentRef : null}
                                          onClick={() => handleTranscriptClick(segment.start, archive.filename)}
                                          className={`flex items-start space-x-4 p-2 rounded cursor-pointer hover:bg-gray-800 transition-colors ${
                                            isActive
                                              ? 'bg-blue-900 bg-opacity-30 border-l-4 border-blue-400'
                                              : ''
                                          }`}
                                          title="Click to jump to this timestamp"
                                        >
                                          <div className="text-sm text-blue-400 whitespace-nowrap hover:text-blue-300">
                                            [{formatTime(segment.start)} - {formatTime(segment.end)}]
                                          </div>
                                          <div className="text-sm text-gray-300 flex-1">
                                            {segment.text}
                                          </div>
                                        </div>
                                      )
                                    })
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
                              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
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
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center justify-between mt-4 px-2 md:px-4 gap-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-2 md:px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 text-sm md:text-base"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {/* Show page numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-2 md:px-3 py-1 rounded-lg text-sm md:text-base ${
                                  currentPage === pageNum
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 md:px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 text-sm md:text-base"
                        >
                          Next
                        </button>
                      </div>
                      
                      <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
                        Showing {startIndex + 1}-{Math.min(endIndex, sortedArchives.length)} of {sortedArchives.length} files
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}