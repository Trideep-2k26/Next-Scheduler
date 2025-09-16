/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // darkMode: 'class', // Dark mode disabled
  theme: {
    extend: {
      colors: {
        // Red primary colors
        primary: {
          DEFAULT: '#DC2626', // red-600
          50: '#FEF2F2',
          100: '#FEE2E2', 
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444', // red-500
          600: '#DC2626', // red-600 - main
          700: '#B91C1C', // red-700
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A'
        },
        // Modern grays for light/dark mode
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6', 
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712'
        },
        // Theme-aware colors
        background: {
          light: '#FFFFFF',
          dark: '#0F0F0F'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1A1A1A'
        },
        border: {
          light: '#E5E7EB',
          dark: '#374151'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(220, 38, 38, 0.3)',
        'glow-red-lg': '0 0 30px rgba(220, 38, 38, 0.4)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'soft-dark': '0 2px 8px rgba(0, 0, 0, 0.3)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-up': 'scaleUp 0.15s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleUp: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' }
        }
      }
    },
  },
  plugins: [],
}
