import { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { updateProfile, sendEmailVerification, sendPasswordResetEmail, deleteUser } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { toast } from 'sonner'
import Icon from '../components/ui/Icon'

function getInitials(displayName: string | null): string {
  if (!displayName || displayName.trim() === '') {
    return ''
  }

  // Remove parenthetical parts (like "(LORDZEDDATHON)")
  const cleanName = displayName.replace(/\([^)]*\)/g, '').trim()

  const nameParts = cleanName.split(' ').filter(part => part.length > 0 && !part.startsWith('(') && !part.endsWith(')'))
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
        displayName: trimmedName
      })
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`)
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
    } catch (error: any) {
      toast.error(`Failed to send verification email: ${error.message}`)
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
    } catch (error: any) {
      toast.error(`Failed to send password reset email: ${error.message}`)
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
    } catch (error: any) {
      toast.error(`Failed to delete account: ${error.message}`)
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Profile</h1>
        <p className="text-secondary font-medium mt-1">Manage your professional identity and account security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <div className="card text-center border border-border-light hover:shadow-xl transition-all">
            <div className="card-body p-xl">
              <div
                className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-lg shadow-primary-orange/20"
                style={{ background: 'linear-gradient(135deg, var(--primary-orange), var(--primary-orange-light))' }}
              >
                {getInitials(user.displayName) || user.email?.[0].toUpperCase() || '?'}
              </div>
              <h3 className="text-xl font-bold text-primary mb-1">
                {user.displayName || 'Anonymous User'}
              </h3>
              <p className="text-secondary text-sm font-medium mb-6 break-all">{user.email}</p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-full border border-border-light">
                <div className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-status-success' : 'bg-status-warning animation-pulse'}`} />
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                  {user.emailVerified ? 'Verified Account' : 'Pending Verification'}
                </span>
              </div>

              <div className="mt-8 pt-6 border-t border-border-light/50">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Member Since</div>
                <div className="text-sm font-bold text-primary mt-1">
                  {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings Card */}
        <div className="lg:col-span-2 space-y-xl">
          <div className="card border border-border-light">
            <div className="card-header border-b border-border-light">
              <h3 className="card-title flex items-center gap-2">
                <Icon name="person" size={18} />
                Personal Information
              </h3>
            </div>
            <div className="card-body p-xl">
              {/* Profile Information Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-xl">
                <div className="form-group">
                  <label htmlFor="displayName" className="form-label">
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
                          className="btn btn-orange flex-1 sm:flex-none px-6"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false)
                            setDisplayName(user.displayName || '')
                          }}
                          className="btn btn--secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border-light border-dashed">
                      <span className="text-primary font-bold">{user.displayName || 'Not specified'}</span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="btn btn--ghost btn--sm text-primary-orange font-bold uppercase tracking-tighter"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border-light">
                    <Icon name="mail" size={16} className="text-muted" />
                    <span className="text-primary font-medium">{user.email}</span>
                    <span className="ml-auto">
                      <Icon name="lock" size={14} className="text-muted" />
                    </span>
                  </div>
                  <p className="text-[10px] text-muted font-medium mt-2 flex items-center gap-1">
                    <Icon name="info" size={12} />
                    Primary email cannot be changed for security
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Account Actions Card */}
          <div className="card border border-border-light overflow-hidden">
            <div className="card-header border-b border-border-light">
              <h3 className="card-title flex items-center gap-2">
                <Icon name="security" size={18} />
                Security & account
              </h3>
            </div>
            <div className="card-body p-xl space-y-md">
              {!user.emailVerified && (
                <div className="bg-primary-orange-bg border border-primary-orange/10 rounded-2xl p-lg flex gap-md">
                  <div className="p-2 bg-primary-orange/10 rounded-xl text-primary-orange h-fit">
                    <Icon name="warning" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-primary mb-1">Email Verification</h4>
                    <p className="text-xs text-secondary font-medium leading-relaxed mb-4">
                      Please verify your email to unlock all features and secure your account.
                    </p>
                    <button
                      onClick={handleResendVerification}
                      disabled={isResendingVerification}
                      className="btn btn-orange btn--sm"
                    >
                      {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="btn btn--secondary h-auto py-4 flex flex-col items-center gap-2 border border-border-light hover:border-primary-orange/30 group"
                >
                  <div className="p-3 bg-surface-3 rounded-xl text-secondary group-hover:text-primary-orange transition-colors">
                    <Icon name="lock" size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Change Password</span>
                </button>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn btn--secondary h-auto py-4 flex flex-col items-center gap-2 border border-border-light hover:border-red-200 group"
                  >
                    <div className="p-3 bg-red-50 rounded-xl text-red-400 group-hover:text-red-600 transition-colors">
                      <Icon name="delete" size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-500">Delete Account</span>
                  </button>
                ) : (
                  <div className="col-span-full bg-red-50 border border-red-100 rounded-2xl p-lg animate-fade-in">
                    <h4 className="text-sm font-bold text-red-800 mb-1">Are you absolutely sure?</h4>
                    <p className="text-xs text-red-600 font-medium mb-4 leading-relaxed">
                      This will permanently delete your profile and all application data.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="btn bg-red-600 text-white hover:bg-red-700 btn--sm"
                      >
                        {isDeletingAccount ? 'Processing...' : 'Delete Permanently'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn btn--secondary btn--sm bg-white"
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