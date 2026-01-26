import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { toast } from 'sonner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Icon from '../components/ui/Icon'

function AuthPage() {
  const navigate = useNavigate()
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

        toast.success('Account created successfully!')
        navigate('/dashboard')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast.success('Signed in successfully!')
        navigate('/dashboard')
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

      const userDocRef = doc(db, `users/${user.uid}`)
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        settings: {
          emailNotifications: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }, { merge: true })

      toast.success('Signed in with Google!')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Google authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Visual Side (Bauhaus Elements) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gray-900 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-primary-500 rounded flex items-center justify-center">
              <Icon name="work" size={20} className="text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter">KRISIS</span>
          </div>

          <h1 className="text-6xl font-black leading-none tracking-tight mb-8">
            MANAGE<br />YOUR<br /><span className="text-primary-500">PIPELINE.</span>
          </h1>
          <p className="text-gray-400 font-medium max-w-sm text-lg leading-relaxed">
            Swiss-engineered tracking for the modern software professional. No friction, just results.
          </p>
        </div>

        <div className="relative z-10 flex gap-12">
          <div>
            <div className="text-sm font-black text-primary-500 uppercase tracking-widest mb-2">Precision</div>
            <div className="text-gray-400 text-xs">Real-time status updates</div>
          </div>
          <div>
            <div className="text-sm font-black text-primary-500 uppercase tracking-widest mb-2">Identity</div>
            <div className="text-gray-400 text-xs">Personalized job analytics</div>
          </div>
        </div>

        {/* Bauhaus Geometric Accents */}
        <div className="absolute top-1/2 -right-20 w-80 h-80 border-[40px] border-primary-500/10 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary-500/5 rotate-45" />
      </div>

      {/* Auth Form Side */}
      <div className="flex items-center justify-center p-8 bg-gray-50 lg:bg-white">
        <div className="max-w-md w-full">
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
              <Icon name="work" size={16} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter">KRISIS</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              {isSignUp ? 'INITIATE ACCOUNT' : 'SECURE LOGIN'}
            </h2>
            <p className="text-gray-500 font-medium font-primary">
              {isSignUp ? 'Enter your credentials to begin tracking.' : 'Provide access keys to enter your dashboard.'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleEmailAuth}>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input h-12 bg-gray-50 border border-gray-200 focus:bg-white transition-all outline-none rounded-md px-4"
                  placeholder="name@domain.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input h-12 bg-gray-50 border border-gray-200 focus:bg-white transition-all outline-none rounded-md px-4"
                  placeholder="••••••••"
                />
              </div>

              {isSignUp && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input h-12 bg-gray-50 border border-gray-200 focus:bg-white transition-all outline-none rounded-md px-4"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block h-12 font-black tracking-widest"
            >
              {loading ? <LoadingSpinner size="sm" /> : (isSignUp ? 'REGISTER' : 'AUTHORIZE')}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-4 bg-white text-gray-400 font-black uppercase tracking-widest">Collaborative Access</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="btn btn-secondary btn-block h-12 gap-3 font-bold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Authority
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-8 text-[11px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 transition-colors block mx-auto"
          >
            {isSignUp ? 'Switc h to Authorization' : 'Request Registry Access'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
