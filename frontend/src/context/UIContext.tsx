import { createContext, useReducer } from 'react';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  currentProfileId: number | null;
}

interface UIContextType extends UIState {
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setCurrentProfile: (profileId: number | null) => void;
}

const initialState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  currentProfileId: null,
};

type UIAction =
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_CURRENT_PROFILE'; payload: number | null };

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
    case 'TOGGLE_THEME':
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return {
        ...state,
        theme: newTheme,
      };
    case 'SET_CURRENT_PROFILE':
      return {
        ...state,
        currentProfileId: action.payload,
      };
    default:
      return state;
  }
};

// Create context
export const UIContext = createContext<UIContextType>({
  ...initialState,
  toggleSidebar: () => {},
  toggleTheme: () => {},
  setCurrentProfile: () => {},
});

// Provider component
export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Toggle sidebar
  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  // Toggle theme
  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  // Set current profile
  const setCurrentProfile = (profileId: number | null) => {
    dispatch({ type: 'SET_CURRENT_PROFILE', payload: profileId });
  };

  return (
    <UIContext.Provider
      value={{
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        currentProfileId: state.currentProfileId,
        toggleSidebar,
        toggleTheme,
        setCurrentProfile,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};