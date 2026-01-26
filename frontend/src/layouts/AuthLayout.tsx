import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../lib/firebase'
import AuthPage from '../pages/AuthPage'
import MainLayout from './MainLayout'
import Icon from '../components/ui/Icon'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface AuthLayoutProps {
  children: React.ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  // Check if Firebase is properly configured
  const isFirebaseConfigured = import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key'

  // If Firebase is not configured, show demo mode
  if (!isFirebaseConfigured) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0 text-yellow-600">
                <Icon name="warning" size={20} />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Demo Mode Active
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Firebase is not configured. This is a demo version. To enable full functionality,
                    set up Firebase environment variables in your deployment.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {children}
        </div>
      </MainLayout>
    )
  }

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