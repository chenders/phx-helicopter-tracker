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
    const wsUrl = 'ws://localhost:8001/ws'
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
