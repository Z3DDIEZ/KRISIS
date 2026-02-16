import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../lib/firebase'
import AuthPage from '../pages/AuthPage'
import MainLayout from './MainLayout'
import Icon from '../components/ui/Icon'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Card } from '../components/ui/Card'

interface AuthLayoutProps {
  children: React.ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  // Check if Firebase is properly configured
  const isFirebaseConfigured =
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key'

  const [user, loading] = useAuthState(auth)

  // If Firebase is not configured, show demo mode
  if (!isFirebaseConfigured) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-8 p-6">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30 p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 rounded-full shrink-0">
              <Icon name="warning" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-primary-600">
                  <Icon name="work" size={40} />
                </div>
                <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                  KRISIS
                </h1>
              </div>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] translate-x-1">
                Intelligence Orchestration
              </p>
              <p className="text-yellow-700 dark:text-yellow-300/80 text-sm font-medium leading-relaxed">
                Firebase is not configured. This is a demo version. To enable full functionality,
                set up Firebase environment variables in your deployment.
              </p>
            </div>
          </Card>
          {children}
        </div>
      </MainLayout>
    )
  }

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
