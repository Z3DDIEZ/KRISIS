import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  base: '/krisis/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined // Disable manual chunking for now
      }
    }
  }
})