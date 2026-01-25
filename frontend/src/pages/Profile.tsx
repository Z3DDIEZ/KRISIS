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
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-xl">
        <h1 className="text-3xl font-bold text-primary">Profile</h1>
        <p className="text-secondary text-base mt-sm">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="card-body">
              <div
                className="w-24 h-24 mx-auto rounded-xl flex items-center justify-center text-white font-bold text-3xl mb-lg"
                style={{ background: 'var(--primary-orange)' }}
              >
                {getInitials(user.displayName) || user.email?.[0].toUpperCase() || '?'}
              </div>
              <h3 className="text-xl font-semibold text-primary mb-sm">
                {user.displayName || 'No display name set'}
              </h3>
              <p className="text-secondary text-sm mb-md">{user.email}</p>
              <div className="text-xs text-muted">
                Member since {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings Card */}
        <div className="lg:col-span-2">
          <div className="card">

            {/* Profile Information Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-lg">
              <div>
                <label htmlFor="displayName" className="input-label">
                  Display Name
                </label>
                {isEditing ? (
                  <div className="flex gap-sm">
                    <input
                      type="text"
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Enter your display name"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="btn btn-primary"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setDisplayName(user.displayName || '')
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-primary">{user.displayName || 'No display name set'}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">
                  Email Address
                </label>
                <div className="text-primary font-medium">{user.email}</div>
                <p className="input-hint">
                  Email cannot be changed. Contact support if you need to update your email address.
                </p>
              </div>

              <div>
                <label className="input-label">
                  Account Status
                </label>
                <div className="flex items-center gap-sm">
                  <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.1)', color: 'var(--status-offer)' }}>
                    Active
                  </span>
                  <span className="text-sm text-secondary">
                    {user.emailVerified ? 'Email verified' : 'Email not verified'}
                  </span>
                </div>
              </div>
            </form>

            {/* Account Actions */}
            <div className="card-footer border-t border-border-light">
              <h3 className="text-lg font-semibold text-primary mb-md">Account Actions</h3>
              <div className="space-y-md">
                {!user.emailVerified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-lg">
                    <div className="flex gap-md">
                      <div className="flex-shrink-0">
                        <Icon name="warning" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-yellow-800 mb-sm">
                          Email Not Verified
                        </h4>
                        <p className="text-sm text-yellow-700 mb-md">
                          Please check your email and click the verification link to secure your account.
                        </p>
                        <button
                          onClick={handleResendVerification}
                          disabled={isResendingVerification}
                          className="btn"
                          style={{
                            background: 'var(--primary-orange)',
                            color: 'white'
                          }}
                        >
                          {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="btn btn-secondary btn-block justify-start"
                >
                  🔑 {isResettingPassword ? 'Sending...' : 'Change Password'}
                </button>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn btn-ghost btn-block justify-start text-danger hover:bg-red-50"
                  >
                    🗑️ Delete Account
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-lg">
                    <div className="flex gap-md">
                      <div className="flex-shrink-0">
                        <Icon name="warning" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-800 mb-sm">
                          Delete Account
                        </h4>
                        <p className="text-sm text-red-700 mb-md">
                          This action cannot be undone. This will permanently delete your account and all associated data.
                        </p>
                        <div className="flex gap-sm">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                            className="btn"
                            style={{
                              background: 'var(--status-rejected)',
                              color: 'white'
                            }}
                          >
                            {isDeletingAccount ? 'Deleting...' : 'Yes, delete my account'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
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