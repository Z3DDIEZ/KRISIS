import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import AuthLayout from './layouts/AuthLayout'

function AppRoutes() {
  return (
    <AuthLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </AuthLayout>
  )
}

export default AppRoutes