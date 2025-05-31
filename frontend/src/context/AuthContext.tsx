import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from '../api';
import type { User, LoginCredentials, RegisterData } from '../types';
import axiosBase from '../api/index';

// Define the AuthState type
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Define the AuthContext type
export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Define action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'AUTH_FAIL'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'REFRESH_TOKEN'; payload: { token: string; refreshToken: string } };

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer function
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAIL':
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'REFRESH_TOKEN':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
      };
    default:
      return state;
  }
};

// Create context
export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {},
  updateUser: () => {},
});

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up axios authentication header
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Auto-refresh token function
  const refreshToken = useCallback(async () => {
    if (!state.refreshToken) return;

    try {
      const res = await axios.post('/api/auth/refresh-token', { refreshToken: state.refreshToken });
      dispatch({
        type: 'REFRESH_TOKEN',
        payload: {
          token: res.data.access_token,
          refreshToken: res.data.refresh_token || state.refreshToken,
        },
      });
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.refreshToken]);

  // Check token expiration and set up token refresh
  useEffect(() => {
    const checkTokenExpiration = async () => {
      if (!state.token) {
        dispatch({ type: 'LOGOUT' });
        return;
      }

      try {
        // Decode token to check expiration
        const decoded: any = jwtDecode(state.token);
        const currentTime = Date.now() / 1000;

        // If token is expired
        if (decoded.exp < currentTime) {
          await refreshToken();
        }
        // If token is valid but will expire soon (less than 15 minutes)
        else if (decoded.exp < currentTime + 15 * 60) {
          await refreshToken();
        }
        // If token is valid, load user data
        else {
          loadUser();
        }
      } catch (err) {
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkTokenExpiration();

    // Set up token refresh interval (every 15 minutes)
    const refreshInterval = setInterval(refreshToken, 15 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [state.token, refreshToken]);

  // Load user data
  const loadUser = useCallback(async () => {
    if (!state.token) return;

    try {
      const res = await axios.get('/api/auth/me');
      dispatch({ type: 'UPDATE_USER', payload: res.data });
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.token]);

  // Login user
  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'AUTH_START' });

    try {
      const res = await axios.post(`${axiosBase}/api/auth/login`, credentials);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: res.data.user,
          token: res.data.access_token,
          refreshToken: res.data.refresh_token,
        },
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Authentication failed';
      dispatch({ type: 'AUTH_FAIL', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Register user
  const register = async (data: RegisterData) => {
    dispatch({ type: 'AUTH_START' });

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', data);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: res.data.user,
          token: res.data.access_token,
          refreshToken: res.data.refresh_token,
        },
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Registration failed';
      dispatch({ type: 'AUTH_FAIL', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Logout user
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (!state.user) return;
    
    dispatch({
      type: 'UPDATE_USER',
      payload: { ...state.user, ...userData },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        error: state.error,
        login,
        register,
        logout,
        clearError,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};