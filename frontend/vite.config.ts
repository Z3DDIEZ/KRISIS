import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment (only in production)
  base: process.env.NODE_ENV === 'production' ? '/KRISIS/' : '/',
  build: {
    // Ensure deterministic builds
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable manual chunking for now
        // Make chunk names deterministic
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Ensure consistent builds
    minify: 'esbuild',
    sourcemap: false
  }
})