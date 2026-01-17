import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' ? '/krisis/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui': ['react', 'react-dom'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'lodash-es']
        }
      }
    }
  }
})