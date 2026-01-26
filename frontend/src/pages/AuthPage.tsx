import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'

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
          settings: { emailNotifications: true }
        })
        toast.success('Account created!')
        navigate('/')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast.success('Access granted')
        navigate('/')
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
      await setDoc(doc(db, `users/${user.uid}`), {
        email: user.email,
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast.success('Linked to Cloud Intelligence')
      navigate('/')
    } catch (error: any) {
      toast.error('Google authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
      {/* Background elements (Bauhaus) */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] border-[60px] border-primary-500/5 rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-primary-500/5 rotate-45" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 bg-primary-500 rounded flex items-center justify-center shadow-lg">
            <Icon name="work" size={24} className="text-white" />
          </div>
          <span className="font-black text-3xl tracking-tighter text-gray-900 dark:text-white">KRISIS</span>
        </div>

        <div className="card border-t-4 border-t-primary-500 shadow-2xl bg-white dark:bg-gray-800">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {isSignUp ? 'Initialize Protocol' : 'Identity Verification'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {isSignUp ? 'Create your tracking node' : 'Provide keys for pipeline access'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleEmailAuth}>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global Identifier</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-all font-medium"
                  placeholder="agent@krisis.io"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Access Key</label>
                  {!isSignUp && (
                    <button type="button" className="text-[10px] font-bold text-primary-500 hover:underline uppercase tracking-wide">Lost Key?</button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <Icon name={showPassword ? "visibility-off" : "visibility"} size={18} />
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="flex flex-col gap-2 animate-fade-in">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Confirm Key</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary-500 hover:bg-primary-600 text-white font-black uppercase tracking-[0.2em] rounded-md shadow-lg shadow-primary-500/20 active:translate-y-0.5 transition-all text-sm"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Register Node' : 'Authorize')}
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-700"></div></div>
              <span className="relative px-4 bg-white dark:bg-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">External Access</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full h-12 border-2 border-gray-100 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-900 dark:text-white font-bold flex items-center justify-center gap-3 rounded-md transition-all text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Linked Cloud Access
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-8 mx-auto block text-xs font-black text-primary-500 hover:text-primary-600 uppercase tracking-widest transition-colors border-b-2 border-transparent hover:border-primary-500"
          >
            {isSignUp ? 'Switch to Authorization' : 'Request Registry Access'}
          </button>
        </div>
      </div>

      <div className="mt-12 text-center relative z-10">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.5em]">Swiss-Engineered Pipeline Monitoring</p>
      </div>
    </div>
  )
}

export default AuthPage
