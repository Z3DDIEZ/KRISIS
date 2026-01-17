import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Settings from './pages/Settings'
import AuthLayout from './layouts/AuthLayout'

function AppRoutes() {
  return (
    <AuthLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/new" element={<ApplicationDetail />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AuthLayout>
  )
}

export default AppRoutes