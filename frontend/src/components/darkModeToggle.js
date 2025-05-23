// darkModeToggle.js

// Function to toggle dark mode
function toggleDarkMode() {
  // Check if dark mode is enabled
  if (localStorage.getItem('darkMode') === 'enabled') {
    localStorage.setItem('darkMode', 'disabled');
    document.documentElement.classList.remove('dark');
  } else {
    localStorage.setItem('darkMode', 'enabled');
    document.documentElement.classList.add('dark');
  }
}

// Function to initialize dark mode based on user preference
function initializeDarkMode() {
  // Check if the user has previously enabled dark mode
  if (localStorage.getItem('darkMode') === 'enabled' || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches && 
       !localStorage.getItem('darkMode'))) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'enabled');
    if (document.getElementById('darkModeToggle')) {
      document.getElementById('darkModeToggle').checked = true;
    }
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'disabled');
  }
}

// Initialize dark mode when the page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeDarkMode();
  
  // Add event listener to the toggle switch if it exists
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', toggleDarkMode);
  }
  
  // Listen for changes in the OS/browser color scheme
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newColorScheme = event.matches ? 'dark' : 'light';
    if (!localStorage.getItem('darkMode')) { // Only auto-switch if user hasn't explicitly chosen
      if (newColorScheme === 'dark') {
        document.documentElement.classList.add('dark');
        if (darkModeToggle) darkModeToggle.checked = true;
      } else {
        document.documentElement.classList.remove('dark');
        if (darkModeToggle) darkModeToggle.checked = false;
      }
    }
  });
});