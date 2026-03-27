import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import LoadingSpinner from './components/ui/LoadingSpinner'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Applications = lazy(() => import('./pages/Applications'))
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'))
const JobSearch = lazy(() => import('./pages/JobSearch'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))
const DataManagement = lazy(() => import('./pages/DataManagement'))
const Analytics = lazy(() => import('./pages/Analytics'))

/**
 * AppRoutes — Lazy-loaded route definitions wrapped in Suspense.
 * Each page is code-split into its own chunk for optimal TTI.
 * @returns The application route tree.
 */
function AppRoutes() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/jobs" element={<JobSearch />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/data" element={<DataManagement />} />
        </Routes>
      </Suspense>
    </AuthLayout>
  )
}

export default AppRoutes