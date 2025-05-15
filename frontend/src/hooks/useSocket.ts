import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

// Define the message structure from backend
export interface Message {
  id: number
  content: string
  is_incoming: boolean
  sender_number: string
  ai_generated: boolean
  timestamp: string
  is_read: boolean
  profile_id: number
  send_status?: 'sent' | 'failed' | 'pending'
  send_error?: string
}

// Define the socket connection states
export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// Define the events that can be emitted from the frontend
export interface SocketEmitEvents {
  join_profile: { profile_id: number }
  leave_profile: { profile_id: number }
  mark_messages_read: { profile_id: number; sender_number: string }
  send_message: { profile_id: number; recipient_number: string; content: string }
}

// Define the events that can be received from the backend
export interface SocketReceiveEvents {
  new_message: Message
  message_status_update: { message_id: number; status: string; error?: string }
  typing_indicator: { profile_id: number; sender_number: string; is_typing: boolean }
  profile_status_update: { profile_id: number; status: string }
}

interface UseSocketOptions {
  // The base URL for your backend server
  serverUrl?: string
  // Auth token for authenticated connections
  authToken?: string
  // Auto-connect on mount
  autoConnect?: boolean
  // Reconnection options
  reconnectAttempts?: number
  reconnectInterval?: number
}

interface UseSocketReturn {
  // Socket connection instance
  socket: Socket | null
  // Current connection state
  connectionState: SocketConnectionState
  // Whether the socket is connected
  isConnected: boolean
  // Function to manually connect
  connect: () => void
  // Function to manually disconnect
  disconnect: () => void
  // Function to emit events to the server
  emit: <K extends keyof SocketEmitEvents>(
    event: K,
    data: SocketEmitEvents[K]
  ) => void
  // Function to listen for events from server
  on: <K extends keyof SocketReceiveEvents>(
    event: K,
    handler: (data: SocketReceiveEvents[K]) => void
  ) => () => void
  // Function to remove event listeners
  off: <K extends keyof SocketReceiveEvents>(
    event: K,
    handler?: (data: SocketReceiveEvents[K]) => void
  ) => void
  // Last error that occurred
  lastError: string | null
  // Connection statistics
  stats: {
    connectTime: Date | null
    disconnectTime: Date | null
    reconnectCount: number
  }
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
    authToken,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 2000
  } = options

  // Refs to maintain state across re-renders
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const isConnectingRef = useRef(false)

  // State variables
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    connectTime: null as Date | null,
    disconnectTime: null as Date | null,
    reconnectCount: 0
  })

  // Create socket connection
  const createSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current
    }

    console.log('Creating new socket connection...')
    
    // Socket.IO client options
    const socketOptions = {
      // Enable CORS
      withCredentials: true,
      // Add auth token if provided
      ...(authToken && {
        auth: {
          token: authToken
        }
      }),
      // Auto-connect behavior
      autoConnect: false,
      // Transport options
      transports: ['websocket', 'polling'],
      // Timeout settings
      timeout: 10000,
      // Reconnection settings (handled manually for more control)
      reconnection: false
    }

    const socket = io(serverUrl, socketOptions)

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully')
      setConnectionState('connected')
      setLastError(null)
      setStats(prev => ({
        ...prev,
        connectTime: new Date(),
        reconnectCount: reconnectCountRef.current
      }))
      
      // Reset reconnect count on successful connection
      reconnectCountRef.current = 0
      isConnectingRef.current = false
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setConnectionState('disconnected')
      setStats(prev => ({
        ...prev,
        disconnectTime: new Date()
      }))

      // Clear any pending reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Attempt to reconnect if the disconnection wasn't manual
      if (reason !== 'io client disconnect' && reconnectCountRef.current < reconnectAttempts) {
        scheduleReconnect()
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setLastError(error.message)
      setConnectionState('disconnected')
      isConnectingRef.current = false

      // Attempt to reconnect on connection error
      if (reconnectCountRef.current < reconnectAttempts) {
        scheduleReconnect()
      }
    })

    // Handle authentication errors
    socket.on('auth_error', (error) => {
      console.error('Socket authentication error:', error)
      setLastError(`Authentication failed: ${error.message}`)
      setConnectionState('disconnected')
    })

    // Store socket reference
    socketRef.current = socket
    return socket
  }, [serverUrl, authToken, reconnectAttempts])

  // Schedule a reconnection attempt
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || isConnectingRef.current) {
      return
    }

    reconnectCountRef.current += 1
    setConnectionState('reconnecting')
    
    console.log(`Scheduling reconnect attempt ${reconnectCountRef.current}/${reconnectAttempts}`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null
      
      if (reconnectCountRef.current <= reconnectAttempts) {
        console.log(`Attempting to reconnect... (${reconnectCountRef.current}/${reconnectAttempts})`)
        connect()
      } else {
        console.log('Max reconnection attempts reached')
        setConnectionState('disconnected')
        setLastError('Unable to connect to server. Please check your connection.')
      }
    }, reconnectInterval * reconnectCountRef.current)
  }, [reconnectAttempts, reconnectInterval])

  // Connect function
  const connect = useCallback(() => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      return
    }

    isConnectingRef.current = true
    setConnectionState('connecting')
    setLastError(null)

    const socket = createSocket()
    socket.connect()
  }, [createSocket])

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setConnectionState('disconnected')
    isConnectingRef.current = false
  }, [])

  // Emit function with type safety
  const emit = useCallback(<K extends keyof SocketEmitEvents>(
    event: K,
    data: SocketEmitEvents[K]
  ) => {
    if (!socketRef.current?.connected) {
      console.warn(`Cannot emit ${event}: Socket not connected`)
      return
    }

    socketRef.current.emit(event, data)
  }, [])

  // Listen function with automatic cleanup
  const on = useCallback(<K extends keyof SocketReceiveEvents>(
    event: K,
    handler: (data: SocketReceiveEvents[K]) => void
  ) => {
    if (!socketRef.current) {
      console.warn(`Cannot listen to ${event}: Socket not initialized`)
      return () => {}
    }

    socketRef.current.on(event, handler)

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, handler)
      }
    }
  }, [])

  // Remove listener function
  const off = useCallback(<K extends keyof SocketReceiveEvents>(
    event: K,
    handler?: (data: SocketReceiveEvents[K]) => void
  ) => {
    if (!socketRef.current) {
      return
    }

    if (handler) {
      socketRef.current.off(event, handler)
    } else {
      socketRef.current.off(event)
    }
  }, [])

  // Initialize socket on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  // Update connection state based on socket state
  useEffect(() => {
    const checkConnectionState = () => {
      if (!socketRef.current) {
        setConnectionState('disconnected')
        return
      }

      if (socketRef.current.connected) {
        setConnectionState('connected')
      } else if (isConnectingRef.current) {
        setConnectionState('connecting')
      } else if (reconnectTimeoutRef.current) {
        setConnectionState('reconnecting')
      } else {
        setConnectionState('disconnected')
      }
    }

    const interval = setInterval(checkConnectionState, 1000)
    return () => clearInterval(interval)
  }, [])

  // Derived state for convenience
  const isConnected = connectionState === 'connected'

  return {
    socket: socketRef.current,
    connectionState,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
    lastError,
    stats
  }
}

// Convenience hook for specific profile messaging
export function useProfileSocket(profileId: number, options: Omit<UseSocketOptions, 'autoConnect'> = {}) {
  const { socket, ...rest } = useSocket({ ...options, autoConnect: false })
  const [joinedProfile, setJoinedProfile] = useState<number | null>(null)

  // Join profile room when connected
  useEffect(() => {
    if (rest.isConnected && profileId && joinedProfile !== profileId) {
      console.log(`Joining profile room: ${profileId}`)
      rest.emit('join_profile', { profile_id: profileId })
      setJoinedProfile(profileId)
    }
  }, [rest.isConnected, profileId, joinedProfile, rest])

  // Leave profile room when disconnected or profileId changes
  useEffect(() => {
    return () => {
      if (joinedProfile && rest.isConnected) {
        console.log(`Leaving profile room: ${joinedProfile}`)
        rest.emit('leave_profile', { profile_id: joinedProfile })
      }
    }
  }, [joinedProfile, rest])

  return {
    socket,
    ...rest,
    joinedProfile
  }
}
