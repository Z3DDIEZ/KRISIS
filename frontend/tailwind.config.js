/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // Brand Identity (Bauhaus Industrial)
        brand: {
          midnight: 'var(--text-primary)',
          signal: 'var(--text-inverse)',
          orange: 'var(--primary-600)',
          gray: 'var(--bg-subtle)',
        },
        // Semantic Tokens
        bg: {
          surface: 'var(--bg-surface)',
          subtle: 'var(--bg-subtle)',
          elevated: 'var(--bg-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          industrial: 'var(--border-strong)',
        },
        // Secondary/Status
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
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      borderRadius: {
        none: '0',
        xs: '1px',
        sm: '2px', // Industrial sharp
        DEFAULT: '0',
        md: '4px',
        lg: '8px',
        full: '9999px',
      },
    },
    boxShadow: {
      sm: '1px 1px 0px rgba(0, 0, 0, 0.05)',
      md: '4px 4px 0px rgba(0, 0, 0, 0.08)', // Bauhaus offset
      lg: '8px 8px 0px rgba(0, 0, 0, 0.08)', // Bauhaus deep
      xl: '12px 12px 0px rgba(0, 0, 0, 0.08)',
      orange: '0 0 0 3px rgba(230, 126, 34, 0.1)',
      none: 'none',
    },
    transitionTimingFunction: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    },
    transitionDuration: {
      fast: '150ms',
      base: '250ms',
      slow: '350ms',
    },
  },
  plugins: [],
}
