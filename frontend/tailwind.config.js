// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class', // This enables the class-based dark mode
  theme: {
    extend: {
      colors: {
        // You can add custom color mappings here
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          dark: 'var(--secondary-dark)',
          light: 'var(--secondary-light)',
        },
      },
      backgroundColor: {
        'app': 'var(--background)',
        'card': 'var(--card-bg)',
      },
      textColor: {
        'app': 'var(--foreground)',
      },
      borderColor: {
        'app': 'var(--border-color)',
      },
    },
  },
  plugins: [],
}