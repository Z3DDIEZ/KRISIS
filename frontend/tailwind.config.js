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
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        primary: {
          50: '#FEF3E7',
          100: '#FCE3C5',
          200: '#FAD0A3',
          300: '#F8BD81',
          400: '#F6AA5F',
          500: '#E67E22', // Base brand color
          600: '#CA6C1E',
          700: '#AE5A1A',
          800: '#924816',
          900: '#763612',
        },
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      spacing: {
        '1': '0.5rem',   // 8px
        '2': '1rem',     // 16px
        '3': '1.5rem',   // 24px
        '4': '2rem',     // 32px
        '5': '2.5rem',   // 40px
        '6': '3rem',     // 48px
        '8': '4rem',     // 64px
      },
      fontSize: {
        'xs': ['0.64rem', { lineHeight: '1.2', letterSpacing: '0.025em' }],   // metadata
        'sm': ['0.8rem', { lineHeight: '1.2', letterSpacing: '0.025em' }],    // labels
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],           // body
        'lg': ['1.25rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }],   // subheadings
        'xl': ['1.563rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }],  // headings
        '2xl': ['1.953rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }], // page titles
        '3xl': ['2.441rem', { lineHeight: '1.2', letterSpacing: '-0.025em' }], // display/hero
      },
      borderRadius: {
        'sm': '0.25rem',  // 4px
        'md': '0.5rem',   // 8px
        'lg': '0.75rem',  // 12px
        'xl': '1rem',     // 16px
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'orange': '0 0 0 3px rgba(230, 126, 34, 0.2)',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'decelerate': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'accelerate': 'cubic-bezier(0.4, 0.0, 1, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '250ms',
        'slow': '350ms',
      },
    },
  },
  plugins: [],
}
