/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-primary)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Brand & System Colors (mapped to 50-900 scale)
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        gray: {
          50: 'var(--gray-50)',
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
        },
        // Semantic aliases
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',

        // Navigation / Theme
        background: 'var(--background-light)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-primary': 'var(--border-light)',
      },
      spacing: {
        '1': 'var(--spacing-1)',
        '2': 'var(--spacing-2)',
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '5': 'var(--spacing-5)',
        '6': 'var(--spacing-6)',
        '8': 'var(--spacing-8)',
      },
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: '1rem', letterSpacing: 'var(--tracking-wide)' }],
        'sm': ['var(--text-sm)', { lineHeight: '1.25rem', letterSpacing: 'var(--tracking-normal)' }],
        'base': ['var(--text-base)', { lineHeight: '1.5rem', letterSpacing: 'var(--tracking-normal)' }],
        'lg': ['var(--text-lg)', { lineHeight: '1.75rem', letterSpacing: 'var(--tracking-tight)' }],
        'xl': ['var(--text-xl)', { lineHeight: '2rem', letterSpacing: 'var(--tracking-tight)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '2.25rem', letterSpacing: 'var(--tracking-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '2.5rem', letterSpacing: 'var(--tracking-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '3rem', letterSpacing: 'var(--tracking-tight)' }],
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'orange': 'var(--shadow-orange)',
      },
      transitionTimingFunction: {
        'standard': 'var(--ease-standard)',
        'decelerate': 'var(--ease-decelerate)',
        'accelerate': 'var(--ease-accelerate)',
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'base': 'var(--duration-base)',
        'slow': 'var(--duration-slow)',
      },
    },
  },
  plugins: [],
}
