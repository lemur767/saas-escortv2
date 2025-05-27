

import { useState, useEffect } from 'react';

const ToggleDark = ({ 
  size = 'md', 
  showLabels = true, 
  className = '',
  style = 'switch' // 'switch' or 'button'
}) => {
  const [isDark, setIsDark] = useState(false);

  // Initialize dark mode on component mount
  useEffect(() => {
    const initializeDarkMode = () => {
      const savedTheme = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const shouldUseDark = savedTheme === 'enabled' || 
        (savedTheme === null && prefersDark);
      
      setIsDark(shouldUseDark);
      
      if (shouldUseDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    initializeDarkMode();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
      if (!localStorage.getItem('darkMode')) {
        setIsDark(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'disabled');
    }
  };

 // Define the size type explicitly
type SizeKey = 'sm' | 'md' | 'lg';

// Define the style configuration with proper typing
interface SizeStyles {
  switch: string;
  slider: string;
  button: string;
  icon: string;
  text: string;
}

// Type the styles object properly
const sizeStyles: Record<SizeKey, SizeStyles> = {
  sm: {
    switch: 'w-11 h-6',
    slider: 'h-5 w-5 left-0.5 bottom-0.5',
    button: 'p-1',
    icon: 'w-3 h-3',
    text: 'text-sm'
  },
  md: {
    switch: 'w-14 h-7',
    slider: 'h-6 w-6 left-0.5 bottom-0.5',
    button: 'p-2',
    icon: 'w-4 h-4',
    text: 'text-base'
  },
  lg: {
    switch: 'w-16 h-8',
    slider: 'h-7 w-7 left-0.5 bottom-0.5',
    button: 'p-2',
    icon: 'w-5 h-5',
    text: 'text-lg'
  }
};

interface DarkModeToggleProps {
  size?: SizeKey;
  showLabel?: boolean;
  className?: string;
}

const currentSize = sizeStyles[size as 'sm' | 'md' | 'lg'];

  // Switch Style Component
  const SwitchToggle = () => (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLabels && (
        <span className={`${currentSize.text} text-gray-700 dark:text-gray-300 font-medium`}>
          Light
        </span>
      )}
      
      <button
        onClick={toggleDarkMode}
        className={`
          relative inline-flex ${currentSize.switch} items-center rounded-full 
          transition-colors duration-300 ease-in-out focus:outline-none 
          focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          ${isDark 
            ? 'bg-indigo-600 hover:bg-indigo-700' 
            : 'bg-gray-300 hover:bg-gray-400'
          }
        `}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
      >
        <span
          className={`
            inline-block ${currentSize.slider} bg-white rounded-full shadow-lg 
            transform transition-transform duration-300 ease-in-out
            ${isDark ? `translate-x-${size === 'sm' ? '4' : size === 'lg' ? '8' : '6'}` : 'translate-x-0'}
          `}
        />
      </button>
      
      {showLabels && (
        <span className={`${currentSize.text} text-gray-700 dark:text-gray-300 font-medium`}>
          Dark
        </span>
      )}
    </div>
  );

  // Button Style Component
  const ButtonToggle = () => (
    <button
      onClick={toggleDarkMode}
      className={`
        ${currentSize.button} rounded-full transition-all duration-200 
        hover:bg-gray-200 dark:hover:bg-gray-700 
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${className}
      `}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        // Sun icon for light mode (shown in dark mode)
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`${currentSize.icon} text-yellow-500`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      ) : (
        // Moon icon for dark mode (shown in light mode)
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`${currentSize.icon} text-gray-700`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      )}
    </button>
  );

  return style === 'switch' ? <SwitchToggle /> : <ButtonToggle />;
};

export default ToggleDark;