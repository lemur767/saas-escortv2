import { io } from 'socket.io-client';
import { getToken } from './auth'; // Assuming an auth utility that provides the JWT token

let socket = null;
let messageHandlers = [];
let connectionHandlers = [];
let disconnectHandlers = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize the WebSocket connection
 * @param {string} baseURL - The base URL of the WebSocket server
 * @returns {Object} - The socket instance
 */
export const initSocket = (baseURL) => {
  // Close existing connection if any
  if (socket) {
    socket.disconnect();
  }

  // Create new socket instance
  const token = getToken();
  socket = io(baseURL, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
  });

  // Setup event listeners
  setupListeners();

  return socket;
};

/**
 * Setup socket event listeners
 */
const setupListeners = () => {
  if (!socket) return;

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected');
    reconnectAttempts = 0;
    notifyConnectionHandlers(true);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    notifyConnectionHandlers(false);
    notifyDisconnectHandlers(reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    reconnectAttempts += 1;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached, giving up');
      socket.disconnect();
    }
  });

  // Message related events
  socket.on('new_message', (message) => {
    notifyMessageHandlers(message);
  });
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Register a handler for new messages
 * @param {Function} handler - Function to be called when a new message arrives
 * @returns {Function} - Function to unregister the handler
 */
export const onNewMessage = (handler) => {
  messageHandlers.push(handler);
  return () => offNewMessage(handler);
};

/**
 * Remove a message handler
 * @param {Function} handler - The handler to remove
 */
export const offNewMessage = (handler) => {
  messageHandlers = messageHandlers.filter(h => h !== handler);
};

/**
 * Register a handler for connection status changes
 * @param {Function} handler - Function to be called when connection status changes
 * @returns {Function} - Function to unregister the handler
 */
export const onConnectionStatus = (handler) => {
  connectionHandlers.push(handler);
  return () => offConnectionStatus(handler);
};

/**
 * Remove a connection status handler
 * @param {Function} handler - The handler to remove
 */
export const offConnectionStatus = (handler) => {
  connectionHandlers = connectionHandlers.filter(h => h !== handler);
};

/**
 * Register a handler for disconnect events
 * @param {Function} handler - Function to be called when socket disconnects
 * @returns {Function} - Function to unregister the handler
 */
export const onDisconnect = (handler) => {
  disconnectHandlers.push(handler);
  return () => offDisconnect(handler);
};

/**
 * Remove a disconnect handler
 * @param {Function} handler - The handler to remove
 */
export const offDisconnect = (handler) => {
  disconnectHandlers = disconnectHandlers.filter(h => h !== handler);
};

/**
 * Send a message through the socket
 * @param {string} event - Event name
 * @param {*} data - Data to send
 * @returns {boolean} - Whether the emit was successful
 */
export const emit = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
    return true;
  }
  return false;
};

/**
 * Subscribe to messages for a specific profile
 * @param {number} profileId - Profile ID to subscribe to
 */
export const subscribeToProfile = (profileId) => {
  emit('subscribe_profile', { profile_id: profileId });
};

/**
 * Unsubscribe from a profile's messages
 * @param {number} profileId - Profile ID to unsubscribe from
 */
export const unsubscribeFromProfile = (profileId) => {
  emit('unsubscribe_profile', { profile_id: profileId });
};

/**
 * Check if socket is connected
 * @returns {boolean} - Connection status
 */
export const isConnected = () => {
  return socket && socket.connected;
};

// Helper functions to notify all registered handlers
const notifyMessageHandlers = (message) => {
  messageHandlers.forEach(handler => handler(message));
};

const notifyConnectionHandlers = (connected) => {
  connectionHandlers.forEach(handler => handler(connected));
};

const notifyDisconnectHandlers = (reason) => {
  disconnectHandlers.forEach(handler => handler(reason));
};

export default {
  initSocket,
  disconnectSocket,
  onNewMessage,
  offNewMessage,
  onConnectionStatus,
  offConnectionStatus,
  onDisconnect,
  offDisconnect,
  emit,
  subscribeToProfile,
  unsubscribeFromProfile,
  isConnected
};