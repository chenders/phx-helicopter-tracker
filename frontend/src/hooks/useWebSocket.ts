import { useEffect, useState, useRef } from 'react'

interface WebSocketHook {
  socket: WebSocket | null
  lastMessage: any
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  sendMessage: (message: any) => void
}

export function useWebSocket(): WebSocketHook {
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')

  // The live socket lives in a ref so the effect cleanup always closes the
  // CURRENT socket. (Previously the socket was only in state, and the []-deps
  // cleanup closed over the initial `null`, so the socket was never closed on
  // unmount — and each reconnect spawned another orphaned socket.)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number>()
  // Gate reconnects so an intentional close (unmount) doesn't immediately
  // schedule a new connection from the onclose handler.
  const shouldReconnectRef = useRef(true)

  useEffect(() => {
    shouldReconnectRef.current = true

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

    const connect = () => {
      const wsUrl = getWsUrl()
      console.log('Connecting to WebSocket:', wsUrl)

      const ws = new WebSocket(wsUrl)
      socketRef.current = ws
      setConnectionStatus('connecting')

      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setConnectionStatus('disconnected')

        // Only reconnect if we're still mounted and didn't close on purpose.
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect...')
            connect()
          }, 3000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('disconnected')
      }

      ws.onmessage = (event) => {
        try {
          setLastMessage(JSON.parse(event.data))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
    }

    connect()

    return () => {
      // Stop reconnect attempts and cancel any pending one.
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = undefined
      }

      const ws = socketRef.current
      if (ws) {
        // Detach handlers first so the closing socket can't fire a reconnect
        // or a setState on an unmounted component.
        ws.onopen = null
        ws.onclose = null
        ws.onerror = null
        ws.onmessage = null
        ws.close()
        socketRef.current = null
      }
    }
  }, [])

  const sendMessage = (message: any) => {
    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  return {
    socket: socketRef.current,
    lastMessage,
    connectionStatus,
    sendMessage
  }
}
