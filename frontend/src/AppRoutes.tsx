import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import JobSearch from './pages/JobSearch'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import DataManagement from './pages/DataManagement'
import Analytics from './pages/Analytics'
import AuthLayout from './layouts/AuthLayout'

function AppRoutes() {
  return (
    <AuthLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/new" element={<ApplicationDetail />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/jobs" element={<JobSearch />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/data" element={<DataManagement />} />
      </Routes>
    </AuthLayout>
  )
}

export default AppRoutes