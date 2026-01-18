import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppRoutes from './AppRoutes'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

function App() {
  const basename = import.meta.env.PROD ? '/KRISIS' : ''

  return (
    <QueryClientProvider client={queryClient}>
      <Router basename={basename} future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
          <Toaster position="top-right" />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App