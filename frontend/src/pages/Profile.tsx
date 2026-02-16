import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'
import { extractTextFromPDF } from '../utils/pdfHelpers'

function getInitials(displayName: string | null): string {
  if (!displayName || displayName.trim() === '') {
    return ''
  }

  // Remove parenthetical parts (like "(LORDZEDDATHON)")
  const cleanName = displayName.replace(/\([^)]*\)/g, '').trim()

  const nameParts = cleanName
    .split(' ')
    .filter((part) => part.length > 0 && !part.startsWith('(') && !part.endsWith(')'))
  if (nameParts.length === 0) return ''

  if (nameParts.length === 1) {
    // If only one name, take first two letters
    return nameParts[0].substring(0, 2).toUpperCase()
  }

  // Take first letter of first name and first letter of last name
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
}

function Profile() {
  const [user, loading] = useAuthState(auth)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Resume State
  const [resumeText, setResumeText] = useState('')
  const [isSavingResume, setIsSavingResume] = useState(false)
  const [isProcessingResume, setIsProcessingResume] = useState(false)

  // Load Resume Protocol
  useEffect(() => {
    const loadResume = async () => {
      if (!user) return
      try {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists() && docSnap.data().defaultResume) {
          setResumeText(docSnap.data().defaultResume)
        }
      } catch (error) {
        console.error('Failed to load resume protocol', error)
      }
    }
    loadResume()
  }, [user])

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingResume(true)
    try {
      const text = await extractTextFromPDF(file)
      setResumeText(text)
      toast.success('Resume extracted successfully')
    } catch {
      toast.error('Failed to parse PDF')
    } finally {
      setIsProcessingResume(false)
    }
  }

  const handleSaveResume = async () => {
    if (!user) return
    setIsSavingResume(true)
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          defaultResume: resumeText,
        },
        { merge: true }
      )
      toast.success('Standard Resume Protocol Saved')
    } catch {
      toast.error('Failed to save resume')
    } finally {
      setIsSavingResume(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    const trimmedName = displayName.trim()

    // Allow saving empty string to clear display name if it previously existed
    // But require non-empty name if setting for the first time
    if (trimmedName === '' && user.displayName && user.displayName.trim() !== '') {
      // Allow clearing existing display name
    } else if (trimmedName === '' && !user.displayName) {
      toast.info('Please enter a display name')
      return
    }

    setIsUpdating(true)
    try {
      await updateProfile(user, {
        displayName: trimmedName,
      })
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to update profile: ${message} `)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user) return

    setIsResendingVerification(true)
    try {
      await sendEmailVerification(user)
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to send verification email: ${message} `)
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return

    setIsResettingPassword(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast.success('Password reset email sent! Please check your inbox.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to send password reset email: ${message} `)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    setIsDeletingAccount(true)
    try {
      // Note: In a production app, you might want to:
      // 1. Delete user data from Firestore
      // 2. Call a cloud function to handle cleanup
      // 3. Require re-authentication before deletion
      await deleteUser(user)
      toast.success('Account deleted successfully.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to delete account: ${message} `)
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-6">
      <header className="page-header mb-8">
        <h1 className="heading-xl">Profile</h1>
        <p className="text-text-secondary font-medium">
          Manage your professional identity and account settings
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <div className="premium-card text-center p-8">
            <div
              className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg ring-4 ring-primary-500/10"
              style={{ background: 'var(--primary-500)' }}
            >
              {getInitials(user.displayName) || user.email?.[0].toUpperCase() || '?'}
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-1">
              {user.displayName || 'User'}
            </h3>
            <p className="text-text-secondary text-sm font-medium mb-4 break-all">{user.email}</p>

            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${user.emailVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'} `}
              />
              <span>{user.emailVerified ? 'Verified' : 'Unverified'}</span>
            </div>

            <div className="mt-8 pt-6 border-t border-border-subtle">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wide">
                Member Since
              </div>
              <div className="text-sm font-bold text-text-primary mt-1">
                {user.metadata.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="premium-card p-8">
            <div className="mb-6 pb-4 border-b border-border-subtle">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Icon name="person" size={20} className="text-primary-500" />
                Personal Information
              </h3>
            </div>

            {/* Profile Information Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="form-group">
                <label
                  htmlFor="displayName"
                  className="text-sm font-bold text-text-primary mb-2 block"
                >
                  Display Name
                </label>
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input flex-1"
                      placeholder="Your full name"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="btn-primary px-6 py-2 text-xs"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false)
                          setDisplayName(user.displayName || '')
                        }}
                        className="btn-secondary px-6 py-2 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-bg-subtle/50 rounded-lg border border-border-subtle group hover:border-primary-500/50 transition-colors">
                    <span className="text-text-primary font-medium">
                      {user.displayName || 'Not specified'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wide px-2"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="text-sm font-bold text-text-primary mb-2 block">
                  Email Address
                </label>
                <div className="flex items-center gap-3 p-4 bg-bg-subtle/30 rounded-lg border border-border-subtle text-text-secondary">
                  <Icon name="mail" size={18} className="text-text-muted" />
                  <span className="font-medium">{user.email}</span>
                  <Icon name="lock" size={14} className="ml-auto text-text-muted opacity-50" />
                </div>
              </div>
            </form>
          </div>

          {/* Default Resume Card */}
          <div className="premium-card p-8">
            <div className="mb-6 pb-4 border-b border-border-subtle">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Icon name="description" size={20} className="text-primary-500" />
                Default Resume
              </h3>
            </div>

            <div className="space-y-6">
              <p className="text-text-secondary text-sm">
                Upload your primary resume. This content will be automatically used to populate new
                applications.
              </p>

              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-border-subtle rounded-xl group-hover:border-primary-500/50 group-hover:bg-primary-500/5 transition-all bg-bg-subtle/20">
                    <Icon
                      name="upload_file"
                      size={24}
                      className="text-text-muted group-hover:text-primary-500 transition-colors"
                    />
                    <span className="text-sm font-bold text-text-muted group-hover:text-primary-600 transition-colors">
                      {isProcessingResume ? 'Processing PDF...' : 'Click to Upload Resume (PDF)'}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-sm font-bold text-text-primary mb-2 block">
                    Extracted Content
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="input min-h-[200px] font-mono text-xs bg-bg-subtle/50"
                    placeholder="Resume content will appear here..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveResume}
                    disabled={isSavingResume || isProcessingResume}
                    className="btn-primary px-8 py-2.5 text-xs"
                  >
                    {isSavingResume ? 'Saving...' : 'Save Resume'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions Card */}
          <div className="premium-card p-8 border-l-4 border-l-red-500/20">
            <div className="mb-6 pb-4 border-b border-border-subtle">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Icon name="security" size={20} className="text-text-secondary" />
                Security & Account
              </h3>
            </div>

            <div className="space-y-6">
              {!user.emailVerified && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl p-6 flex gap-4 items-start">
                  <Icon
                    name="warning"
                    size={20}
                    className="text-orange-600 dark:text-orange-400 mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-orange-800 dark:text-orange-200 mb-1">
                      Verify your email
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mb-3 leading-relaxed">
                      Please verify your email address to secure your account.
                    </p>
                    <button
                      onClick={handleResendVerification}
                      disabled={isResendingVerification}
                      className="text-xs font-bold bg-white dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-all"
                    >
                      {isResendingVerification ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="p-6 bg-bg-subtle hover:bg-bg-subtle/80 rounded-xl border border-border-subtle flex flex-col items-center gap-3 transition-colors group"
                >
                  <Icon
                    name="lock"
                    size={20}
                    className="text-text-muted group-hover:text-primary-500 transition-colors"
                  />
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wide group-hover:text-primary-600">
                    Reset Password
                  </span>
                </button>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-6 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col items-center gap-3 transition-colors group"
                  >
                    <Icon
                      name="delete"
                      size={20}
                      className="text-red-400 group-hover:text-red-500 transition-colors"
                    />
                    <span className="text-xs font-bold text-red-600/70 group-hover:text-red-600 uppercase tracking-wide">
                      Delete Account
                    </span>
                  </button>
                ) : (
                  <div className="col-span-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 animate-fade-in">
                    <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">
                      Are you sure?
                    </h4>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium mb-4 leading-relaxed max-w-md">
                      This will permanently delete your account and all application data. This
                      action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide shadow-sm"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="bg-white dark:bg-transparent border border-gray-200 dark:border-red-800 text-text-secondary px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
