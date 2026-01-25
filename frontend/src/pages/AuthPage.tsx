import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { toast } from 'sonner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Icon from '../components/ui/Icon'

function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    if (isSignUp && password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Create user profile document
        await setDoc(doc(db, `users/${user.uid}`), {
          email: user.email,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          settings: {
            emailNotifications: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })

        toast.success('Account created successfully! Please check your email for verification.')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast.success('Signed in successfully!')
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider()
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user profile exists, create if not
      const userDocRef = doc(db, `users/${user.uid}`)
      try {
        // Try to create the document (will fail if it already exists due to Firestore rules)
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          settings: {
            emailNotifications: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }, { merge: true }) // Use merge to avoid overwriting existing data
      } catch (error) {
        // Document already exists, which is fine
        console.log('User profile already exists')
      }

      toast.success('Signed in with Google!')
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light py-12 px-4 sm:px-6 lg:px-8 font-primary">
      <div className="max-w-md w-full animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-orange to-primary-orange-light rounded-2xl shadow-lg mb-4">
            <Icon name="dashboard" size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            KRISIS
          </h1>
          <p className="text-secondary font-medium tracking-tight">
            Job application tracking for the modern era
          </p>
        </div>

        <div className="card shadow-2xl overflow-hidden border border-border-light">
          <div className="p-8">
            <h2 className="text-xl font-bold text-primary mb-2">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-secondary mb-8 font-medium">
              {isSignUp ? 'Join thousands of job seekers today.' : 'Sign in to continue your progress.'}
            </p>

            <form className="space-y-6" onSubmit={handleEmailAuth}>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <div className="search-input-wrapper">
                    <Icon name="person" size={16} className="search-input-icon" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="search-input-wrapper">
                    <Icon name="lock" size={16} className="search-input-icon" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div className="form-group animate-slide-down">
                    <label className="form-label">Confirm password</label>
                    <div className="search-input-wrapper">
                      <Icon name="lock" size={16} className="search-input-icon" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-orange w-full h-12 flex justify-center items-center font-bold text-base shadow-lg shadow-primary-orange/20"
              >
                {loading ? <LoadingSpinner size="sm" /> : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-light" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-background-white text-muted font-bold uppercase tracking-widest">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="btn btn--secondary w-full h-12 flex justify-center items-center gap-3 font-bold text-sm bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google Account
              </button>
            </form>
          </div>
          <div className="bg-surface-2 p-5 border-t border-border-light text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary-orange hover:text-primary-orange-light text-sm font-bold tracking-tight transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "New to KRISIS? Create an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage