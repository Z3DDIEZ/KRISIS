import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

function AuthPage() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match')
          return
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user
        await setDoc(doc(db, `users/${user.uid}`), {
          email: user.email,
          createdAt: serverTimestamp(),
          settings: { emailNotifications: true },
        })
        toast.success('Account created!')
        navigate('/')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast.success('Access granted')
        navigate('/')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      toast.error(errorMessage)
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
      await setDoc(
        doc(db, `users/${user.uid}`),
        {
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      toast.success('Linked to Cloud Intelligence')
      navigate('/')
    } catch (error: unknown) {
      toast.error('Google authentication failed')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative font-primary">
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
            <Icon name="work" size={24} className="text-white" />
          </div>
          <span className="font-black text-3xl tracking-tight text-zinc-900 dark:text-white">
            KRISIS
          </span>
        </div>

        <Card className="p-8 shadow-xl border-zinc-100 dark:border-zinc-800">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-4">
              Auth Portal
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg max-w-sm mx-auto">
              Secure access to the intelligence protocol
            </p>
          </header>

          <form className="space-y-6" onSubmit={handleEmailAuth}>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm placeholder-zinc-400"
                  placeholder="name@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm placeholder-zinc-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={18} />
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="flex flex-col gap-2 animate-fade-in">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm placeholder-zinc-400"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full py-3 h-12 shadow-lg shadow-primary-500/20"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
              </div>
              <span className="relative px-4 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-400">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full h-12 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold flex items-center justify-center gap-3 rounded-lg transition-all text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-8 mx-auto block text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </Card>
      </div>
    </div>
  )
}

export default AuthPage
