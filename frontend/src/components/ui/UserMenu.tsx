import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../../lib/firebase'
import { toast } from 'sonner'
import Icon from './Icon'

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

/**
 * UserMenu - Profile dropdown for authenticated users.
 * @returns The user menu button and dropdown panel.
 */
function UserMenu() {
  const [user] = useAuthState(auth)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success('Signed out successfully')
      navigate('/auth')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  if (!user) return null

  const initials = getInitials(user.displayName) || user.email?.[0].toUpperCase() || '?'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[42px] h-[42px] flex items-center justify-center rounded-xl font-semibold text-sm bg-primary-600 text-white shadow-md shadow-primary-500/20 hover:scale-105 transition-all duration-200"
        aria-label="User menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-bg-surface border border-border rounded-2xl shadow-2xl z-50 animate-fade-in divide-y divide-border overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-semibold text-xl bg-bg-subtle text-primary-600 border border-border shadow-inner">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">
                  {user.displayName || 'Anonymous User'}
                </p>
                <p className="text-xs font-medium text-text-muted truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-text-secondary hover:bg-bg-subtle hover:text-primary-600 rounded-xl transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="person" size={16} />
              View Profile
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-text-secondary hover:bg-bg-subtle hover:text-primary-600 rounded-xl transition-all"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="settings" size={16} />
              Settings
            </Link>
          </div>

          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
            >
              <Icon name="logout" size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
