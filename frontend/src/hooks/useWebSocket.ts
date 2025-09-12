import { useEffect, useState, useRef } from 'react'

interface WebSocketHook {
  socket: WebSocket | null
  lastMessage: any
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  sendMessage: (message: any) => void
}

export function useWebSocket(): WebSocketHook {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const reconnectTimeoutRef = useRef<number>()

  const connect = () => {
    // Dynamically determine WebSocket URL based on current hostname
    const getWsUrl = () => {
      // Use secure WebSocket if page is served over HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const hostname = window.location.hostname

      // If accessed via nginx proxy (port 9080), use it for WebSocket too
      if (window.location.port === '9080') {
        return `${protocol}//${hostname}:9080/ws`
      }

      // Otherwise use direct backend port
      return `${protocol}//${hostname}/ws`
    }

    const wsUrl = getWsUrl()
    console.log('Connecting to WebSocket:', wsUrl)

    const ws = new WebSocket(wsUrl)

    setSocket(ws)
    setConnectionStatus('connecting')

    ws.onopen = () => {
      console.log('WebSocket connected')
      setConnectionStatus('connected')
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setConnectionStatus('disconnected')

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log('Attempting to reconnect...')
        connect()
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('disconnected')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setLastMessage(message)
        console.log('WebSocket message received:', message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    return ws
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socket) {
        socket.close()
      }
    }
  }, [])

  const sendMessage = (message: any) => {
    if (socket && connectionStatus === 'connected') {
      socket.send(JSON.stringify(message))
    }
  }

  return {
    socket,
    lastMessage,
    connectionStatus,
    sendMessage
  }
}
