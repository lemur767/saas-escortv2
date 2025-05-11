import { createContext, useEffect, useState, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuthContext } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// Create the initial context
export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

// Provider component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { isAuthenticated, token } = useContext(AuthContext);

  useEffect(() => {
    // Only connect socket if user is authenticated
    if (isAuthenticated && token) {
      // Initialize socket connection
      const socketInstance = io('', {
        auth: {
          token
        },
        // Use path if your backend has a specific socket.io path
        path: '/socket.io',
        // Reconnection settings
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Set up event listeners
      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Save socket instance
      setSocket(socketInstance);

      // Clean up on unmount
      return () => {
        console.log('Disconnecting socket');
        socketInstance.disconnect();
      };
    } else if (socket) {
      // Disconnect if user logs out
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};