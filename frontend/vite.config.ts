import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment (only in production)
  base: process.env.NODE_ENV === 'production' ? '/KRISIS/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return

          // Firebase SDK — largest single dependency
          if (id.includes('firebase') || id.includes('@firebase')) {
            return 'vendor-firebase'
          }

          // React core runtime
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            (id.includes('/react/') && !id.includes('react-'))
          ) {
            return 'vendor-react'
          }

          // Charting (recharts + d3 internals)
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts'
          }

          // PDF generation & parsing splits
          if (id.includes('jspdf')) return 'vendor-jspdf'
          if (id.includes('pdfjs-dist')) return 'vendor-pdfjs'
          if (id.includes('html2canvas')) return 'vendor-html2canvas'

          // Motion / animation libraries
          if (id.includes('framer-motion') || id.includes('@react-spring')) {
            return 'vendor-motion'
          }

          // UI primitives & state management splits
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('@radix-ui')) return 'vendor-radix'
          if (id.includes('@tanstack')) return 'vendor-tanstack'
          if (id.includes('zustand') || id.includes('sonner')) return 'vendor-state'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
})