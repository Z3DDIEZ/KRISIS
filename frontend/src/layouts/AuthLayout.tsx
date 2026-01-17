import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../lib/firebase'
import AuthPage from '../pages/AuthPage'
import MainLayout from './MainLayout'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface AuthLayoutProps {
  children: React.ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  const [user, loading] = useAuthState(auth)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <MainLayout>{children}</MainLayout>
}

export default AuthLayout